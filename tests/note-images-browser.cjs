'use strict';
// Synthetic notes in a disposable browser; no real Launchpad data is read or changed.
const {chromium}=require('C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.WORKBOARD_TEST_URL||'http://127.0.0.1:43175';
if(!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base))throw Error('Local preview only.');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext({viewport:{width:1000,height:850},serviceWorkers:'block'}),page=await context.newPage(),remote=[];
    await page.route('**/*',route=>{if(new URL(route.request().url()).origin!==base){remote.push(route.request().url());return route.abort();}if(route.request().url()===base+'/__note_images_test')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="img-src \'self\' data:"></head><body><main></main></body></html>'});return route.continue();});
    await page.goto(base+'/__note_images_test');
    await page.evaluate(async()=>{
      window.noteModule=await import('/morning-launchpad/assets/note-editor.mjs');
      window.imagesModule=await import('/morning-launchpad/assets/note-images.mjs');
      const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=1200;const ctx=canvas.getContext('2d');ctx.fillStyle='#abcdef';ctx.fillRect(0,0,canvas.width,canvas.height);window.samplePng=canvas.toDataURL('image/png');
      window.savedDrafts=[];window.inputCount=0;
      window.mountNote=(data={noteText:'Keep this existing text.'},disabled=false,saveWorks=true)=>{
        window.savedDrafts=[];window.inputCount=0;
        const editor=window.noteModule.createNoteEditor({title:'Synthetic test',...data},{disabled,save:draft=>{window.savedDrafts.push(draft);return saveWorks;}});
        editor.addEventListener('input',event=>{if(event.target.matches('.rich-note-editor'))window.inputCount++;});document.querySelector('main').replaceChildren(editor);return editor;
      };
      window.mountNote();
    });
    const sample=await page.evaluate(()=>window.samplePng),file={name:'Synthetic photo.png',mimeType:'image/png',buffer:Buffer.from(sample.split(',')[1],'base64')};
    const sanitised=await page.evaluate(()=>{
      const source=`<p>Text <strong>bold</strong> <a href="https://example.test/document">link</a></p><img src="${window.samplePng}" onerror="alert(1)" style="position:fixed"><img src="https://example.test/tracker.png"><img src="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="><script>alert(1)</script>`;
      const clean=window.noteModule.cleanNoteHtml(source),template=document.createElement('template');template.innerHTML=clean;
      return {clean,count:template.content.querySelectorAll('img').length,valid:window.imagesModule.isSafeNoteImage(window.samplePng),invalid:window.imagesModule.isSafeNoteImage('data:image/png;base64,PHNjcmlwdD4=')};
    });
    assert.equal(sanitised.count,1);assert.equal(sanitised.valid,true);assert.equal(sanitised.invalid,false);assert.doesNotMatch(sanitised.clean,/onerror|style=|tracker|svg|<script/);assert.match(sanitised.clean,/<strong>bold<\/strong>/);
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Add image',exact:true}).click();await(await chooser).setFiles(file);
    await page.waitForFunction(()=>window.savedDrafts.at(-1)?.noteHtml.includes('<img'));
    const first=await page.evaluate(()=>({draft:window.savedDrafts.at(-1),bubbled:window.inputCount,pending:document.querySelector('section').dataset.noteUnsaved,width:document.querySelector('.rich-note-editor img').naturalWidth}));
    assert.match(first.draft.noteText,/Keep this existing text/);assert.equal(first.bubbled,1);assert.equal(first.pending,'false');assert.ok(first.width<=1600);assert.ok(first.draft.noteHtml.length<180500);
    await page.evaluate(draft=>window.mountNote(draft),first.draft);assert.equal(await page.locator('.rich-note-editor img').count(),1);
    await page.evaluate(()=>{
      const editor=document.querySelector('.rich-note-editor');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);
      const data=new DataTransfer();data.setData('text/html',`<p>More details <a href="https://example.test/kept">kept link</a></p><img src="${samplePng}">`);editor.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
    });
    await page.waitForFunction(()=>document.querySelectorAll('.rich-note-editor img').length===2&&document.querySelector('section').dataset.noteUnsaved==='false');
    assert.match(await page.locator('.rich-note-editor').innerText(),/More details kept link/);assert.equal(await page.locator('.rich-note-editor a').getAttribute('href'),'https://example.test/kept');
    const beforeInvalid=await page.locator('.rich-note-editor').innerHTML();
    await page.locator('input[type=file]').setInputFiles({name:'not-an-image.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg></svg>')});
    await page.getByRole('status').filter({hasText:'Choose a JPG'}).waitFor();assert.equal(await page.locator('.rich-note-editor').innerHTML(),beforeInvalid);
    // Slow image decoding leaves subsequent typing intact and the note draft protected.
    await page.evaluate(()=>{
      const NativeImage=window.Image,descriptor=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
      window.Image=function(){const image=new NativeImage();Object.defineProperty(image,'src',{set(value){setTimeout(()=>descriptor.set.call(image,value),150);},get(){return descriptor.get.call(image);}});return image;};
      const editor=document.querySelector('.rich-note-editor'),data=new DataTransfer();const bytes=atob(samplePng.split(',')[1]);data.items.add(new File([Uint8Array.from(bytes,x=>x.charCodeAt(0))],'Pasted image.png',{type:'image/png'}));
      editor.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
      window.pendingWasProtected=document.querySelector('section').dataset.noteUnsaved==='true';
      editor.append(document.createTextNode(' Typed while the image loads.'));editor.dispatchEvent(new Event('input',{bubbles:true}));
    });
    await page.waitForFunction(()=>document.querySelectorAll('.rich-note-editor img').length===3&&document.querySelector('section').dataset.noteUnsaved==='false');
    assert.equal(await page.evaluate(()=>window.pendingWasProtected),true);assert.match(await page.locator('.rich-note-editor').innerText(),/Typed while the image loads/);assert.match(await page.evaluate(()=>savedDrafts.at(-1).noteText),/Typed while the image loads/);
    // Image-only notes remain meaningful saved notes and can be reopened unchanged.
    await page.evaluate(()=>window.mountNote({noteText:''}));await page.locator('input[type=file]').setInputFiles(file);
    await page.waitForFunction(()=>savedDrafts.at(-1)?.noteHtml.includes('<img')&&document.querySelector('section').dataset.noteUnsaved==='false');
    const imageOnly=await page.evaluate(()=>savedDrafts.at(-1));assert.equal(imageOnly.noteText.trim(),'');
    await page.evaluate(draft=>window.mountNote(draft),imageOnly);assert.equal(await page.locator('.rich-note-editor img').count(),1);
    // Selecting an image and pressing Backspace removes it and autosaves the removal.
    await page.evaluate(()=>{const editor=document.querySelector('.rich-note-editor');editor.focus();const range=document.createRange();range.selectNode(editor.querySelector('img'));getSelection().removeAllRanges();getSelection().addRange(range);});
    await page.keyboard.press('Backspace');await page.waitForFunction(()=>savedDrafts.length>0&&!savedDrafts.at(-1).noteHtml.includes('<img'));
    // Failed storage keeps the image visible as an explicitly unsaved draft.
    await page.evaluate(()=>window.mountNote({noteText:'Previous text'},false,false));await page.locator('input[type=file]').setInputFiles(file);
    await page.getByRole('status').filter({hasText:'Not saved'}).waitFor();
    assert.equal(await page.locator('.rich-note-editor img').count(),1);assert.match(await page.locator('.rich-note-editor').innerText(),/Previous text/);assert.equal(await page.locator('section').getAttribute('data-note-unsaved'),'true');
    // An over-budget addition is rejected before changing any existing text or images.
    const fullBefore=await page.evaluate(()=>{
      const editor=window.mountNote({noteText:'Keep full note'}).querySelector('.rich-note-editor');
      const image=document.createElement('img');image.src=samplePng;image.alt='Existing image';image.className='note-inline-image';editor.append(image);
      // Empty link formatting keeps text short while filling the documented HTML budget.
      const anchor=document.createElement('a');anchor.href='https://example.test/'+'x'.repeat(1800);anchor.target='_blank';anchor.rel='noopener noreferrer';
      let html=editor.innerHTML;while(html.length+anchor.outerHTML.length<999950)html+=anchor.outerHTML;
      const remainder=999950-html.length;if(remainder>100){anchor.href='https://example.test/'+'y'.repeat(remainder-100);html+=anchor.outerHTML;}
      editor.innerHTML=html;return editor.innerHTML;
    });
    await page.locator('input[type=file]').setInputFiles(file);await page.getByRole('status').filter({hasText:'This note is full'}).waitFor();assert.equal(await page.locator('.rich-note-editor').innerHTML(),fullBefore);assert.equal(await page.evaluate(()=>savedDrafts.length),0);
    // A note closed while decoding finishes never writes into a replacement note.
    await page.evaluate(()=>{
      window.detached=window.mountNote({noteText:'Closed note'});
      const editor=document.querySelector('.rich-note-editor'),data=new DataTransfer(),bytes=atob(samplePng.split(',')[1]);data.items.add(new File([Uint8Array.from(bytes,x=>x.charCodeAt(0))],'Pasted image.png',{type:'image/png'}));
      editor.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));window.mountNote({noteText:'Replacement note'});
    });
    await page.waitForFunction(()=>window.detached.dataset.noteUnsaved==='false');assert.equal(await page.locator('.rich-note-editor').innerText(),'Replacement note');assert.equal(await page.locator('.rich-note-editor img').count(),0);assert.equal(await page.evaluate(()=>savedDrafts.length),0);
    await page.evaluate(()=>window.mountNote({noteText:'Read only'},true));assert.equal(await page.getByRole('button',{name:'Add image',exact:true}).isDisabled(),true);
    assert.deepEqual(remote,[]);
    console.log('PASS note images: file picker, compression, both clipboard forms, sanitising, restore, image-only save, Backspace removal, async typing, failed storage drafts, combined size rejection, detached editors and read-only controls.');
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
