import {validDate,safeUrl,todaySydney} from './summary-core.mjs?v=10';
export const CALENDAR_KEY='morning-launchpad-calendar:v1';
export const MAX_CALENDAR_EVENTS=10000;
const capacityError=count=>`This import would contain ${count.toLocaleString('en-AU')} saved events; the calendar allows ${MAX_CALENDAR_EVENTS.toLocaleString('en-AU')}. Export a shorter date range from the source calendar. Your saved events have not changed.`;
export const ZONE='Australia/Sydney';
export const WEEKDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const dateObject=date=>new Date(date+'T12:00:00Z');
export function addDays(date,n){const d=dateObject(date);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function shiftMonth(date,n){const d=dateObject(date),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);}
export function weekStart(date){return addDays(date,-((dateObject(date).getUTCDay()+6)%7));}
export function monthDays(date){const first=date.slice(0,7)+'-01',start=weekStart(first);return Array.from({length:42},(_,i)=>addDays(start,i));}
export function labelDate(date,options={day:'numeric',month:'long',year:'numeric'}){return new Intl.DateTimeFormat('en-AU',{timeZone:'UTC',...options}).format(dateObject(date));}
const validTime=t=>typeof t==='string'&&(!t||/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t));
export function normalEvent(input){
 const e={id:'',uid:'',title:'',startDate:'',endDate:'',startTime:'',endTime:'',description:'',location:'',url:'',origin:'manual',...input};e.endDate=e.endDate||e.startDate;
 if(typeof e.id!=='string'||!e.id||e.id.length>200||typeof e.uid!=='string'||e.uid.length>1000||typeof e.title!=='string'||!e.title.trim()||e.title.length>300||!e.startDate||!e.endDate||!validDate(e.startDate)||!validDate(e.endDate)||e.endDate<e.startDate||!validTime(e.startTime)||!validTime(e.endTime)||!e.startTime&&e.endTime||e.startDate===e.endDate&&e.endTime&&e.endTime<=e.startTime||['description','location'].some(k=>typeof e[k]!=='string'||e[k].length>20000)||typeof e.url!=='string'||e.url&&!safeUrl(e.url))throw new Error('Check the event title, dates, times and work link. End must be after start.');
 for(const key of ['taskId','dateKey','kind','done'])delete e[key];
 return e;
}
export function validateCalendar(raw){
 if(raw===null)return {version:1,events:[]};if(typeof raw!=='string'||raw.length>5000000)throw new Error('Calendar file is too large.');
 const v=JSON.parse(raw);if(v?.version!==1||!Array.isArray(v.events))throw new Error('Use a Launchpad calendar backup.');
 if(v.events.length>MAX_CALENDAR_EVENTS)throw new Error(capacityError(v.events.length));
 const events=v.events.map(normalEvent);if(new Set(events.map(x=>x.id)).size!==events.length)throw new Error('Duplicate calendar event IDs.');return {...v,events};
}
export function taskEvents(tasks){
 return tasks.filter(t=>!['superseded','dismissed'].includes(t.status)).flatMap(t=>[['dueDate','Deadline'],['eventDate','Event'],['followUpDate','Follow-up']].filter(([key])=>t[key]&&validDate(t[key])).map(([key,kind])=>({id:`task:${t.id}:${key}`,uid:`task:${t.id}:${key}`,title:(t.action||t.title).slice(0,300),sourceTitle:t.title,description:t.action||t.source||'',startDate:t[key],endDate:t[key],startTime:'',endTime:'',taskId:t.id,dateKey:key,kind,done:t.status==='done',url:t.url||'',location:''})));
}
// Older imports already retain these Sentral timetable markers. Derive their
// appearance without rewriting saved events or requiring another import.
export function calendarCategory(event){
 if(event.taskId)return event.done?'done':(event.kind||'Event').toLowerCase();
 if(event.origin!=='import')return 'event';
 const period=/^Period:\s*[A-Za-z0-9]+\s*$/im.test(event.description||'');
 const classCode=/^(?:\d{1,2}[A-Z][A-Z0-9]*|Duty(?:\.[A-Za-z0-9]+)?)\s*:/i.test(event.title||'');
 return period&&classCode?'timetable':'diary';
}
export function eventsOn(events,date){return events.filter(e=>e.startDate<=date&&e.endDate>=date&&!(e.startTime&&e.endDate===date&&e.endDate>e.startDate&&e.endTime==='00:00')).sort((a,b)=>(a.startTime||'').localeCompare(b.startTime||'')||a.title.localeCompare(b.title));}
const csvCell=s=>'"'+String(s).replaceAll('"','""')+'"';
export const csvTemplate=()=>['title,startDate,endDate,startTime,endTime,description,location,url','Example meeting,2026-09-18,2026-09-18,09:00,10:00,Optional notes,,'].join('\r\n');
export function csvRows(text){const rows=[];let row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(x=>x.trim()))rows.push(row);row=[];value='';}else value+=c;}if(quoted)throw new Error('The CSV has an unclosed quote.');row.push(value);if(row.some(x=>x.trim()))rows.push(row);return rows;}
const inputDate=s=>{s=s.trim();const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:s;};
function inputTime(s){s=s.trim();if(!s)return '';const m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);if(!m)return s;let h=Number(m[1]);if(m[3])h=h%12+(m[3].toUpperCase()==='PM'?12:0);return String(h).padStart(2,'0')+':'+m[2];}
function parseCSV(text){const rows=csvRows(text.replace(/^\uFEFF/,'')),headers=(rows.shift()||[]).map(s=>s.toLowerCase().replace(/[^a-z]/g,''));if(!headers.includes('startdate')||!headers.some(x=>['title','subject'].includes(x)))throw new Error('CSV needs title (or Subject) and startDate columns. Download the CSV template for the format.');return rows.map((r,i)=>{const v=Object.fromEntries(headers.map((h,j)=>[h,r[j]||'']));const event={id:crypto.randomUUID(),title:v.title||v.subject,startDate:inputDate(v.startdate),endDate:inputDate(v.enddate||v.startdate),startTime:inputTime(v.starttime||''),endTime:inputTime(v.endtime||''),description:v.description||'',location:v.location||'',url:v.url||'',origin:'import'};if(/^(true|yes)$/i.test(v.alldayevent||'')){event.startTime='';event.endTime='';}return normalEvent(event);});}
const unescapeICS=s=>s.replace(/\\([nN,;\\])/g,(_,x)=>/[nN]/.test(x)?'\n':x);
const escapeICS=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function partsInZone(ms,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms)).map(x=>[x.type,x.value]));}
function stamp(parts){return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
function parseICSTime(prop,defaultZone){
 if(!prop)throw new Error('An event is missing its start date.');const m=prop.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);if(!m)throw new Error('Unsupported calendar date: '+prop.value);
 const date=`${m[1]}-${m[2]}-${m[3]}`;if(!validDate(date))throw new Error('Invalid calendar date.');if(!m[4])return {date,time:'',allDay:true};
 const time=`${m[4]}:${m[5]}`;if(!validTime(time))throw new Error('Invalid calendar time.');
 let zone=m[7]?'UTC':(prop.params.TZID||defaultZone||ZONE);zone=zone.replace(/^"|"$/g,'');zone={'AUS Eastern Standard Time':ZONE,'E. Australia Standard Time':'Australia/Brisbane','Tasmania Standard Time':'Australia/Hobart','W. Australia Standard Time':'Australia/Perth','Cen. Australia Standard Time':'Australia/Adelaide'}[zone]||zone;
 const target=Date.parse(date+'T'+time+':00Z');let instant=target;
 try{for(let i=0;i<4;i++){const shown=Date.parse(stamp(partsInZone(instant,zone))+':00Z'),delta=target-shown;instant+=delta;if(!delta)break;}if(stamp(partsInZone(instant,zone))!==date+'T'+time)throw new Error();const p=partsInZone(instant,ZONE);return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`,allDay:false};}catch{throw new Error(`Cannot safely interpret timezone/time “${zone}” for ${date} ${time}. No events imported.`);}
}
function parseICS(text){
 const lines=text.replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n');if(!lines.some(l=>l.trim()==='BEGIN:VCALENDAR'))throw new Error('This is not an iCalendar (.ics) file.');
 const records=[];let current=null,depth=0,zone=ZONE;
 for(const line of lines){if(line==='BEGIN:VEVENT'){if(current)throw new Error('Nested calendar event.');current=[];depth=0;continue;}if(line==='END:VEVENT'){if(current)records.push(current);current=null;continue;}if(!current){if(line.startsWith('X-WR-TIMEZONE:'))zone=line.slice(line.indexOf(':')+1);continue;}if(line.startsWith('BEGIN:')){depth++;continue;}if(line.startsWith('END:')){depth--;continue;}if(depth)continue;const colon=line.indexOf(':');if(colon<0)continue;const [name,...parameters]=line.slice(0,colon).split(';');current.push({name:name.toUpperCase(),params:Object.fromEntries(parameters.map(p=>{const i=p.indexOf('=');return [p.slice(0,i).toUpperCase(),p.slice(i+1)];})),value:line.slice(colon+1)});}
 if(current)throw new Error('Incomplete calendar file.');
 const out=[];
 for(const props of records){const get=k=>props.find(p=>p.name===k),value=k=>unescapeICS(get(k)?.value||'');if(value('STATUS')==='CANCELLED')throw new Error('This file contains cancellation records. Import a full calendar export with cancelled events removed.');if(['RRULE','RDATE','EXDATE','RECURRENCE-ID'].some(get))throw new Error('This file contains repeating events. Export them as individual dated occurrences or use the CSV template; no events have been imported.');
  const start=parseICSTime(get('DTSTART'),zone),finish=get('DTEND')?parseICSTime(get('DTEND'),zone):null;if(finish&&finish.allDay!==start.allDay)throw new Error('An event mixes all-day and timed dates.');
  if(get('DURATION')&&!finish)throw new Error('Duration-only events need an explicit end date/time in this import. No events imported.');
  const endDate=finish?(finish.allDay?addDays(finish.date,-1):finish.date):start.date;
  out.push(normalEvent({id:crypto.randomUUID(),uid:value('UID'),title:value('SUMMARY')||'Untitled event',startDate:start.date,endDate,startTime:start.time,endTime:finish?.time||'',description:value('DESCRIPTION'),location:value('LOCATION'),url:safeUrl(value('URL')),origin:'import'}));
 }
 if(!out.length)throw new Error('No dated events found.');return out;
}
export function parseCalendarFile(text,name){if(text.length>5000000)throw new Error('Use a calendar file smaller than 5 MB.');if(/\.json$/i.test(name))return validateCalendar(text).events;if(/\.csv$/i.test(name))return parseCSV(text);return parseICS(text);}
export function mergeEvents(existing,incoming,derived=[]){const events=existing.map(x=>({...x}));let added=0,updated=0;for(const x of incoming){const next=normalEvent(x);if(next.uid&&derived.some(e=>e.uid===next.uid))continue;const i=events.findIndex(e=>next.uid&&e.uid?e.uid===next.uid:e.id===next.id||e.title===next.title&&e.startDate===next.startDate&&e.startTime===next.startTime);if(i<0){events.push(next);added++;}else{events[i]={...events[i],...next,id:events[i].id};updated++;}}if(events.length>MAX_CALENDAR_EVENTS)throw new Error(capacityError(events.length));return {events,added,updated};}
export function toICS(events){
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Morning Launchpad//Calendar//EN','CALSCALE:GREGORIAN','X-WR-TIMEZONE:'+ZONE];
 for(const e of events){const date=d=>d.replaceAll('-',''),time=t=>t.replace(':','')+'00';lines.push('BEGIN:VEVENT','UID:'+escapeICS(e.uid||e.id),'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),'SUMMARY:'+escapeICS(e.title));if(e.startTime){lines.push(`DTSTART;TZID=${ZONE}:${date(e.startDate)}T${time(e.startTime)}`);if(e.endTime)lines.push(`DTEND;TZID=${ZONE}:${date(e.endDate)}T${time(e.endTime)}`);}else lines.push('DTSTART;VALUE=DATE:'+date(e.startDate),'DTEND;VALUE=DATE:'+date(addDays(e.endDate,1)));if(e.description)lines.push('DESCRIPTION:'+escapeICS(e.description));if(e.location)lines.push('LOCATION:'+escapeICS(e.location));if(safeUrl(e.url))lines.push('URL:'+e.url);lines.push('END:VEVENT');}lines.push('END:VCALENDAR');
 return lines.map(line=>{let out='',chunk='',bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>73){out+=chunk+'\r\n ';chunk='';bytes=1;}chunk+=char;bytes+=n;}return out+chunk;}).join('\r\n')+'\r\n';
}
