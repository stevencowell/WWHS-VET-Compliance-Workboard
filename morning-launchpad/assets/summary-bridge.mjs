import {prepareTasks} from './summary-core.mjs?v=6';
// Use the existing conflict-safe React saver for every daily-plan mutation.
export function useSummaryBridge(React,context){
  React.useEffect(()=>{
    const {day,days,date,ready,editing,save}=context;
    const state={capacity:day.capacity,count:day.tasks.length,closed:day.closed,ready,days,date};
    function snapshot(event){event.detail.state=state;}
    function add(event){
      const request=event.detail;
      try{
        if(!ready||editing)throw new Error('Finish editing or reload the saved daily plan before adding priorities.');
        const additions=prepareTasks(day,request.items);
        if(additions.length&&!save({...day,tasks:[...day.tasks,...additions]}))throw new Error('The plan could not be saved. Resolve the message in today’s plan and try again.');
        request.result={ok:true,count:additions.length};
      }catch(error){request.result={ok:false,message:error.message};}
    }
    function progress(event){
      const request=event.detail;
      try{
        const matches=t=>t.id===`summary:${request.id}`||t.title===request.title||(request.planAliases||[]).some(a=>t.id===a.id||t.title===a.title);
        if(day.tasks.some(matches)){
          if(!ready||editing||day.closed)throw new Error('Reopen today’s plan and finish editing before changing this task.');
          if(!['todo','done'].includes(request.state))throw new Error('Invalid progress');
          if(!save({...day,tasks:day.tasks.map(t=>matches(t)?{...t,state:request.state}:t)}))throw new Error('The daily plan could not be saved.');
        }
        request.result={ok:true};
      }catch(error){request.result={ok:false,message:error.message};}
    }
    window.addEventListener('launchpad:plan-state',snapshot);window.addEventListener('launchpad:add-reviewed',add);window.addEventListener('launchpad:set-reviewed-progress',progress);
    window.dispatchEvent(new CustomEvent('launchpad:plan-updated',{detail:state}));
    return()=>{window.removeEventListener('launchpad:plan-state',snapshot);window.removeEventListener('launchpad:add-reviewed',add);window.removeEventListener('launchpad:set-reviewed-progress',progress);};
  });
}
