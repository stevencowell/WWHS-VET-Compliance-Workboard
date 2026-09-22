import {suggestEmail} from './email-rules.mjs?v=edit-card-text-1';
import {PRIORITIES,safeUrl,EDITABLE} from './summary-core.mjs?v=edit-card-text-1';
import {plainNoteHtml} from './note-editor.mjs?v=edit-card-text-1';
import {NOTE_HTML_LIMIT,prepareNoteImages,clipboardImageFiles,noteImageHtml} from './note-images.mjs?v=email-note-images-1';
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
class EmailCapture extends HTMLElement{
 connectedCallback(){if(this.built)return;this.built=true;this.panel=el('details',undefined,{class:'import-input email-panel'});this.panel.append(el('summary','Paste one email'),el('p','Paste the subject and message. Check the suggested action and priority before saving. This uses simple rules, not AI. Your email stays in this browser; attachments stay in your email app.',{class:'import-help'}));this.append(this.panel);this.inputs={};
 for(const[key,label,type,max]of [['subject','Email subject (optional)','input',300],['instruction','What I need to do (optional)','input',2000],['originalEmailUrl','Original email link (optional)','input',2048],['source','Email text','textarea',null]]){const wrap=el('label',label);const input=el(type,undefined,{'aria-label':label,...(max?{maxlength:String(max)}:{}),...(type==='textarea'?{rows:'7',placeholder:'Paste the full email chain here with Ctrl + V.'}:{type:key==='originalEmailUrl'?'url':'text',...(key==='originalEmailUrl'?{placeholder:'Paste the link to this email in Outlook'}:{})})});wrap.append(input);this.inputs[key]=input;this.panel.append(wrap);input.addEventListener('input',()=>{this.review.hidden=true;this.suggestion=null;});}
 this.images=[];this.imageBusy=false;this.saving=false;
 const imageActions=el('div',undefined,{class:'email-image-actions'});
 this.imageInput=el('input',undefined,{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',multiple:'',hidden:'','aria-label':'Images for this email'});
 this.addImageButton=el('button','Add image',{type:'button'});this.addImageButton.addEventListener('click',()=>this.imageInput.click());
 this.imageInput.addEventListener('change',()=>{void this.addImages(this.imageInput.files);this.imageInput.value='';});
 imageActions.append(this.addImageButton,this.imageInput);this.imageList=el('div',undefined,{class:'email-image-list','aria-label':'Images added to this email'});
 this.panel.append(imageActions,el('p','The email text and any images you add will appear in the task’s Note when you save. Paste a screenshot here or use Add image.',{class:'import-help'}),this.imageList);
 this.panel.append(el('p','For other attachments, paste a link to the original email. Attachments and linked email images stay in Outlook.',{class:'import-help'}));
 this.pastedLinks=[];this.inputs.source.addEventListener('paste',event=>{const plain=event.clipboardData?.getData('text/plain')||'',html=event.clipboardData?.getData('text/html')||'';this.pastedText=plain;const template=document.createElement('template');template.innerHTML=html;this.pastedLinks=[...template.content.querySelectorAll('a[href]')].map(a=>safeUrl(a.getAttribute('href'))).filter(Boolean);const files=clipboardImageFiles(event.clipboardData);if(files.length){if(!plain)event.preventDefault();void this.addImages(files);}});
 this.message=el('p','',{role:'status','aria-live':'polite',class:'import-help'});this.panel.append(this.message);
 const suggest=el('button','Suggest action and priority',{type:'button',class:'import-primary'});suggest.addEventListener('click',()=>this.suggest());this.panel.append(suggest);
 this.review=el('form',undefined,{class:'email-review',hidden:''});this.review.append(el('h3','Review before saving'));this.reason=el('p','',{class:'import-help'});this.review.append(this.reason);this.fields={};
 const definitions=[['title','Task title','text'],['action','Next action','textarea'],['group','Category',{ready:'Action needed',waiting:'Waiting on someone',later:'Keep for later'}],['priority','Priority',PRIORITIES],['dueDate','Deadline (optional)','date'],['eventDate','Event date (optional)','date'],['followUpDate','Follow-up date (optional)','date']];
 for(const[key,label,type]of definitions){const wrap=el('label',label);const n=el(typeof type==='object'?'select':type==='textarea'?'textarea':'input',undefined,{'aria-label':label,...typeof type==='object'?{}:type==='textarea'?{rows:'3',maxlength:'800'}:{type,maxlength:'300'}});if(typeof type==='object')for(const[value,text]of Object.entries(type))n.append(el('option',text,{value}));if(['title','action'].includes(key))n.required=true;wrap.append(n);this.fields[key]=n;this.review.append(wrap);}
 this.dateNote=el('p','',{class:'import-help'});this.review.append(this.dateNote);this.submit=el('button','Save to Launchpad',{type:'submit',class:'import-primary'});this.review.append(this.submit);this.review.addEventListener('submit',e=>{e.preventDefault();this.save();});this.panel.append(this.review);
 }
 open(){this.panel.open=true;this.inputs.source.focus();this.panel.scrollIntoView({behavior:'smooth',block:'center'});}
 updateImageState(){
  this.addImageButton.disabled=this.imageBusy||this.saving;
  this.submit.disabled=this.imageBusy||this.saving;
  this.dataset.noteUnsaved=String(this.imageBusy||this.images.length>0);
  window.dispatchEvent(new Event('launchpad:note-draft'));
 }
 renderImages(){
  this.imageList.replaceChildren();
  this.images.forEach((image,index)=>{const card=el('figure'),preview=el('img',undefined,{src:image.src,alt:image.alt});const remove=el('button','Remove',{type:'button','aria-label':`Remove image ${index+1}`});remove.disabled=this.saving;remove.addEventListener('click',()=>{this.images.splice(index,1);this.renderImages();this.updateImageState();});card.append(preview,remove);this.imageList.append(card);});
 }
 async addImages(files){
  if(this.imageBusy||this.saving){this.message.textContent='Please wait for the current image or save to finish, then add this image again.';return;}
  this.imageBusy=true;this.updateImageState();this.message.textContent='Adding image…';
  try{
   const added=await prepareNoteImages(files),images=[...this.images,...added];
   const html=plainNoteHtml(this.inputs.source.value)+images.map(image=>`<p>${noteImageHtml(image)}</p>`).join('');
   if(html.length>NOTE_HTML_LIMIT)throw new Error('These images will not fit in one note. Add fewer images or a link to the original.');
   this.images=images;this.renderImages();this.message.textContent=added.length?'Image added. It will be saved with the email in Note.':'';
  }catch(error){this.message.textContent=error.message;}
  finally{this.imageBusy=false;this.updateImageState();}
 }
 suggest(){try{this.message.textContent='';const emailUrl=this.inputs.originalEmailUrl.value.trim();if(emailUrl&&!safeUrl(emailUrl))throw new Error('Use a full https:// link for the original email.');this.suggestion=suggestEmail(this.inputs.source.value,{subject:this.inputs.subject.value,instruction:this.inputs.instruction.value});this.suggestion.originalEmailUrl=emailUrl;if(this.pastedText&&this.inputs.source.value.includes(this.pastedText))this.suggestion.links=[...new Set([...this.suggestion.links,...this.pastedLinks])].slice(0,30);for(const[k,input]of Object.entries(this.fields))input.value=this.suggestion[k]||'';this.reason.textContent=this.suggestion.reason;this.dateNote.textContent=this.suggestion.dateNote;this.review.hidden=false;this.fields.action.focus();}catch(e){this.message.textContent=e.message;}}
 async save(){if(!this.suggestion||this.imageBusy||this.saving)return;const suggestion=this.suggestion;this.saving=true;this.updateImageState();this.renderImages();try{const values=Object.fromEntries(Object.entries(this.fields).map(([k,n])=>[k,n.value.trim()]));for(const k of ['dueDate','eventDate','followUpDate'])values[k]||=null;const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(suggestion.source));if(this.suggestion!==suggestion)return;const taskKey='email:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');const item={...suggestion,...values,id:crypto.randomUUID(),taskKey,dirty:[...Object.keys(values).filter(k=>EDITABLE.includes(k)),...(suggestion.originalEmailUrl?['originalEmailUrl']:[])],nextAction:values.group==='waiting'?'delay':values.dueDate||values.eventDate||values.followUpDate?'date':values.group==='later'?'delay':'do'};const detail={item,images:this.images,ok:false,error:''};this.dispatchEvent(new CustomEvent('email:save',{detail,bubbles:true}));if(!detail.ok)throw new Error(detail.error||'Could not save. Your email is still here. Check the message above.');this.panel.open=false;for(const n of Object.values(this.inputs))n.value='';this.review.hidden=true;this.suggestion=null;this.pastedLinks=[];this.pastedText='';this.images=[];}catch(e){this.message.textContent=e.message;}finally{this.saving=false;this.updateImageState();this.renderImages();}}
}
customElements.define('email-capture',EmailCapture);
