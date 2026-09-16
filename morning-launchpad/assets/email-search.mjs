// A search aid, not a claimed direct link to a message.
export function emailSearchText(item){
 const subject=String(item.source||'').match(/^\s*Subject:\s*(.+)$/im)?.[1];
 return (subject||String(item.title||'').replace(/^Note\s*:\s*/i,''))
  .replace(/^(?:(?:fw|fwd|re)\s*:\s*)+/i,'').replace(/\s+/g,' ').trim().slice(0,300);
}
