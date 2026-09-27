import {mountListening} from './listening.js';
import {RoomScene,radioParams} from './scene.js';
import {layoutCollection,TILE_W,TILE_H} from './shelf-layout.js';
import {parseRoute,routePath} from './routes.js';
import {read,write,remove} from './db.js';
import {collections,historicalAttributes,organizationOptions,catalog,mergeBookmarks,updateMembership,validatePersonal,personalCaption,buildShelfGroups} from './catalog.js';
const icons={radio:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M7 11v6m3-6v6m3-6v6m3-5h2M7 7l11-4"/><circle cx="17" cy="17" r="1"/>',shelf:'<path d="M4 4v16m16-16v16M4 9h16M4 18h16M7 5v4m4-4v4m5-4v4M7 13v5m5-5v5m5-5v5"/>',tool:'<path d="M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 4-4-4 4-4Z"/>',listen:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7Zm16 0h2v7h-5v-7Z"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',star:'<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',home:'<path d="m3 10 9-7 9 7M5 9v12h14V9m-10 12v-7h6v7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',move:'<path d="M12 3v18M3 12h18m-6-6-3-3-3 3m6 12-3 3-3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'};
const icon=(name)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.radio}</svg>`;
const app=document.querySelector('#app');
// The site's base directory: this module lives in <base>/src/.
const BASE=new URL('../',import.meta.url).pathname;
const routeURL=route=>BASE+routePath(route)+location.search;
let state={view:'welcome',started:false,radios:[],activeSection:'all',organization:'all',pan:{x:0,y:0},zoom:1,radioId:'rca-ggie-1939',radioMode:'about',volume:.45};
let scene, saveTimer, listeningCleanup, storageOK=true;
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(el.timer);el.timer=setTimeout(()=>el.classList.remove('visible'),4500)}
async function persist(){try{await write('preferences',{started:state.started,pan:state.pan,zoom:state.zoom,organization:state.organization,activeSection:state.activeSection,volume:state.volume,radioId:state.radioId},'room')}catch{storageOK=false;toast('Your browser could not save this visit. Changes will last until you close this page.')}}
function scheduleSave(){clearTimeout(saveTimer);void persist()}
function layout(){app.innerHTML=`
<header class="topbar"><button class="brand" aria-label="The Radio Room home" data-action="welcome"><span class="brand-mark">${icon('radio')}</span><span>THE RADIO ROOM<small>CALIFORNIA HISTORICAL RADIO SOCIETY</small></span></button><nav aria-label="Room navigation"><button data-view="collection">${icon('shelf')}<span>Collection</span></button><button disabled title="Workbench is not available in this version">${icon('tool')}<span>Workbench · coming soon</span></button><button data-view="listening">${icon('listen')}<span>Listening corner</span></button></nav><span class="edition">HISTORICAL RADIOS <span>INTERACTIVE COLLECTION</span></span></header>
<main id="main"></main><div id="toast" role="status"></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog>
<footer class="footer"><span>California Historical Radio Society</span><span class="footer-right"><span class="tiny-dot"></span> ${storageOK?'Your collection stays on this device':'Storage unavailable'}<a href="https://californiahistoricalradio.com/" target="_blank" rel="noopener noreferrer">Visit CHRS ↗</a></span></footer>`;
app.addEventListener('click',handleClick);
app.addEventListener('change',handleCollectionChange);
app.addEventListener('submit',savePersonalDetails);
renderView();}
function clearScene(){listeningCleanup?.();listeningCleanup=null;document.querySelector('audio')?.pause();scene?.dispose();scene=null}
// The listening corner is a mode of each radio's page; its nav entry is lit there.
function navUpdate(){document.querySelectorAll('nav [data-view]').forEach(b=>{const current=b.dataset.view==='listening'?state.view==='radio'&&state.radioMode==='listen':state.view===b.dataset.view;b.classList.toggle('active',current);if(current)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')})}
function renderView(){clearScene();navUpdate();const dialog=document.querySelector('#dialog');if(dialog?.open)dialog.close();const main=document.querySelector('#main');
if(state.view==='welcome'){
main.innerHTML=`<section class="welcome"><div class="welcome-copy"><div class="eyebrow"><span></span> HISTORICAL RADIO COLLECTION</div><h1>Explore historic<br>radios.</h1><p>Examine 3D radio models, read their histories, and bookmark the ones that matter to you. Play period recordings in each radio’s listening corner.</p><button class="primary" data-action="start">${state.started?'Return to the collection':'Browse the collection'} ${icon('arrow')}</button><div class="learn-link">Learn more about radios <span class="pill">COMING SOON</span></div></div><div class="exhibit"><div class="exhibit-glow"></div><div class="exhibit-number">FEATURED RADIO / 1939</div><div id="scene" class="hero-scene" aria-label="Interactive 3D model of a 1939 RCA Victor radio"></div><div class="exhibit-caption"><span class="caption-line"></span><div><span class="eyebrow">RCA VICTOR · 1939</span><h2>Golden Gate International Exposition</h2><p>RCA Victor commemorative tabletop radio</p></div><button class="round" data-action="preview" data-catalog="rca-ggie-1939" aria-label="About this radio">${icon('plus')}</button></div><span class="rotate-hint">↔ &nbsp; Drag to rotate the model</span></div></section><div class="welcome-bottom"><span>COLLECTION FEATURES</span><div>${icon('shelf')} Organize radios</div><div>${icon('info')} Read radio histories</div><div>${icon('listen')} Listen to historical recordings</div></div>`;
startScene('welcome');
}else if(state.view==='collection'){
main.innerHTML=`<section class="collection"><div class="collection-header"><div><div class="eyebrow">RADIO COLLECTION</div><h1>The collection <span>${state.radios.length} ${state.radios.length===1?'radio':'radios'}</span></h1></div><div class="collection-options"><label for="organize">View shelves by</label><select id="organize"><option value="all">All radios</option><optgroup label="Historical attributes"><option value="manufacturer">By manufacturer</option><option value="year">By year</option><option value="era">By era</option><option value="type">By type</option></optgroup><optgroup label="My collections"><option value="favorites">Favorites</option><option value="personal">Personal</option><option value="highlighted">Highlighted</option><option value="collections">All my collections</option></optgroup></select></div></div><div class="shelf-context"><span id="view-explanation"></span><span id="view-count"></span></div><div class="shelf-workspace"><div id="scene" class="shelf-scene" tabindex="0" role="application" aria-label="Collection shelves. Drag or scroll to explore. Arrow keys move; plus and minus zoom; Home returns to the first shelf."></div><div id="shelf-labels"></div><div class="shelf-vignette"></div><aside class="section-nav" aria-label="Jump to shelf"><span class="eyebrow">ON YOUR SHELVES</span><div id="section-buttons"></div></aside><div id="shelf-empty" class="empty-note" hidden></div><div class="explore-hint">${icon('move')} Drag to explore <span>·</span> Scroll in any direction</div><div class="view-controls"><button data-action="reset" aria-label="Return to first shelf">${icon('home')}</button><span></span><button data-action="zoom-out" aria-label="Zoom out">${icon('minus')}</button><output id="zoom-label">100%</output><button data-action="zoom-in" aria-label="Zoom in">${icon('plus')}</button></div></div></section>`;
document.querySelector('#organize').value=state.organization;document.querySelector('#organize').addEventListener('change',e=>{state.organization=e.target.value;state.pan={x:0,y:0};state.activeSection=collectionGroups()[0]?.id||'all';scene?.setPan(0,0);refreshCollection();scheduleSave()});
startScene('collection');refreshCollection();
}else renderRadio(main);
}
function startScene(mode){const container=document.querySelector('#scene');try{scene=new RoomScene(container);scene.mode=mode;scene.catalogId=featuredCatalogId(mode);scene.pan={...state.pan};scene.zoom=state.zoom;scene.onRender=positionLabels;const ownedScene=scene;scene.init().then(()=>{if(scene!==ownedScene)return;if(mode==='collection')refreshCollection();}).catch(()=>{if(scene===ownedScene)sceneFallback(container)});bindGestures(container)}catch{sceneFallback(container)}}
function featuredCatalogId(mode){return mode==='welcome'?'rca-ggie-1939':state.radioId}
function sceneFallback(container){container.innerHTML='<div class="scene-error">The 3D room couldn’t open.<br><span>Try a browser with WebGL enabled. You can still use the collection list.</span></div>';toast('The 3D view is unavailable on this browser.')}
function collectionGroups(){return buildShelfGroups(state.radios,state.organization)}
function members(group){return group.radios}
function refreshCollection(){if(state.view!=='collection')return;const groups=collectionGroups();updateShelfExplanation(groups);document.querySelector('#section-buttons').innerHTML=groups.map(s=>`<button data-section="${escapeHTML(s.id)}" class="${state.activeSection===s.id?'selected':''}">${s.id==='favorites'?icon('star'):''}${escapeHTML(s.name)}<span>${members(s).length}</span></button>`).join('');
const labels=[];const layout=layoutCollection(groups);
for(const s of groups)labels.push(`<div class="shelf-label" data-x="${s.x*TILE_W}" data-y="${s.y*TILE_H+510}"><span>${escapeHTML(s.name)}</span><small>${members(s).length?`${members(s).length} ${members(s).length===1?'radio':'radios'}`:'No radios on this shelf'}</small></div>`);
for(const {radio:r,x,floorY,width} of layout.cells){labels.push(`<button class="radio-hotspot ${r.memberships?.personal!==undefined?'personal-radio':''}" data-radio="${r.id}" data-x="${x}" data-y="${floorY+76}" data-width="${width}" aria-label="Inspect ${escapeHTML(catalog[r.catalogId].shortName)}"><span class="radio-badges">${r.memberships?.highlighted!==undefined?'<span class="new-badge">HIGHLIGHTED</span>':''}${r.memberships?.favorites!==undefined?'<span class="favorite-badge" aria-label="Favorite">★</span>':''}</span><span>${escapeHTML(catalog[r.catalogId].shortName)}${personalCaption(r)?`<small>${escapeHTML(personalCaption(r))}</small>`:''}</span></button>`)}
document.querySelector('#shelf-labels').innerHTML=labels.join('');scene?.setLayout(layout);positionLabels();}
function positionLabels(){if(state.view!=='collection'||!scene)return;document.querySelectorAll('[data-x]').forEach(el=>{const p=scene.project(Number(el.dataset.x),Number(el.dataset.y));el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,0)`;if(el.classList.contains('radio-hotspot')){const neighbor=scene.project(Number(el.dataset.x)+Number(el.dataset.width),Number(el.dataset.y));el.style.width=`${Math.max(75,Math.min(160,Math.abs(neighbor.x-p.x)-12))}px`;}el.hidden=p.x<0||p.x>scene.container.clientWidth||p.y<0||p.y>scene.container.clientHeight});const out=document.querySelector('#zoom-label');if(out)out.textContent=`${Math.round(scene.zoom*100)}%`}
function bindGestures(el){let drag=null;el.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);el.classList.add('dragging')});el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};if(state.view==='collection'){const scale=2.5/scene.zoom;state.pan.x-=dx*scale;state.pan.y+=dy*scale;scene.setPan(state.pan.x,state.pan.y);scheduleSave()}else scene?.rotate(dx*.009)});const end=()=>{drag=null;el.classList.remove('dragging')};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);el.addEventListener('wheel',e=>{if(state.view!=='collection')return;e.preventDefault();if(e.ctrlKey){zoom(-e.deltaY*.004);return}const factor=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1;state.pan.x+=(e.shiftKey?e.deltaY:e.deltaX)*factor*1.5/scene.zoom;state.pan.y-=(e.shiftKey?0:e.deltaY)*factor*1.5/scene.zoom;scene.setPan(state.pan.x,state.pan.y);scheduleSave()},{passive:false});el.addEventListener('keydown',e=>{const moves={ArrowLeft:[-180,0],ArrowRight:[180,0],ArrowUp:[0,180],ArrowDown:[0,-180]};if(moves[e.key]){e.preventDefault();state.pan.x+=moves[e.key][0];state.pan.y+=moves[e.key][1];scene.setPan(state.pan.x,state.pan.y);scheduleSave()}if(e.key==='Home'){e.preventDefault();jump(collectionGroups()[0]?.id)}if(e.key==='+')zoom(.1);if(e.key==='-')zoom(-.1)})}
function zoom(delta){if(!scene)return;state.zoom=Math.max(.55,Math.min(1.8,scene.zoom+delta));scene.setPan(state.pan.x,state.pan.y,state.zoom);scheduleSave()}
function jump(id){const s=collectionGroups().find(s=>s.id===id)||collectionGroups()[0];if(!s)return;state.activeSection=s.id;state.pan={x:s.x*TILE_W,y:s.y*TILE_H};scene?.setPan(state.pan.x,state.pan.y);document.querySelectorAll('[data-section]').forEach(b=>b.classList.toggle('selected',b.dataset.section===s.id));scheduleSave()}
async function navigate(view,updateRoute=true){if(view==='listening'){openRadio(state.radioId,'listen',updateRoute);return}if(view==='workbench'){view='collection';history.replaceState(null,'',routeURL({view}));updateRoute=false;}if(updateRoute)history.pushState(null,'',routeURL({view}));state.view=view;if(view==='collection'){state.started=true;await persist()}renderView();if(view==='collection')document.querySelector('#scene').focus({preventScroll:true})}
async function handleClick(e){const view=e.target.closest('[data-view]');if(view){await navigate(view.dataset.view);return}const section=e.target.closest('[data-section]');if(section){jump(section.dataset.section);return}const radio=e.target.closest('[data-radio]');if(radio){openRadio(radio.dataset.radio);return}const button=e.target.closest('[data-action]');if(!button)return;switch(button.dataset.action){case'welcome':navigate('welcome');break;case'start':navigate('collection');break;case'reset':jump(collectionGroups()[0]?.id);break;case'zoom-in':zoom(.1);break;case'zoom-out':zoom(-.1);break;case'preview':openRadio(button.dataset.catalog);break;case'mode':openRadio(state.radioId,button.dataset.mode);break;case'favorite':await setMembership('favorites',button.getAttribute('aria-pressed')!=='true');break;case'close':document.querySelector('#dialog').close();break;}}
// Each catalog radio has its own page, with an About mode and a listening
// corner mode. Its route is #radio/<catalog id>, plus /listen for listening.
function openRadio(catalogId,mode='about',updateRoute=true){if(!catalog[catalogId])catalogId='rca-ggie-1939';state.radioId=catalogId;state.radioMode=mode==='listen'?'listen':'about';if(updateRoute)history.pushState(null,'',routeURL({view:'radio',radioId:catalogId,mode:state.radioMode}));state.view='radio';renderView();scheduleSave()}
function updateShelfExplanation(groups){
  const collection=collections.find(c=>c.id===state.organization);
  document.querySelector('#view-explanation').textContent=historicalAttributes.includes(state.organization)?`Historical attributes · shelf labels show each ${state.organization}.`:state.organization==='all'?'Every radio in the collection · by release year.':state.organization==='collections'?'Independent collections · a radio can appear on more than one shelf.':`${collection.name} · most recently marked ${collection.name.toLowerCase()} first.`;
  const shown=new Set(groups.flatMap(g=>g.radios.map(r=>r.id))).size;
  document.querySelector('#view-count').textContent=`${shown} of ${state.radios.length} radios`;
  const empty=document.querySelector('#shelf-empty');empty.hidden=shown>0;
  if(!shown)empty.innerHTML=`No radios in ${collection?escapeHTML(collection.name):'these collections'} yet<p>Bookmarks are optional. Open a radio’s page to add it to Favorites, Personal or Highlighted.</p>`;
}
function membershipDate(value){return value===undefined?'Not included':`Added ${new Date(value).toLocaleDateString()}`}
function renderMemberships(item){
  const personal=item.personal||{relationship:'owned',startYear:null,endYear:null,ongoing:false,note:''};
  return `<section class="membership-panel"><h3>Bookmark this radio</h3><p>Optional. Add it to any of your collections to find it again on their shelves. Each is ordered by when you added it, newest first.</p><div class="membership-options">${collections.map(c=>`<label><input type="checkbox" aria-label="${c.name}" aria-describedby="membership-date-${c.id}" data-membership="${c.id}" ${item.memberships[c.id]!==undefined?'checked':''}/><span>${c.name}<small id="membership-date-${c.id}">${membershipDate(item.memberships[c.id])}</small></span></label>`).join('')}</div><form id="personal-details" ${item.memberships.personal===undefined?'hidden':''}><h3>Personal history</h3><p>Record when you owned or used this radio. Dates are optional and appear on its shelf label.</p><label for="personal-relationship">My connection</label><select id="personal-relationship" name="relationship">${[['owned','Owned'],['used','Used'],['owned-used','Owned and used']].map(([value,label])=>`<option value="${value}" ${personal.relationship===value?'selected':''}>${label}</option>`).join('')}</select><div class="personal-years"><label>From year<input name="startYear" type="number" inputmode="numeric" min="1800" max="${new Date().getFullYear()}" value="${personal.startYear??''}" placeholder="Unknown"/></label><label>To year<input name="endYear" type="number" inputmode="numeric" min="1800" max="${new Date().getFullYear()}" value="${personal.endYear??''}" placeholder="Unknown" ${personal.ongoing?'disabled':''}/></label></div><label class="personal-current"><input id="personal-current" name="ongoing" type="checkbox" ${personal.ongoing?'checked':''}/>I still own or use it</label><label for="personal-note">Personal note (optional)</label><textarea id="personal-note" name="note" maxlength="500" rows="3" placeholder="For example, where you used the radio.">${escapeHTML(personal.note)}</textarea><p class="personal-preview" id="personal-preview">${escapeHTML(personalCaption(item))}</p><p id="personal-error" role="alert"></p><button class="secondary" type="submit">Save personal history</button><p id="personal-save-status" role="status"></p></form></section>`;
}
async function setMembership(collection,enabled){
  const index=state.radios.findIndex(r=>r.id===state.radioId);if(index<0)return;
  const timestamp=Math.max(Date.now(),...state.radios.flatMap(r=>Object.values(r.memberships).map(t=>t+1)));
  const next=updateMembership(state.radios[index],collection,enabled,timestamp);state.radios[index]=next;
  const checkbox=document.querySelector(`[data-membership="${collection}"]`);if(checkbox)checkbox.checked=enabled;
  const date=document.querySelector(`#membership-date-${collection}`);if(date)date.textContent=membershipDate(next.memberships[collection]);
  if(collection==='favorites')document.querySelector('[data-action=favorite]')?.replaceWith(favoriteButton(next));
  if(collection==='personal'&&document.querySelector('#personal-details')){document.querySelector('#personal-details').hidden=!enabled;document.querySelector('#personal-preview').textContent=personalCaption(next);}
  try{await write('radios',next);toast(`${collections.find(c=>c.id===collection).name} updated.`)}
  catch{toast('Collection updated for this visit, but could not be saved.')}
}
async function handleCollectionChange(event){
  const input=event.target;
  if(input.id==='personal-current'){document.querySelector('[name=endYear]').disabled=input.checked;return}
  if(input.dataset.membership)await setMembership(input.dataset.membership,input.checked);
}
async function savePersonalDetails(event){
  if(event.target.id!=='personal-details')return;
  event.preventDefault();const form=event.target;
  const error=form.querySelector('#personal-error'),status=form.querySelector('#personal-save-status');error.textContent='';status.textContent='';
  const index=state.radios.findIndex(r=>r.id===state.radioId);if(index<0)return;
  let personal;try{const fields=new FormData(form);personal=validatePersonal({relationship:fields.get('relationship'),startYear:fields.get('startYear'),endYear:fields.get('endYear'),ongoing:fields.has('ongoing'),note:fields.get('note')})}catch(problem){error.textContent=problem.message;return}
  const radio={...state.radios[index],personal};state.radios[index]=radio;
  form.querySelector('#personal-preview').textContent=personalCaption(radio);
  try{await write('radios',radio);status.textContent='Personal history saved. It will appear on the shelf label.'}
  catch{error.textContent='Saved for this visit only. Browser storage is unavailable.'}
}
function favoriteButton(item){const on=item.memberships.favorites!==undefined;return Object.assign(document.createElement('template'),{innerHTML:`<button class="favorite-toggle" data-action="favorite" aria-pressed="${on}">${icon('star')} ${on?'Favorite':'Add to favorites'}</button>`}).content.firstChild}
function renderRadio(main){
  const item=state.radios.find(r=>r.id===state.radioId),data=catalog[state.radioId],listen=state.radioMode==='listen';
  const about=`<section class="historical-facts" aria-label="Historical attributes"><h3>Historical attributes</h3><dl>${historicalAttributes.map(key=>`<div><dt>${key==='year'?'Release year':key[0].toUpperCase()+key.slice(1)}</dt><dd>${escapeHTML(data[key])}</dd></div>`).join('')}</dl><p>These facts belong to the radio model.</p></section><p>${data.description}</p><div class="detail-note">${data.modelNote}</div><h3>History & resources</h3><div class="resources">${data.resources.map(r=>`<a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.label} ↗</a>`).join('')}</div>${renderMemberships(item)}`;
  const listening=`<p>Listen to broadcasts from the period when this radio was in use.</p><div class="broadcast-card"><div class="eyebrow" id="recording-date">RECORDING CATALOG</div><h3 id="recording-title">Historical broadcasts</h3><p id="recording-speaker"></p><div class="player-actions"><button class="primary" data-player="power" aria-pressed="false" disabled>Power on</button><button class="secondary" data-player="next" disabled>Another recording</button></div><label class="volume-control" for="volume">Volume <input id="volume" type="range" min="0" max="1" step=".01" value="${state.volume}" /></label><audio id="broadcast" preload="none"></audio><p id="playback-status" role="status">Loading recording catalog…</p><button class="secondary" data-player="retry" hidden>Retry loading catalog</button><a id="recording-source" target="_blank" rel="noopener noreferrer" hidden></a><p id="catalog-note" class="catalog-note"></p></div>`;
  main.innerHTML=`<section class="radio-page${listen?' listening-mode':''}"><div class="radio-page-copy"><button class="back-link" data-view="collection">← Back to the collection</button><div class="eyebrow">${escapeHTML(data.manufacturer.toUpperCase())} · ${escapeHTML(data.year)}</div><h1>${escapeHTML(data.name)}</h1><div class="radio-page-actions"></div><nav class="radio-modes" aria-label="Radio page">${[['about','About',icon('info')],['listen','Listening corner',icon('listen')]].map(([mode,label,glyph])=>`<button data-action="mode" data-mode="${mode}" ${state.radioMode===mode?'aria-current="page"':''}>${glyph} ${label}</button>`).join('')}</nav>${listen?listening:about}</div><div id="scene" class="detail-scene${listen&&data.floorStanding?' floor-stage':''}" aria-label="Interactive model of the ${escapeHTML(data.name)}. Drag to rotate."></div></section>`;
  main.querySelector('.radio-page-actions').append(favoriteButton(item));
  startScene(listen?'listening':'radio');
  if(listen)listeningCleanup=mountListening(main.querySelector('.broadcast-card'),data.id,{
    volume:state.volume,
    onVolume:volume=>{state.volume=volume;scheduleSave()},
    onPower:on=>{scene?.setRadioControls(radioParams(data.id,{on,volume:state.volume})).catch(()=>toast('The radio model could not update.'))}
  });
}
function restoreRoute(){
  const path=location.pathname.startsWith(BASE)?location.pathname.slice(BASE.length):'',route=parseRoute(path,location.hash);
  // Hash links from earlier versions move to their path.
  if(location.hash&&route.view!=='welcome')history.replaceState(null,'',routeURL(route.view==='radio'?route:{view:route.view==='unknown'?'collection':route.view}));
  if(route.view==='radio'){if(catalog[route.radioId])openRadio(route.radioId,route.mode,false);else{history.replaceState(null,'',routeURL({view:'collection'}));navigate('collection',false)}}
  else if(route.view==='listening'){history.replaceState(null,'',routeURL({view:'radio',radioId:state.radioId,mode:'listen'}));navigate('listening',false)}
  else if(['collection','workbench'].includes(route.view))navigate(route.view,false);
  else{if(route.view==='unknown')history.replaceState(null,'',routeURL({view:'welcome'}));navigate('welcome',false)}
}
window.radioRoom={getCollection:()=>structuredClone(state.radios),openRadio:(catalogId,mode)=>openRadio(catalogId,mode)};
state.radios=mergeBookmarks([]).radios;
try{const [preferences,stored]=await Promise.all([read('preferences','room'),read('radios')]);if(preferences){state={...state,...preferences,view:'welcome'};}
const {radios,legacy}=mergeBookmarks(stored);state.radios=radios;
if(!catalog[state.radioId])state.radioId='rca-ggie-1939';
if(!organizationOptions.includes(state.organization))state.organization='all';
// Acquired copies from earlier versions become bookmarks on the catalog radios.
if(legacy.length){state.pan={x:0,y:0};state.activeSection=collectionGroups()[0]?.id||'all';await Promise.all(radios.filter(r=>Object.keys(r.memberships).length||r.personal).map(r=>write('radios',r)));await Promise.all(legacy.map(id=>remove('radios',id)));}}catch{storageOK=false}
layout();restoreRoute();window.addEventListener('popstate',restoreRoute);
window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);persist()});

if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  const tools=[
    {name:'read_radio_collection',description:'Read every radio in the collection with the bookmarks and personal history saved on this device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({radios:structuredClone(state.radios),view:state.view})},
    {name:'navigate_radio_room',description:'Open the welcome screen or the collection shelves.',inputSchema:{type:'object',properties:{view:{type:'string',enum:['welcome','collection']}},required:['view'],additionalProperties:false},execute:async input=>{if(!input||!['welcome','collection'].includes(input.view))throw new Error('Unknown room');await navigate(input.view);return {view:state.view}}},
    {name:'open_radio_page',description:'Open a radio’s page, in its About mode or its listening corner mode.',inputSchema:{type:'object',properties:{catalogId:{type:'string',enum:Object.keys(catalog)},mode:{type:'string',enum:['about','listen']}},required:['catalogId'],additionalProperties:false},execute:input=>{if(!catalog[input?.catalogId])throw new Error('Unknown radio');openRadio(input.catalogId,input.mode);return {radio:state.radioId,mode:state.radioMode}}}
  ];
  for(const tool of tools)Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
