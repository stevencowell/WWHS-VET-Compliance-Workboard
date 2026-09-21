import {mergeInbox,sameSourceAction} from './summary-core.mjs?v=plain-language-1';
import {plainNoteHtml} from './note-editor.mjs?v=email-note-images-1';
import {NOTE_HTML_LIMIT,noteImageHtml} from './note-images.mjs?v=email-note-images-1';

// Capturing an email supplies a default note, never a replacement for a saved note.
export function mergeCapturedEmail(existing,item,images=[]){
  const previous=existing.find(old=>old.personal===item.personal&&(
    item.taskKey&&old.taskKey===item.taskKey||sameSourceAction(old,item)||
    old.title===item.title&&(!item.taskKey||!old.taskKey)&&old.source===item.source));
  const keepNote=previous&&(previous.noteText||previous.noteHtml||previous.dirty.some(key=>['noteText','noteHtml'].includes(key)));
  const incoming=keepNote?{...item,noteText:previous.noteText,noteHtml:previous.noteHtml}:item;
  const merged=mergeInbox(existing,[incoming]);
  const saved=merged.items.find(entry=>previous?entry.id===previous.id:entry.taskKey===item.taskKey);
  if(!saved)throw new Error('This email could not be matched to its saved task. Your pasted email and images are still here.');
  if(images.length){
    let html=saved.noteHtml||plainNoteHtml(saved.noteText);
    for(const image of images)if(!html.includes(image.src))html+=`<p>${noteImageHtml(image)}</p>`;
    if(html.length>NOTE_HTML_LIMIT)throw new Error('These images will not fit in this note. Remove an image or add a link to the original instead. Your email and images are still here.');
    saved.noteHtml=html;
  }
  // The default is now a saved working note, so later task imports must keep it too.
  saved.dirty=[...new Set([...saved.dirty,'noteHtml','noteText'])];
  return {...merged,saved};
}
