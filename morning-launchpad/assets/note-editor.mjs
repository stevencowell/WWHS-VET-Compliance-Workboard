import {safeUrl} from './summary-core.mjs?v=edit-card-text-1';
import {NOTE_HTML_LIMIT,NOTE_TEXT_LIMIT,isSafeNoteImage,prepareNoteImages,noteImageHtml,clipboardImageFiles} from './note-images.mjs?v=email-note-images-1';

// Build a fresh allowlisted tree; pasted markup never enters the live editor directly.
export function cleanNoteHtml(html){
  const template=document.createElement('template');template.innerHTML=html;
  const output=document.createElement('div');
  const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','PRE','CODE','A']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','VIDEO','AUDIO','TEMPLATE']);
  function copy(node,parent){
    if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
    if(node.nodeType!==1||blocked.has(node.tagName))return;
    if(node.tagName==='IMG'){
      const src=node.getAttribute('src');if(!isSafeNoteImage(src))return;
      const next=document.createElement('img');next.src=src;next.alt=(node.getAttribute('alt')||'Added image').slice(0,300);next.className='note-inline-image';parent.append(next);return;
    }
    if(!allowed.has(node.tagName)){for(const child of node.childNodes)copy(child,parent);return;}
    const tag=node.tagName==='A'&&!safeUrl(node.getAttribute('href'))?'SPAN':node.tagName.toLowerCase();
    const next=document.createElement(tag);
    if(tag==='a'){next.href=node.getAttribute('href');next.target='_blank';next.rel='noopener noreferrer';}
    for(const child of node.childNodes)copy(child,next);parent.append(next);
  }
  for(const node of template.content.childNodes)copy(node,output);
  return output.innerHTML;
}
export function plainNoteHtml(text){
  const out=document.createElement('div');
  const pattern=/\[([^\]\n]+)\]\s*\((https:\/\/[^\s]+?)\)|https:\/\/[^\s<>"\]]+/g;
  let end=0;
  for(const match of text.matchAll(pattern)){
    out.append(document.createTextNode(text.slice(end,match.index)));
    let url=match[2]||match[0],suffix='';
    if(!match[2]){while(/[.,;]$/.test(url)||(url.endsWith(')')&&(url.match(/\)/g)||[]).length>(url.match(/\(/g)||[]).length)){suffix=url.slice(-1)+suffix;url=url.slice(0,-1);}}
    if(safeUrl(url)){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=match[1]||url;out.append(a,document.createTextNode(suffix));}
    else out.append(document.createTextNode(match[0]));
    end=match.index+match[0].length;
  }
  out.append(document.createTextNode(text.slice(end)));return out.innerHTML;
}
export function createNoteEditor(item,{disabled,save}){
  const section=document.createElement('section');section.className='import-working-note';
  const heading=document.createElement('h3');heading.textContent='Note';
  const editor=document.createElement('div');editor.className='rich-note-editor';editor.contentEditable=String(!disabled);editor.setAttribute('role','textbox');editor.setAttribute('aria-multiline','true');editor.setAttribute('aria-label',`Note for ${item.title}`);
  editor.dataset.placeholder='Paste an email, image, information or document link…';
  editor.innerHTML=item.noteHtml?cleanNoteHtml(item.noteHtml):plainNoteHtml(item.noteText||'');
  const status=document.createElement('p');status.className='import-help';status.setAttribute('role','status');
  const toolbar=document.createElement('div');toolbar.className='note-formatting';toolbar.setAttribute('aria-label','Note formatting');
  let timer,dirty=false,pendingImages=0;
  function reportDraft(){section.dataset.noteUnsaved=String(dirty||pendingImages>0);window.dispatchEvent(new Event('launchpad:note-draft'));}
  function persist(){clearTimeout(timer);if(!dirty)return;const text=editor.innerText;const html=cleanNoteHtml(editor.innerHTML);if(text.length>NOTE_TEXT_LIMIT||html.length>NOTE_HTML_LIMIT){status.textContent='Not saved: this note is full. Shorten the text or remove an image.';reportDraft();return;}if(save({noteText:text,noteHtml:html})){dirty=false;status.textContent='Saved';}else status.textContent='Not saved — see the message above.';reportDraft();}
  function changed(){dirty=true;reportDraft();status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(persist,500);}
  for(const [label,command]of [['Bold','bold'],['Italic','italic'],['Bullet list','insertUnorderedList']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{editor.focus();document.execCommand(command,false);changed();});toolbar.append(button);}
  const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/png,image/jpeg,image/webp,image/gif';imageInput.multiple=true;imageInput.hidden=true;imageInput.disabled=disabled;imageInput.setAttribute('aria-label',`Add images to note for ${item.title}`);
  const imageButton=document.createElement('button');imageButton.type='button';imageButton.textContent='Add image';imageButton.disabled=disabled;
  imageButton.addEventListener('mousedown',event=>event.preventDefault());imageButton.addEventListener('click',()=>imageInput.click());toolbar.append(imageButton,imageInput);
  function insertionRange(){const selection=window.getSelection();if(selection?.rangeCount&&editor.contains(selection.getRangeAt(0).commonAncestorContainer)){const range=selection.getRangeAt(0).cloneRange();range.collapse(false);return range;}return null;}
  async function addImages(files,prefix=''){
    if(disabled||!files.length)return;
    const range=insertionRange();pendingImages++;imageButton.disabled=true;reportDraft();status.textContent='Adding image…';
    try{
      const images=await prepareNoteImages(files);if(!section.isConnected)return;
      const markup=prefix+images.map(image=>`<br>${noteImageHtml(image)}<br>`).join('');
      if(cleanNoteHtml(editor.innerHTML).length+markup.length>NOTE_HTML_LIMIT)throw new Error('This note is full. Remove an image or shorten the text before adding another.');
      const content=document.createElement('template');content.innerHTML=markup;
      if(editor.innerText.length+content.content.textContent.length>NOTE_TEXT_LIMIT)throw new Error('This note is full. Shorten the text before adding an image.');
      // Keep edits made during image processing. A stale selection never replaces text.
      if(range&&editor.contains(range.commonAncestorContainer))range.insertNode(content.content);else editor.append(content.content);
      editor.dispatchEvent(new Event('input',{bubbles:true}));persist();
    }catch(error){status.textContent=error.message||'The image could not be added. Your note has been kept.';}
    finally{pendingImages--;imageButton.disabled=disabled||pendingImages>0;imageInput.value='';reportDraft();}
  }
  imageInput.addEventListener('change',()=>{void addImages(Array.from(imageInput.files||[]));});
  editor.addEventListener('input',changed);
  editor.addEventListener('blur',()=>{if(disabled)return;const before=editor.innerHTML;{const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a'))nodes.push(walker.currentNode);for(const node of nodes){if(!/https:\/\//.test(node.textContent))continue;const template=document.createElement('template');template.innerHTML=plainNoteHtml(node.textContent);node.replaceWith(template.content);}if(editor.innerHTML!==before)dirty=true;persist();}});
  editor.addEventListener('paste',event=>{event.preventDefault();if(disabled)return;const data=event.clipboardData;if(!data)return;const html=data.getData('text/html'),images=clipboardImageFiles(data);let safe=html?cleanNoteHtml(html):plainNoteHtml(data.getData('text/plain'));if(images.length){const text=document.createElement('template');text.innerHTML=safe;for(const image of text.content.querySelectorAll('img'))image.remove();void addImages(images,text.innerHTML);return;}document.execCommand('insertHTML',false,safe);changed();});
  editor.addEventListener('drop',event=>{event.preventDefault();if(disabled)return;const files=Array.from(event.dataTransfer?.files||[]);if(files.length){void addImages(files);return;}status.textContent='Paste text, an image or a document link here.';});
  editor.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&safeUrl(link.getAttribute('href'))){event.preventDefault();window.open(link.href,'_blank','noopener,noreferrer');}});
  const help=document.createElement('p');help.className='import-help';help.textContent='Saves automatically in this browser. Paste an image or choose Add image. Images are saved as smaller still copies and included in your Launchpad backup. Click a link to open it.';
  section.append(heading,toolbar,editor,status,help);return section;
}
