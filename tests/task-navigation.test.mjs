import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../assets/js/task-navigation.js', import.meta.url), 'utf8');
function harness(current = 'https://example.edu/workboard/#my-work') {
  const context = {window:{}, location:new URL(current), URL, URLSearchParams};
  vm.runInNewContext(source, context);
  return {handleClick:context.window.WWHS_TASK_NAVIGATION.handleClick, location:context.location};
}
function click(href, options = {}) {
  const link = {
    href, target:options.target || '',
    matches:selector => selector === 'a[href]',
    hasAttribute:name => name === 'download' && Boolean(options.download)
  };
  const event = {
    button:0, defaultPrevented:false,
    target:{closest:() => link},
    composedPath:() => [{},link,{}],
    preventDefault(){this.defaultPrevented=true;},
    ...options.event
  };
  return {link,event};
}

test('same-document task links open without replacing the current route or year scope', () => {
  for (const hash of ['#my-work','#year?year=2026']) {
    const h=harness('https://example.edu/workboard/'+hash);
    const {link,event}=click('#task/a%20task?record=a%20task%3A%3A2026');
    let opened;
    assert.equal(h.handleClick(event,value=>{opened=value;return true;}),true);
    assert.equal(opened.taskId,'a task');
    assert.equal(opened.params.get('record'),'a task::2026');
    assert.equal(opened.link,link);
    assert.equal(event.defaultPrevented,true);
    assert.equal(h.location.hash,hash);
  }
});

test('keyboard activation and composed paths resolve the actual source anchor', () => {
  const h=harness();
  for (const eventOverrides of [{button:undefined},{target:{closest:()=>null}},{composedPath:undefined}]) {
    const {link,event}=click('#task/known',{event:eventOverrides});
    let opened;
    assert.equal(h.handleClick(event,value=>{opened=value;return true;}),true);
    assert.equal(opened.link,link);
  }
});

test('modified, non-primary, download and new-window clicks retain normal browser behaviour', () => {
  const h=harness();
  const options = [
    ...['ctrlKey','metaKey','shiftKey','altKey'].map(key=>({event:{[key]:true}})),
    {event:{button:1}},{event:{button:2}},{event:{defaultPrevented:true}},
    {download:true},{target:'_blank'},{target:'another-window'}
  ];
  for (const option of options) {
    const {event}=click('#task/known',option);
    const before=event.defaultPrevented;
    assert.equal(h.handleClick(event,()=>assert.fail('must not intercept')),false);
    assert.equal(event.defaultPrevented,before);
  }
  assert.equal(h.handleClick(click('#task/known',{target:'_self'}).event,()=>true),true);
});

test('other origins, wings, documents and search queries remain navigable', () => {
  const h=harness('https://example.edu/workboard/?preview=1#my-work');
  for (const href of [
    'https://other.edu/workboard/?preview=1#task/known',
    'https://example.edu/workboard/head-teacher-tas/?preview=1#task/known',
    'https://example.edu/workboard/index.html?preview=1#task/known',
    'https://example.edu/workboard/?preview=2#task/known',
    'https://example.edu/workboard/#task/known'
  ]) {
    const {event}=click(href);
    assert.equal(h.handleClick(event,()=>assert.fail('must not intercept')),false);
    assert.equal(event.defaultPrevented,false);
  }
  assert.equal(h.handleClick(click('#task/known').event,()=>true),true);
});

test('malformed and non-task routes do not open a dialog or block navigation', () => {
  const h=harness();
  for (const href of ['http://[','#task/%E0%A4','#today?weekly=0','#my-work','#taskish/known']) {
    const {event}=click(href);
    assert.equal(h.handleClick(event,()=>assert.fail('must not open')),false);
    assert.equal(event.defaultPrevented,false);
  }
});

test('unknown task ids and non-link clicks are left to the ordinary route handler', () => {
  const h=harness(), {event}=click('#task/missing');
  assert.equal(h.handleClick(event,({taskId})=>taskId==='known'),false);
  assert.equal(event.defaultPrevented,false);
  assert.equal(h.handleClick({target:{closest:()=>null}},()=>assert.fail('not a link')),false);
});
