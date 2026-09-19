import {chooseRecording,validateBroadcastCatalog} from './broadcasts.js';

export function mountListening(container,radioId,{volume,onVolume,onPower}) {
  const abort=new AbortController();
  let catalog,current,powered=false,disposed=false,playAttempt=0;
  const query=selector=>container.querySelector(selector);
  const audio=query('audio'),power=query('[data-player="power"]'),next=query('[data-player="next"]');
  const status=query('#playback-status'),title=query('#recording-title'),date=query('#recording-date'),source=query('#recording-source');
  const volumeSlider=query('#volume');
  audio.volume=volume;
  volumeSlider.value=volume;
  const listen=(element,event,handler)=>element.addEventListener(event,handler,{signal:abort.signal});
  function updatePower(on){powered=on;power.setAttribute('aria-pressed',String(on));power.textContent=on?'Power off':'Power on';audio.controls=on;onPower(on)}
  function selectRecording(){
    current=chooseRecording(catalog,{previousId:current?.id});
    if(!current){status.textContent='No recordings are available for this radio.';power.disabled=next.disabled=true;return false}
    playAttempt++;
    audio.pause();audio.src=current.audioUrl;
    title.textContent=current.title;
    date.textContent=new Date(current.date+'T12:00:00Z').toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
    query('#recording-speaker').textContent=current.speaker;
    source.href=current.sourceUrl;source.textContent=`Recording & context · ${current.sourceName} ↗`;source.hidden=false;
    status.textContent='The radio is switched off.';
    return true;
  }
  async function play(){
    const attempt=++playAttempt;
    status.textContent='Loading recording…';
    updatePower(true);
    let timeout;
    try{
      // Called directly from taps, preserving iOS media-playback activation.
      await Promise.race([audio.play(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Archive timeout')),15000)})]);
      if(disposed||attempt!==playAttempt)return;
      status.textContent='Playing historical recording.';
    }catch{
      if(disposed||attempt!==playAttempt)return;
      audio.pause();updatePower(false);
      status.textContent='This recording could not play. Try Power on again, choose another recording, or open the source link.';
    }finally{clearTimeout(timeout)}
  }
  listen(power,'click',()=>{if(powered){playAttempt++;audio.pause();updatePower(false);status.textContent='The radio is switched off.'}else void play()});
  listen(next,'click',()=>{const resume=powered;if(selectRecording()){if(resume)void play();else updatePower(false)}});
  listen(volumeSlider,'input',()=>{audio.volume=Number(volumeSlider.value);onVolume(audio.volume)});
  listen(audio,'ended',()=>{if(powered&&selectRecording())void play()});
  listen(audio,'playing',()=>{if(powered)status.textContent='Playing historical recording.'});
  listen(audio,'pause',()=>{if(powered&&!audio.ended)status.textContent='Playback paused.'});
  listen(audio,'error',()=>{if(!disposed&&current){playAttempt++;updatePower(false);status.textContent='The archive recording is unavailable. Choose another recording or open the source link.'}});
  async function load(){
    power.disabled=next.disabled=true;query('[data-player="retry"]').hidden=true;
    status.textContent='Loading recording catalog…';
    try{
      const response=await fetch(new URL(`../public/broadcasts/${radioId}.json`,import.meta.url),{signal:abort.signal});
      if(!response.ok)throw new Error('Catalog unavailable');
      catalog=validateBroadcastCatalog(await response.json(),radioId);
      if(disposed)return;
      query('#catalog-note').textContent=`${catalog.recordings.length} recordings · ${catalog.period.startYear}–${catalog.period.endYear}. Selection favors recordings from months near ${new Date().toLocaleDateString(undefined,{month:'long'})}.`;
      if(selectRecording())power.disabled=next.disabled=false;
    }catch(error){if(disposed||error.name==='AbortError')return;status.textContent='The recording catalog could not load.';query('[data-player="retry"]').hidden=false}
  }
  listen(query('[data-player="retry"]'),'click',load);
  void load();
  return ()=>{disposed=true;playAttempt++;abort.abort();audio.pause();audio.removeAttribute('src');audio.load()};
}
