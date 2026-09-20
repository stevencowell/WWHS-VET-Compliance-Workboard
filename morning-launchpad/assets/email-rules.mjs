import {enrich,linksIn,todaySydney,validDate,SOURCE_LIMIT} from './summary-core.mjs?v=plain-language-1';
const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
const datePattern='(?:\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{4})';
function fullDate(raw){
 let value=raw;const n=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),m=raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{4})$/i);
 if(n)value=`${n[3]}-${n[2].padStart(2,'0')}-${n[1].padStart(2,'0')}`;
 if(m)value=`${m[3]}-${String(months.findIndex(x=>x.startsWith(m[2].toLowerCase()))+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
 return value&&validDate(value)?value:null;
}
function datesAfter(text,cue){
 const re=new RegExp('\\b(?:'+cue+')\\s*:?\\s*(?:(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\\s+)?('+datePattern+')','gi');
 const matches=[...text.matchAll(re)];const dates=[...new Set(matches.map(x=>fullDate(x[1])).filter(Boolean))];
 return {date:dates.length===1&&matches.every(x=>fullDate(x[1]))?dates[0]:null,uncertain:matches.length>0&&(dates.length!==1||matches.some(x=>!fullDate(x[1])))};
}
export function suggestEmail(source,{subject='',instruction='',today=todaySydney()}={}){
 if(typeof source!=='string'||!source.trim())throw new Error('Paste one email first.');
 if(source.length>SOURCE_LIMIT)throw new Error('This email chain is too long (maximum 200,000 characters). Your pasted text has been kept; no task was saved.');
 const text=source.replace(/\r\n?/g,'\n').trim();const candidateSubject=text.match(/^Subject:\s*(.+)$/im);const subjectMatch=candidateSubject&&text.slice(0,candidateSubject.index).split('\n').every(line=>!line.trim()||line.trim()===candidateSubject[1].trim()||/^(?:From|Sent|To|Cc|Bcc|Date):/i.test(line.trim()))?candidateSubject:null;
 let body=subjectMatch?text.slice(subjectMatch.index+subjectMatch[0].length):text;
 body=body.split(/\n(?:-{2,}\s*(?:Original|Forwarded) message|On [^\n]+wrote:|Begin forwarded message:)/i)[0];
 const lines=[];let started=false;
 for(const raw of body.split('\n')){
  const line=raw.trim();if(!line)continue;
  if(/^From:/i.test(line)&&started)break;
  if(/^(?:From|Sent|To|Cc|Bcc|Subject|Date):/i.test(line)||/^>/.test(line))continue;
  if(/^(?:Regards|Kind regards|Best regards|Sent from my|Confidentiality:|LEGAL NOTICE|\*{3})\b/i.test(line))break;
  if(/^(?:Hi|Hello|Dear|Good morning|Morning)\b[^.!?]*[,!]?$/.test(line))continue;
  lines.push(line);started=true;
 }
 const title=(subject.trim()||subjectMatch?.[1]?.trim()||lines[0]?.slice(0,300)||'Pasted email').slice(0,300);
 const content=lines.join('\n');const direct=instruction.trim()||content.match(/^(?:NOTE\s*[–-]|Note\s*:)\s*(.+)$/im)?.[1]||'';
 const sentences=content.split(/\n|(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
 const request=sentences.find(x=>/\b(?:please|could you|can you|can we|need you to|you (?:must|need to|are required to))\b/i.test(x)&&!/\b(?:unsubscribe|privacy policy|do not reply)\b/i.test(x));
 const action=(direct||request||'Review this email and decide whether action is needed').slice(0,800);
 const evidence=direct||[title,...sentences].join('\n');
 const waiting=/^(?:await(?:ing)?|waiting (?:on|for))\b/i.test(action);
 const promotional=!direct&&!request&&/\b(?:unsubscribe|special offer|sale ends|discount|newsletter)\b/i.test(content);
 const deadline=datesAfter(evidence,'due(?: date)?(?: is| on)?|deadline(?: is| on)?|by|closes?(?: on)?|no later than');
 const eventDate=/\b(?:meeting|competition|event|appointment|interview|assembly)\b/i.test(evidence)?datesAfter(evidence,'on|event date|meeting date|date'): {date:null,uncertain:false};
 const noRush=/\b(?:not urgent|no rush|not required today)\b/i.test(evidence);
 const urgent=Boolean(deadline.date&&deadline.date<=today)||(!noRush&&/\b(?:urgent|asap|overdue|today|tomorrow)\b/i.test(evidence));
 const actionable=Boolean(direct||request);const group=waiting?'waiting':actionable?'ready':'later';
 const priority=promotional?'purple':urgent?(direct?'red':'blue'):actionable?'green':'';
 const reason=waiting?'The message says to wait':promotional?'Looks like a promotion; check whether you need it':urgent?'The message says it is urgent or the deadline is due':direct?'Based on what you need to do':request?'A request was found in the message':'No clear request found; kept for you to review later';
 const dateNote=deadline.uncertain||eventDate.uncertain?'More than one date was found, or a date could not be read. Choose the correct dates before saving.':/\b(?:today|tomorrow|next week|next (?:Monday|Tuesday|Wednesday|Thursday|Friday))\b/i.test(evidence)?'The email uses wording such as “today” or “next week”. Check when it was sent before choosing a date.':!deadline.date&&!eventDate.date?'No clear date found. Add one if needed.':'Dates were found in the message. Check they apply to your task.';
 return enrich({id:'email-preview',title,action,source:text,links:linksIn(text),url:'',instruction:direct,group,priority,nextAction:waiting?'delay':deadline.date?'date':actionable?'do':'delay',dueDate:deadline.date,eventDate:eventDate.date,reason:`Suggested from the email wording: ${reason}.`,dateNote,score:urgent?70:actionable?30:0});
}
