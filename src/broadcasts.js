export function monthDistance(a,b) {
  const difference=Math.abs(a-b);
  return Math.min(difference,12-difference);
}
export function validateBroadcastCatalog(data,radioId) {
  if(data?.schemaVersion!==1||data.radioId!==radioId)throw new Error('Invalid radio recording catalog.');
  const {startYear,endYear}=data.period||{};
  if(!Number.isInteger(startYear)||!Number.isInteger(endYear)||startYear>endYear)throw new Error('Invalid listening period.');
  const weights=data.selection?.monthDistanceWeights;
  if(!Array.isArray(weights)||weights.length!==7||weights.some(w=>!Number.isFinite(w)||w<=0))throw new Error('Invalid month weights.');
  if(!Array.isArray(data.recordings))throw new Error('Recordings must be an array.');
  const ids=new Set();
  for(const recording of data.recordings){
    const date=new Date(recording.date+'T12:00:00Z');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(recording.date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==recording.date||date.getUTCFullYear()<startYear||date.getUTCFullYear()>endYear)throw new Error('Recording outside its historical period or invalid date.');
    if(!recording.id||ids.has(recording.id)||!recording.title||!recording.speaker||!recording.sourceName)throw new Error('Invalid recording metadata.');
    for(const key of ['audioUrl','sourceUrl'])if(new URL(recording[key]).protocol!=='https:')throw new Error('Recordings require HTTPS source URLs.');
    if(!Number.isFinite(recording.baseWeight)||recording.baseWeight<=0)throw new Error('Invalid recording weight.');
    ids.add(recording.id);
  }
  return data;
}
export function chooseRecording(catalog,{now=new Date(),previousId=null,random=Math.random}={}) {
  let candidates=catalog.recordings.filter(recording=>recording.id!==previousId);
  if(!candidates.length)candidates=catalog.recordings;
  if(!candidates.length)return null;
  const weights=candidates.map(recording=>recording.baseWeight*catalog.selection.monthDistanceWeights[monthDistance(Number(recording.date.slice(5,7))-1,now.getMonth())]);
  let cursor=Math.max(0,Math.min(1,random()))*weights.reduce((a,b)=>a+b,0);
  for(let index=0;index<candidates.length;index++){cursor-=weights[index];if(cursor<0)return candidates[index]}
  return candidates[candidates.length-1];
}
