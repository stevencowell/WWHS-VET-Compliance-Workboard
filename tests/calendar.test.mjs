import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,shiftMonth,weekStart,monthDays,normalEvent,validateCalendar,taskEvents,eventsOn,parseCalendarFile,mergeEvents,toICS} from '../morning-launchpad/assets/calendar-core.mjs';
const event=(x={})=>normalEvent({id:'e',title:'Planning meeting',startDate:'2026-09-16',...x});
const ics=body=>`BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
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
