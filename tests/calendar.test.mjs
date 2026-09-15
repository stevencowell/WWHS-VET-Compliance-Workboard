import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_CALENDAR_EVENTS,addDays,shiftMonth,weekStart,monthDays,normalEvent,validateCalendar,taskEvents,calendarCategory,eventsOn,parseCalendarFile,mergeEvents,toICS} from '../morning-launchpad/assets/calendar-core.mjs';
const event=(x={})=>normalEvent({id:'e',title:'Planning meeting',startDate:'2026-09-16',...x});
const ics=body=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
test('existing timetable lessons and duties stand apart from diary imports and task dates',()=>{
 const lesson=event({origin:'import',title:'10WOTE2: Timber - Industrial Technology Elective Yr10',description:'Period: 2'});
 const before=JSON.stringify(lesson);
 assert.equal(calendarCategory(lesson),'timetable');assert.equal(JSON.stringify(lesson),before);
 assert.equal(calendarCategory(event({origin:'import',title:'Duty.B: Amphitheatre',description:'Period: L1'})),'timetable');
 assert.equal(calendarCategory(event({origin:'import',title:'Week A Timetable'})),'diary');
 assert.equal(calendarCategory(event({origin:'import',title:'Year 11 exam period',description:'Period: 2'})),'diary');
 assert.equal(calendarCategory(event()),'event');
 const [deadline]=taskEvents([{id:'a',title:'Note : School diary task',dueDate:'2026-09-16',status:'review'}]);
 assert.equal(calendarCategory(deadline),'deadline');assert.equal(calendarCategory({...deadline,done:true}),'done');
});
test('calendar date arithmetic handles Mondays, leap days and month ends',()=>{
 assert.equal(weekStart('2026-09-20'),'2026-09-14');assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(shiftMonth('2026-01-31',1),'2026-02-28');assert.equal(monthDays('2026-09-16').length,42);assert.equal(monthDays('2026-09-16')[0],'2026-08-31');
});
test('task dates are derived live with traceability and completed status',()=>{
 const task={id:'a',title:'Note : Signage',action:'Meet Chris',dueDate:'2026-09-20',eventDate:'2026-09-21',followUpDate:null,status:'review'};
 const events=taskEvents([task]);assert.equal(events.length,2);assert.equal(events[0].taskId,'a');assert.equal(events[0].dateKey,'dueDate');assert.equal(events[0].kind,'Deadline');
 assert.equal(taskEvents([{...task,dueDate:null}]).length,1);assert.equal(taskEvents([{...task,status:'superseded'}]).length,0);assert.ok(taskEvents([{...task,status:'done'}])[0].done);
});
test('event validation rejects impossible dates and unsafe links',()=>{
 assert.throws(()=>event({startDate:'2026-02-31'}));assert.throws(()=>event({startTime:'10:00',endTime:'09:00'}));assert.throws(()=>event({url:'javascript:alert(1)'}));assert.throws(()=>event({startTime:'25:00'}));
 const saved=validateCalendar(JSON.stringify({version:1,events:[event()]}));assert.equal(saved.events[0].endDate,'2026-09-16');assert.equal(event({taskId:'forged',dateKey:'dueDate'}).taskId,undefined);
});
test('ICS all-day end dates are exclusive and repeated imports update by UID',()=>{
 const parsed=parseCalendarFile(ics('BEGIN:VEVENT\r\nUID:trip\r\nSUMMARY:School camp\r\nDTSTART;VALUE=DATE:20260916\r\nDTEND;VALUE=DATE:20260919\r\nEND:VEVENT'),'camp.ics');assert.equal(parsed[0].endDate,'2026-09-18');assert.equal(eventsOn(parsed,'2026-09-19').length,0);assert.equal(eventsOn(parsed,'2026-09-18').length,1);
 const first=mergeEvents([],parsed),second=mergeEvents(first.events,[{...parsed[0],id:'other',title:'Updated camp'}]);assert.equal(second.added,0);assert.equal(second.updated,1);assert.equal(second.events[0].id,first.events[0].id);assert.equal(second.events[0].title,'Updated camp');
 assert.equal(mergeEvents(parsed,[{...parsed[0],id:'x',uid:'different'}]).added,1);
});
test('ICS UTC, timezone and folded text resolve correctly in Sydney including DST',()=>{
 const text=ics('BEGIN:VEVENT\r\nUID:meeting\r\nSUMMARY:A long title that\r\n continues\r\nDTSTART:20261005T220000Z\r\nDTEND:20261005T230000Z\r\nDESCRIPTION:Line one\\nLine two\\, with comma\r\nEND:VEVENT');
 const [e]=parseCalendarFile(text,'meeting.ics');assert.equal(e.startDate,'2026-10-06');assert.equal(e.startTime,'09:00');assert.equal(e.endTime,'10:00');assert.equal(e.title,'A long title thatcontinues');assert.equal(e.description,'Line one\nLine two, with comma');
 const [s]=parseCalendarFile(ics('X-WR-TIMEZONE:Australia/Sydney\r\nBEGIN:VEVENT\r\nSUMMARY:Local\r\nDTSTART:20260916T090000\r\nDTEND:20260916T100000\r\nEND:VEVENT'),'s.ics');assert.equal(s.startTime,'09:00');
});
test('unsupported recurring imports stop without partial events',()=>{
 assert.throws(()=>parseCalendarFile(ics('BEGIN:VEVENT\r\nSUMMARY:Weekly staff meeting\r\nDTSTART;VALUE=DATE:20260916\r\nRRULE:FREQ=WEEKLY\r\nEND:VEVENT'),'r.ics'),/repeating/);
});
test('CSV supports quoted notes and Australian dates without guessing US dates',()=>{
 const rows=parseCalendarFile('Subject,Start Date,Start Time,End Date,End Time,Description\r\n"Staff, planning",16/09/2026,9:00 AM,16/09/2026,10:00 AM,"Two lines\nwith a comma, inside"','dates.csv');assert.equal(rows.length,1);assert.equal(rows[0].title,'Staff, planning');assert.equal(rows[0].startTime,'09:00');assert.equal(rows[0].startDate,'2026-09-16');assert.match(rows[0].description,/\n/);
});
test('calendar ICS export roundtrips own events and avoids duplicating derived task dates',()=>{
 const e=event({title:'Meeting, notes; and \\ links',startTime:'09:00',endTime:'10:00',description:'Line one\nLine two'});const result=parseCalendarFile(toICS([e]),'export.ics');assert.equal(result[0].startTime,'09:00');assert.equal(result[0].title,e.title);assert.equal(result[0].description,e.description);
 const derived=taskEvents([{id:'a',title:'Note : Due',action:'Do task',dueDate:'2026-09-20',status:'review'}]);const imported=parseCalendarFile(toICS(derived),'export.ics');assert.equal(mergeEvents([],imported,derived).added,0);
});
test('a timetable and school diary can exceed 1,000 events and survive reload and reimport',()=>{
 const timetable=Array.from({length:700},(_,i)=>event({id:`lesson-${i}`,uid:`lesson-${i}`,title:`Lesson ${i}`,location:'Room H02'}));
 const diary=Array.from({length:1800},(_,i)=>event({id:`diary-${i}`,uid:`diary-${i}`,title:`Diary event ${i}`,description:'School diary details'}));
 const existing=[event({id:'my-note',title:'My own appointment'}),...timetable];
 const before=JSON.stringify(existing);
 const merged=mergeEvents(existing,diary);
 assert.equal(merged.added,1800);assert.equal(merged.events.length,2501);assert.equal(JSON.stringify(existing),before);
 const restored=parseCalendarFile(JSON.stringify({version:1,events:merged.events}),'calendar-backup.json');
 assert.equal(restored.length,2501);assert.deepEqual(restored[0],existing[0]);assert.equal(restored[1].location,'Room H02');
 const refreshed=mergeEvents(restored,diary.map(e=>({...e,id:`fresh-${e.id}`,title:e.title+' updated'})));
 assert.equal(refreshed.added,0);assert.equal(refreshed.updated,1800);assert.equal(refreshed.events.length,2501);
 assert.equal(refreshed.events.at(-1).id,'diary-1799');assert.equal(refreshed.events.at(-1).title,'Diary event 1799 updated');
});
test('the larger capacity limit stays consistent and rejects overflow without partial changes',()=>{
 const saved=Array.from({length:MAX_CALENDAR_EVENTS},(_,i)=>event({id:`e-${i}`,uid:`uid-${i}`}));
 assert.equal(validateCalendar(JSON.stringify({version:1,events:saved})).events.length,MAX_CALENDAR_EVENTS);
 const before=JSON.stringify(saved);
 assert.throws(()=>mergeEvents(saved,[event({id:'extra',uid:'extra'})]),/10,001 saved events.*10,000/);
 assert.equal(JSON.stringify(saved),before);
 assert.throws(()=>validateCalendar(JSON.stringify({version:1,events:[...saved,event({id:'extra'})]})),/10,001 saved events.*10,000/);
});
