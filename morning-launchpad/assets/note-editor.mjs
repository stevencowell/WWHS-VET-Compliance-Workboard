import {safeUrl} from './summary-core.mjs?v=plain-language-1';

// Build a fresh allowlisted tree; pasted markup never enters the live editor directly.
export function cleanNoteHtml(html){
  const template=document.createElement('template');template.innerHTML=html;
  const output=document.createElement('div');
  const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','UL','OL','LI','BLOCKQUOTE','H1','H2','H3','H4','PRE','CODE','A']);
  const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','MATH','FORM','INPUT','BUTTON','TEXTAREA','IMG','VIDEO','AUDIO','TEMPLATE']);
  function copy(node,parent){
    if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
    if(node.nodeType!==1||blocked.has(node.tagName))return;
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
  editor.dataset.placeholder='Paste a draft email, add information or document links…';
  editor.innerHTML=item.noteHtml?cleanNoteHtml(item.noteHtml):plainNoteHtml(item.noteText||'');
  const status=document.createElement('p');status.className='import-help';status.setAttribute('role','status');
  const toolbar=document.createElement('div');toolbar.className='note-formatting';toolbar.setAttribute('aria-label','Note formatting');
  let timer,dirty=false;
  function reportDraft(){section.dataset.noteUnsaved=String(dirty);window.dispatchEvent(new Event('launchpad:note-draft'));}
  function persist(){clearTimeout(timer);if(!dirty)return;const text=editor.innerText;const html=cleanNoteHtml(editor.innerHTML);if(text.length>200000||html.length>1000000){status.textContent='Not saved: shorten this note to 200,000 characters.';reportDraft();return;}if(save({noteText:text,noteHtml:html})){dirty=false;status.textContent='Saved';}else status.textContent='Not saved — see the message above.';reportDraft();}
  function changed(){dirty=true;reportDraft();status.textContent='Saving…';clearTimeout(timer);timer=setTimeout(persist,500);}
  for(const [label,command]of [['Bold','bold'],['Italic','italic'],['Bullet list','insertUnorderedList']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=disabled;button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{editor.focus();document.execCommand(command,false);changed();});toolbar.append(button);}
  editor.addEventListener('input',changed);
  editor.addEventListener('blur',()=>{if(disabled)return;const before=editor.innerHTML;{const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())if(!walker.currentNode.parentElement.closest('a'))nodes.push(walker.currentNode);for(const node of nodes){if(!/https:\/\//.test(node.textContent))continue;const template=document.createElement('template');template.innerHTML=plainNoteHtml(node.textContent);node.replaceWith(template.content);}if(editor.innerHTML!==before)dirty=true;persist();}});
  editor.addEventListener('paste',event=>{event.preventDefault();const data=event.clipboardData;if(!data)return;const html=data.getData('text/html');const safe=html?cleanNoteHtml(html):plainNoteHtml(data.getData('text/plain'));document.execCommand('insertHTML',false,safe);changed();});
  editor.addEventListener('drop',event=>{event.preventDefault();status.textContent='Paste text or a document link here; file attachments are not uploaded.';});
  editor.addEventListener('click',event=>{const link=event.target.closest('a');if(link&&safeUrl(link.getAttribute('href'))){event.preventDefault();window.open(link.href,'_blank','noopener,noreferrer');}});
  const help=document.createElement('p');help.className='import-help';help.textContent='Saves automatically in this browser. Click a link to open it. File attachments are not uploaded.';
  section.append(heading,toolbar,editor,status,help);return section;
}
