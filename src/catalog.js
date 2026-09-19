export const collections = [
  {id:'favorites',name:'Favorites'},
  {id:'personal',name:'Personal'},
  {id:'highlighted',name:'Highlighted'},
];
export const historicalAttributes=['manufacturer','year','era','type'];
export const organizationOptions=['all','collections',...historicalAttributes,...collections.map(c=>c.id)];
export const catalog = {
  'rca-ggie-1939': {
    id:'rca-ggie-1939', model:'ggie-radio', name:'Golden Gate International Exposition', shortName:'RCA Victor · GGIE', manufacturer:'RCA Victor', year:1939, era:'Pre-war', type:'Tabletop',
    description:'This RCA Victor tabletop radio commemorates the 1939 Golden Gate International Exposition, held on Treasure Island in San Francisco Bay. Its sculpted front depicts the exposition’s architecture and the Golden Gate Bridge.',
    modelNote:'This Object Studio model is a photo-based interpretation. Details and control calibration are approximate.',
    resources:[{label:'Explore the model in Object Studio',url:'https://jasonsperske.github.io/object_studio/'},{label:'California Historical Radio Society',url:'https://californiahistoricalradio.com/'}]
  }
};
// getRandomValues works on HTTP LAN previews as well as HTTPS. randomUUID
// requires a secure context and is unavailable on some older iOS versions.
export function createRadioId(randomSource=globalThis.crypto) {
  const bytes=randomSource.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&0x0f)|0x40;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0'));
  return [hex.slice(0,4),hex.slice(4,6),hex.slice(6,8),hex.slice(8,10),hex.slice(10)].map(part=>part.join('')).join('-');
}
export function normalizeRadio(input, now=Date.now()) {
  if(input?.id!==undefined&&(typeof input.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(input.id)))throw new Error('Invalid radio identifier.');
  if (!input || !catalog[input.catalogId]) throw new Error('Unknown radio model.');
  const memberships={};
  if(collections.some(c=>c.id===input.section))memberships[input.section]=now;
  return {id:input.id || createRadioId(), catalogId:input.catalogId, schemaVersion:2, memberships, personal:null, addedAt:now, isNew:true, restored:false};
}
export function migrateRadio(record) {
  if(record.schemaVersion===2)return record;
  const {section,...rest}=record;
  const memberships={};
  if(collections.some(c=>c.id===section))memberships[section]=record.addedAt;
  return {...rest,schemaVersion:2,memberships,personal:record.personal||null};
}
export function updateMembership(radio,collection,enabled,now=Date.now()) {
  if(!collections.some(c=>c.id===collection))throw new Error('Unknown personal collection.');
  const memberships={...radio.memberships};
  if(enabled){if(!Object.prototype.hasOwnProperty.call(memberships,collection))memberships[collection]=now;}
  else delete memberships[collection];
  return {...radio,memberships};
}
export function validatePersonal(input,currentYear=new Date().getFullYear()) {
  if(!['owned','used','owned-used'].includes(input.relationship))throw new Error('Choose whether you owned or used this radio.');
  const year=value=>{
    if(value===''||value===null||value===undefined)return null;
    const number=Number(value);
    if(!Number.isInteger(number)||number<1800||number>currentYear)throw new Error(`Enter years between 1800 and ${currentYear}.`);
    return number;
  };
  const startYear=year(input.startYear),ongoing=Boolean(input.ongoing),endYear=ongoing?null:year(input.endYear);
  if(startYear!==null&&endYear!==null&&startYear>endYear)throw new Error('The end year must be the same as or later than the start year.');
  const note=String(input.note||'').trim();
  if(note.length>500)throw new Error('Keep the personal note to 500 characters.');
  return {relationship:input.relationship,startYear,endYear,ongoing,note};
}
export function personalCaption(radio) {
  if(radio.memberships?.personal===undefined)return '';
  const info=radio.personal;
  if(!info)return 'Personal · dates not recorded';
  const label={owned:'Owned',used:'Used','owned-used':'Owned & used'}[info.relationship];
  const {startYear:start,endYear:end,ongoing}=info;
  const period=ongoing?(start?`${start}–present`:'Current'):(start&&end?(start===end?`${start}`:`${start}–${end}`):start?`From ${start}`:end?`Until ${end}`:'Dates not recorded');
  return `${label} · ${period}`;
}
export function buildShelfGroups(radios,organization='all',records=catalog) {
  const newest=(a,b)=>b.addedAt-a.addedAt||a.id.localeCompare(b.id);
  let groups;
  if(historicalAttributes.includes(organization)){
    const values=[...new Set(radios.map(r=>String(records[r.catalogId][organization])))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
    groups=values.map(value=>({id:value,name:value,radios:radios.filter(r=>String(records[r.catalogId][organization])===value).sort(newest)}));
  }else if(organization==='collections'||collections.some(c=>c.id===organization)){
    groups=collections.filter(c=>organization==='collections'||c.id===organization).map(c=>({...c,radios:radios.filter(r=>r.memberships?.[c.id]!==undefined).sort((a,b)=>b.memberships[c.id]-a.memberships[c.id]||newest(a,b))}));
  }else groups=[{id:'all',name:'All radios',radios:[...radios].sort(newest)}];
  let rowY=0;
  for(let i=0;i<groups.length;i+=3){
    const row=groups.slice(i,i+3);
    row.forEach((group,column)=>{group.x=column;group.y=-rowY});
    rowY+=Math.max(1,...row.map(g=>Math.ceil(g.radios.length/3)));
  }
  return groups;
}
