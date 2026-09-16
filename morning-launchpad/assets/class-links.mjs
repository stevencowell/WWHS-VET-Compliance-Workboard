// Steve's class destinations. Review the engineering unit schedule for 2027.
const site = (path,label) => ({url:'https://stevencowell.github.io/'+path+'/',label});
const construction=site('Construction-Supplementary-material','Construction resources');
const timber=site('folding-chair-guided-course','Folding Chair');
const classroom={url:'https://classroom.google.com/',label:'Google Classroom'};
const links={
 '8SCIC':site('Year-8-Science-Guided-Course','Year 8 Science'),
 '10WOTE1':timber,'10WOTE2':timber,
 '11COV1':construction,'12COV':construction,
 '11MAV1':site('Manufacturing','Manufacturing resources'),
 '9TLCM1':classroom,'12TLC1':classroom
};
export function classLink(title,date){
 const code=String(title).split(':')[0].trim();
 if(code==='9ENSE1'){
  const next=String(date)>='2026-10-13';
  return {url:'https://stevencowell.github.io/Engineering-Website/year9_term'+(next?'4':'3')+'.html',label:next?'Lolly Dispenser':'Hydraulic Digger'};
 }
 return links[code]||null;
}
