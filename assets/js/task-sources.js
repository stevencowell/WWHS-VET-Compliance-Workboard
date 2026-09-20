(function(root){
  'use strict';
  const catalogue=root.WWHS_TASK_SOURCE_DATA || {rows:{},sources:{}};
  const aliases={'NESA-TOA':'NESA-TOA-2026-MAY','NESA-TOA-2026':'NESA-TOA-2026-MAY','WWHS-USI-PROCEDURE':'WWHS-USI-LOCAL','WWHS-NESA-CHECKS':'WWHS-NESA-CHECKS-SOP-2025','PUBLIC-NESA-TOA':'NESA-TOA-2026-MAY','PUBLIC-NESA-BEC-APPLICATION':'NESA-BEC-APPLICATION','PUBLIC-ACE-14-2':'NESA-VET-ENTRIES'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safe=url=>{try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?url:'';}catch{return '';}};
  const isFuture=task=>Number(task?.operatingYear)>2026 || /^2027-/.test(task?.id||'');
  const idFor=id=>aliases[id] || id;
  function rowFor(wing,task){return catalogue.rows[`${wing.toUpperCase()}:${task?.canonicalTaskId || task?.id}`] || null;}
  function kind(ref){
    if(ref.linkKind)return ref.linkKind;
    const url=ref.url||'';
    if(!safe(url))return 'unresolved';
    if(/\/drive\/search\?/.test(url))return 'search';
    if(/\/drive\/folders\//.test(url))return 'folder';
    if(/\/drive\/shared-drives|apps\.powerapps\.com|schoolsonline\.html|evidencecentral\.info|myvetworkplace|evet\/login|selfservice\.det/.test(url))return 'portal';
    // Several legacy audit records name a form but only locate a guide that
    // describes it. Never label that guide as the actual instrument.
    if(url.includes('/1iGNJzqizAqWO0PuSRDXh0QPc0L8y_wdiyEk88O7f680/') && ref.id!=='WWHS-HT-DOC')return 'guide';
    if(/docs\.google\.com|drive\.google\.com\/file\/|\.(pdf|docx?|xlsx?)(?:$|[?#])/.test(url))return 'document';
    if(/\/webcal\/calendar\//.test(url))return 'calendar';
    if(/(?:compact\.org\.au\/?$|education\.nsw\.gov\.au\/staff|classroom\.google\.com)/.test(url))return 'portal';
    return 'page';
  }
  function source(id,fallback={},options={}){
    const matched=catalogue.sources[idFor(id)];
    // The 2027 model deliberately uses current-edition discovery routes.
    if(options.currentCycle && ['NESA-TOA','RTO-DOCUMENT-LIBRARY','VET-SCHOOLS-HUB','WWHS-VET-SHARED'].includes(id))return {...fallback,id,url:safe(fallback.url),linkKind:kind({...fallback,id})};
    const combined={...fallback,...matched,id:idFor(id),url:safe(matched?.url || fallback.url)};
    return {...combined,linkKind:kind(combined)};
  }
  function refsFor(wing,task,extra=[]){
    const row=rowFor(wing,task), future=isFuture(task);
    const current=extra.map(ref=>source(ref.id,ref,{currentCycle:future}));
    const historical=(row?.evidenceRefs || []).map(ref=>{
      const base=source(ref.id,ref);
      // Task-specific passage locations must survive catalogue URL upgrades.
      return {...base,locator:ref.locator||base.locator,relationship:ref.relationship||base.relationship,statusNote:ref.statusNote||base.statusNote,verification:base.verification||ref.verification};
    });
    const passageKeys=new Set(historical.map(ref=>`${ref.id}:${ref.url}`));
    const additional=current.filter(ref=>!passageKeys.has(`${ref.id}:${ref.url}`));
    const refs=[...(future?additional:historical),...(future?historical:additional)];
    if(wing.toLowerCase()==='tas' && !refs.some(ref=>safe(ref.url))){
      // Local review controls can use their maintained school access routes
      // without presenting those routes as an externally mandated requirement.
      refs.push(...(task.systemIds||[]).map(id=>root.HT_TAS_WORKBOARD?.systems.find(system=>system.id===id)).filter(Boolean).map(system=>({id:system.id,title:system.label,url:safe(system.url),locator:'Where to carry out this check',accessNote:system.note||''})));
    }
    const unique=new Map();
    for(const ref of refs){
      const key=`${ref.id}:${ref.url}`;
      const previous=unique.get(key);
      if(!previous){unique.set(key,{...ref});continue;}
      for(const field of ['locator','relationship']){
        const values=[...new Set([previous[field],ref[field]].filter(Boolean))];
        previous[field]=values.join(' · ');
      }
    }
    return [...unique.values()].map(ref=>({...ref,baseline:future && /202[56]|2025[–-]2026/.test([ref.id,ref.title].join(' '))}));
  }
  const labels={document:'Open document',page:'Open source page',calendar:'Open calendar',guide:'Open related guide',folder:'Open folder',portal:'Open staff system',search:'Search for source',unresolved:'Source link to confirm'};
  function location(ref){
    return String(ref.locator||'').replace(/;?\s*(?:paragraphs?|table)?\s*\d[\d–\-, ]*\s*\(paragraph (?:indices|numbers)[^)]*\)/gi,'').replace(/\s*Historical mapping:.*$/i,'').replace(/; no original page\/section recovered\.?/i,'; exact passage not yet located').trim();
  }
  function referenceHtml(ref){
    const type=kind(ref), url=safe(ref.url);
    const title=ref.linkTitle || (type==='guide'?'Head Teacher reference guide':ref.title || ref.id);
    const hint=ref.accessNote || (type==='search'?'The exact file has not been located. This opens a search.':type==='portal'?'Staff sign-in required. The exact document or record must be selected inside this system.':type==='folder'?'Opens the named folder; select the current document inside.':type==='guide'?'This guide describes the process. The separately named form or register has not yet been linked.':/google\.com/.test(url)?'School-held document; your authorised work account may be required.':'');
    return `<li class="task-source-item" data-source-id="${esc(ref.id)}" data-source-kind="${esc(type)}"><span class="task-source-kind">${esc(labels[type]||labels.page)}${ref.baseline?' · 2026 background':''}</span>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} <span aria-hidden="true">↗</span></a>`:`<strong>${esc(title)}</strong>`}${location(ref)?`<p><strong>Look for:</strong> ${esc(location(ref))}</p>`:''}${hint?`<small>${esc(hint)}</small>`:''}${ref.verification?`<details class="source-verification"><summary>Source and version check</summary><p>${esc(ref.verification)}</p></details>`:''}</li>`;
  }
  function panel(wing,task,extra=[]){
    const row=rowFor(wing,task),future=isFuture(task),refs=refsFor(wing,task,extra);
    const rank={document:0,page:1,calendar:2,guide:3,folder:4,portal:5,search:6,unresolved:7};
    refs.sort((a,b)=>(a.id===row?.quoteSourceId?-1:b.id===row?.quoteSourceId?1:(rank[kind(a)]??8)-(rank[kind(b)]??8)));
    const direct=refs.filter(ref=>['document','page','calendar'].includes(kind(ref))),other=refs.filter(ref=>!direct.includes(ref));
    const primary=direct.slice(0,3), remainder=[...direct.slice(3),...other];
    if(!primary.length && remainder.length)primary.push(...remainder.splice(0,2));
    const label=future?'2027 planning task':row?.provenanceStatus==='inferred-local-control'?'Local workboard check':row?.provenanceStatus==='specific-citation'?'Source passage located':'Exact requirement still to confirm';
    const basis=row?.sourceQuote && !future?`<div class="task-source-quote"><strong>Original source wording</strong><blockquote>${esc(row.sourceQuote)}</blockquote></div>`:row?.sourceBasis?`<p class="task-source-basis"><strong>${future?'Background to this task':'Source summary'}:</strong> ${esc(row.sourceBasis)}</p>`:`<p>This checklist helps you plan the work. Check the sources below; they have not been confirmed to require this exact checklist.</p>`;
    const auditUrl=`${wing.toLowerCase()==='tas'?'../':'./'}task-sources/?wing=${wing.toLowerCase()}${row?'&task='+encodeURIComponent(row.id):'#sources'}`;
    return `<section class="task-source-panel" aria-label="Task sources" data-source-task="${esc(task?.id)}"><div class="task-source-heading"><h3>Task sources</h3><span>${esc(label)}</span></div>${basis}${future?'<p class="task-source-year">The 2026 documents are background only. Confirm the current 2027 guide and deadlines before acting.</p>':''}<ul class="task-source-links">${primary.map(referenceHtml).join('')}</ul>${remainder.length?`<details class="task-source-more"><summary>More sources and links (${remainder.length})</summary><ul class="task-source-links">${remainder.map(referenceHtml).join('')}</ul></details>`:''}${!refs.length?'<p>A source document has not yet been found for this task.</p>':''}<p class="task-source-checklist-note">The checklist below is practical workboard guidance, not a quotation from the source.</p><a class="task-source-audit" href="${auditUrl}" target="_blank" rel="noopener noreferrer">View source details and checks still needed ↗</a></section>`;
  }
  function directory(ids){return `<ul class="task-source-links">${ids.map(id=>source(id)).filter(ref=>ref.title).map(referenceHtml).join('')}</ul>`;}
  function publicLinks(wing,task){return refsFor(wing,task).filter(ref=>safe(ref.url)).map(ref=>({label:String(ref.linkTitle||ref.title||ref.id).slice(0,300),url:ref.url}));}
  root.WWHS_TASK_SOURCES=Object.freeze({rowFor,kind,source,refsFor,panel,directory,referenceHtml,publicLinks});
})(typeof window==='object'?window:globalThis);
