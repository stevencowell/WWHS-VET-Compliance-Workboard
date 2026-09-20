// Publish selected task/source metadata only. Original source files stay local.
import {readFile, writeFile} from 'node:fs/promises';
import {orderTasks} from '../task-sources/model.mjs?v=plain-language-1';

if (!process.argv[2]) throw new Error('Supply the reviewed local audit JSON path.');
const audit = JSON.parse(await readFile(process.argv[2], 'utf8'));
const findingLabels = JSON.parse(await readFile(new URL('./task-source-finding-labels.json',import.meta.url),'utf8'));
const pick = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key,value[key]]));
const publicData = pick(audit, ['title','checkedAt','counts','scope','method','watch','published2027']);
publicData.rows = orderTasks(audit.rows.map(row => ({
  ...pick(row, ['id','rowKey','wing','title','phase','phaseLabel','sequence','timing2026','due2026','milestones2026','sourceIds','provenanceStatus','sourceBasis','sourceGap','nextYearCheck','checkWhen']),
  evidenceRefs: row.evidenceRefs.map(source => pick(source, ['id','title','locator','url','relationship','verification','statusNote']))
})));
publicData.sources = audit.sources.map(source => ({
  ...pick(source, ['id','title','group','countingUnit','taskCount','url','verification','status2027','nextYearCheck','checkWhen','liveVerification','currentEdition']),
  nextYearCheck: source.nextYearCheck || source.whereToCheck2027 || 'Locate the current approved equivalent before use.',
  verification: source.verification || source.liveVerification || 'Original supporting document still needs checking.'
}));
const findingTasks = {'TAS-F02':['t4-year10-report-chain'],'TAS-F03':['t4-year11-report-chain','t4-year10-report-chain'],'TAS-F04':['t1-nesa-disability-provisions'],'TAS-F05':['student-review-cycle'],'TAS-F08':['source-sharing-review'],'TAS-F10':['t4-year10-report-chain'],'TAS-F11':['t4-enrichment']};
publicData.findings = audit.findings.map(finding => ({
  ...pick(finding, ['id','wing','title','issue','action','taskIds','sourceUrl','certainty']),
  title: findingLabels[finding.id]?.title || finding.title || finding.issue,
  issue: findingLabels[finding.id]?.issue || finding.issue,
  taskIds: finding.taskIds?.length ? finding.taskIds : (findingTasks[finding.id] || []),
  evidence: finding.evidence || finding.locator || '',
  action: finding.action || finding.recommendation || 'Confirm the current source and the applicable school responsibility.'
}));
const publicWording = (_key, value) => typeof value === 'string' ? value
  .replaceAll('Fresh authenticated school calendar corroboration supplied by parent agent; calendar 29 display, stored calendar 17 Deputy Diary', 'School calendar checked while signed in on 17 September 2026. Calendar 29 is the Staff School Calendar; the stored calendar 17 link opens the Deputy’s Diary.')
  .replaceAll('Parent freshly read authenticated calendar 17 September 2026 and supplied observed dates.', 'School calendar read while signed in on 17 September 2026; the dates shown were checked.')
  .replaceAll('Primary workbook read in this audit; parallel agent confirmed fresh official download has identical SHA-256 on17September2026.', 'Workbook read and confirmed to match the official download on 17 September 2026.')
  .replaceAll('Original workbook content read; parallel public-source agent downloaded the live official copy on 17 September 2026 and confirmed identical SHA-256.', 'Workbook read and confirmed to match the official download on 17 September 2026.')
  .replaceAll('Exact rows read locally 17 September 2026; companion agent refreshed official download this turn and matched SHA-256 36d7eba55b75b7fd1f34bea778c6ffa141ada8f1bc72d3f42a83a4b0648b7d1a', 'The cited rows were read and confirmed to match the official workbook downloaded on 17 September 2026.')
  .replaceAll('Companion public-source agent freshly verified current 2026 table 17 September 2026: HSC results 16 December 2026', 'The official 2026 dates table was checked on 17 September 2026: HSC results, 16 December 2026.')
  .replaceAll('Historical repository mapping only; authenticated/original source not read in this audit', 'Earlier app reference only; the original supporting passage has not been checked for this task.')
  .replaceAll('Repository metadata only; not original-source verification', 'Earlier app reference only; the original source still needs checking.')
  .replaceAll('Original 26 August permission-audit evidence not located; current sharing has not been tested by this subtask.', 'The original 26 August sharing-review evidence was not located. Current sharing permissions still need checking.')
  .replaceAll('Guide A2 freshly read; plan itself not freshly opened in this subtask; approved version/sign-off unconfirmed', 'Guide section A2 was read. The plan itself still needs checking, including its approved version and sign-off.')
  .replaceAll('Other AMP/wellbeing/assembly labels were not individually confirmed in the parent summary.', 'Other AMP, wellbeing and assembly entries were not individually confirmed in the calendar check.')
  .replaceAll('Other intermediate AMP/wellbeing/assembly labels were not individually confirmed in the parent summary.', 'Other intermediate AMP, wellbeing and assembly entries were not individually confirmed in the calendar check.')
  .replaceAll('This grouped task/event was not individually confirmed in the parent fresh-calendar observation summary.', 'This grouped task or event was not individually confirmed in the latest calendar check.')
  .replaceAll('Parent read the current calendar; this particular event or all grouped milestones were not individually confirmed in the supplied observation summary. Retain historical mapping until checked.', 'The current calendar was read, but this event or all of its grouped milestones were not individually confirmed. Keep the earlier source reference until they are checked.')
  .replaceAll('Current task destination points to calendar 17, which the parent authenticated check identified as Deputy Diary. Staff School Calendar is calendar 29.', 'The current task link opens calendar 17, confirmed while signed in as the Deputy’s Diary. The Staff School Calendar is calendar 29.')
  .replaceAll('School-authenticated DOCX export read 17 September 2026; section content predominantly labelled updated 2025 and includes older references', 'The school guide was read while signed in on 17 September 2026. Most sections are labelled updated 2025 and include older references.')
  .replaceAll('Authenticated DOCX export read 17 September 2026, relevant E–I sections; mixed historical content, mostly labelled updated2025', 'The school guide’s relevant E–I sections were read on 17 September 2026. They contain historical material, mostly labelled updated 2025.')
  .replaceAll('fresh authenticated Google Docs export read 17 September 2026; most A–D rows labelled updated 2025', 'The school guide’s A–D sections were read while signed in on 17 September 2026. Most entries are labelled updated 2025.')
  .replaceAll('Authenticated school Drive copy exported and read 17 September 2026.', 'School Drive copy read while signed in on 17 September 2026.')
  .replaceAll('no version/date footer found in this export.', 'no version or date footer was found in the copy reviewed.')
  .replaceAll('Controlled-library version parity not independently verified.', 'A match to the latest controlled-library version has not been independently confirmed.')
  .replaceAll('on17September2026.', 'on 17 September 2026.') : value;
const serialised = JSON.stringify(publicData,publicWording,2) + '\n';
if (/"(?:localPath|localCopy|publicCheck|correctionsRaw|repositoryLocator|codeLocator)"|\b[A-Z]:[\\/]|AppData[\\/]/i.test(serialised)) throw new Error('Private audit metadata detected in public output.');
if (publicData.rows.length !== 126 || new Set(publicData.rows.map(row=>row.rowKey)).size !== 126) throw new Error('Task inventory does not reconcile.');
await writeFile(new URL('../task-sources/data.json?v=plain-language-1',import.meta.url),serialised);
console.log(`Exported ${publicData.rows.length} tasks and ${publicData.sources.length} source records; original files and local audit metadata excluded.`);
