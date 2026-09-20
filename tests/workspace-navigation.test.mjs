import test from 'node:test';
import assert from 'node:assert/strict';
import {isWorkboardDestination,createWorkspaceNavigationAllowance} from '../assets/js/workspace-navigation.mjs';
const base='https://example.test/workboard/';
function setup(){
  const win={location:new URL('morning-launchpad/',base)},doc=new EventTarget();let clock=100;
  const guard=createWorkspaceNavigationAllowance(win,doc,{base,now:()=>clock});
  function click(href,{target='',download=false,lateCancel=false,...values}={}){
    const event=new Event('click',{cancelable:true});
    Object.defineProperties(event,{button:{value:0},target:{value:{closest:()=>({href:new URL(href,win.location.href).href,target,hasAttribute:name=>name==='download'&&download})}},...Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value}]))});
    doc.dispatchEvent(event);if(lateCancel)event.preventDefault();return event;
  }
  return {guard,click,advance:()=>clock+=1001};
}
test('all workspace destinations including Finance are allowed, external and unrelated destinations are not',()=>{
  for(const href of ['./#vet-home','head-teacher-tas/','morning-launchpad/','finance/','finance/index.html','team-handover/?wing=vet'])assert.equal(isWorkboardDestination(href,base),true,href);
  for(const href of ['https://other.test/workboard/','http://example.test/workboard/','../finance/','task-sources/','finance/backup.json','javascript:void(0)'])assert.equal(isWorkboardDestination(href,base),false,href);
});
test('normal internal navigation permits only the next unload and expires when navigation does not happen',()=>{
  const h=setup();h.click('../#vet-home');assert.equal(h.guard.consume(),true);assert.equal(h.guard.consume(),false);
  h.click('../finance/');h.advance();assert.equal(h.guard.consume(),false);
});
test('new tabs, downloads, cancelled clicks, hashes and external destinations never bypass closing warnings',()=>{
  for(const [href,options] of [['#calendar',{}],['../#vet-home',{target:'_blank'}],['../#vet-home',{ctrlKey:true}],['../#vet-home',{metaKey:true}],['../#vet-home',{shiftKey:true}],['../#vet-home',{altKey:true}],['../#vet-home',{button:1}],['../#vet-home',{download:true}],['../#vet-home',{lateCancel:true}],['https://elsewhere.test/',{}]]){
    const h=setup();h.click(href,options);assert.equal(h.guard.consume(),false,JSON.stringify([href,options]));
  }
  const h=setup();h.click('../#vet-home');h.click('https://elsewhere.test/');assert.equal(h.guard.consume(),false,'A later unrelated click clears an unused allowance');
});
