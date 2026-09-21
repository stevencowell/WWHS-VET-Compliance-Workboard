export const NOTE_HTML_LIMIT=1000000;
export const NOTE_TEXT_LIMIT=200000;
const IMAGE_TYPES=new Set(['image/jpeg','image/png','image/webp','image/gif']);
const MAX_FILE_BYTES=20*1024*1024;
const MAX_IMAGE_CHARS=180000;

// Only embedded raster images are retained. Remote URLs and SVG markup are never loaded.
export function isSafeNoteImage(src){
  if(typeof src!=='string'||src.length>NOTE_HTML_LIMIT)return false;
  const match=/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);
  if(!match||match[2].length%4!==0)return false;
  let bytes;try{bytes=atob(match[2].slice(0,32));}catch{return false;}
  if(match[1]==='image/png')return bytes.startsWith('\x89PNG\r\n\x1a\n');
  if(match[1]==='image/jpeg')return bytes.startsWith('\xff\xd8\xff');
  if(match[1]==='image/gif')return /^GIF8[79]a/.test(bytes);
  return bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';
}
const escapeAttribute=value=>String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
export function noteImageHtml(image){
  if(!isSafeNoteImage(image?.src))throw new Error('Choose a JPG, PNG, WebP or GIF image.');
  return `<img src="${image.src}" alt="${escapeAttribute((image.alt||'Added image').slice(0,300))}" class="note-inline-image">`;
}
export function clipboardImageFiles(data){
  const files=Array.from(data?.files||[]).filter(file=>file.type.startsWith('image/'));
  if(files.length)return files;
  const html=data?.getData('text/html');if(!html)return [];
  const template=document.createElement('template');template.innerHTML=html;
  for(const node of template.content.querySelectorAll('img')){
    const src=node.getAttribute('src');if(!isSafeNoteImage(src))continue;
    const comma=src.indexOf(','),type=src.slice(5,src.indexOf(';')),bytes=atob(src.slice(comma+1));
    files.push(new File([Uint8Array.from(bytes,char=>char.charCodeAt(0))],node.getAttribute('alt')||'Pasted image',{type}));
  }
  return files;
}
export async function prepareNoteImages(files){
  const selected=Array.from(files||[]);
  if(!selected.length)return [];
  if(selected.length>8)throw new Error('Add up to eight images at a time.');
  const images=[];
  for(const file of selected){
    if(!IMAGE_TYPES.has(file.type))throw new Error('Choose a JPG, PNG, WebP or GIF image.');
    if(file.size>MAX_FILE_BYTES)throw new Error('This image is too large. Choose an image smaller than 20 MB.');
    const source=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('This image could not be read. Try a different copy.'));reader.readAsDataURL(file);});
    const image=new Image();
    // The live Launchpad permits data images, while its CSP deliberately excludes blob URLs.
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('This image could not be opened. Try a different copy.'));image.src=source;});
    if(!image.naturalWidth||!image.naturalHeight)throw new Error('This image could not be opened. Try a different copy.');
    let scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),src='';
    const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
    if(!context)throw new Error('Images are unavailable in this browser. Try Chrome.');
    // A smaller embedded copy keeps notes and their backup files manageable.
    for(let attempt=0;attempt<6;attempt++){
      canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
      context.drawImage(image,0,0,canvas.width,canvas.height);
      src=canvas.toDataURL('image/webp',Math.max(.58,.86-attempt*.05));
      if(src.length<=MAX_IMAGE_CHARS&&isSafeNoteImage(src))break;
      scale*=.75;
    }
    if(src.length>MAX_IMAGE_CHARS||!isSafeNoteImage(src))throw new Error('This image is too large for a note. Try a smaller image.');
    images.push({src,alt:file.name||'Pasted image',width:canvas.width,height:canvas.height});
  }
  return images;
}
