import { createStudioRuntime } from '../public/vendor/studio-runtime.js';
import { catalog } from './catalog.js';
import { TILE_W,TILE_H,SLOTS,SHELF_DEPTH,SIDE,HALF_BOARD,DIVIDER,INNER,SEGMENT } from './shelf-layout.js';
const {THREE, compileObject} = createStudioRuntime();
const definitions = new Map();
async function definition(id) {
  if (!definitions.has(id)) definitions.set(id, fetch(new URL(`../public/vendor/${id}.js`, import.meta.url)).then(r=>{if(!r.ok)throw new Error('Model unavailable');return r.text()}).then(source=>compileObject(id,source)));
  return definitions.get(id);
}
export async function buildModel(id, overrides={}) {
  const def = await definition(id);
  const params = Object.fromEntries(def.params.map(p=>[p.id,p.default]));
  const group = new THREE.Group();
  for (const part of def.build({...params,...overrides})) {
    const material = new THREE.MeshStandardMaterial({color:part.color, roughness:.7, metalness:part.name.toLowerCase().includes('metal')?.45:0});
    const mesh = new THREE.Mesh(part.geometry, material);
    mesh.name=part.name; mesh.castShadow=true; mesh.receiveShadow=true;
    group.add(mesh);
  }
  return group;
}
// Position the support from the models' actual world-space bounds. The radio
// generators place their feet at their origin; shelf generators do not put
// their top surface there, so a shared hard-coded Y offset causes intersections.
export function placeTableUnderRadio(radio, table) {
  const radioBounds=new THREE.Box3().setFromObject(radio);
  const tableBounds=new THREE.Box3().setFromObject(table);
  const tableCenter=tableBounds.getCenter(new THREE.Vector3());
  table.position.x+=radio.position.x-tableCenter.x;
  table.position.z+=radio.position.z-tableCenter.z;
  table.position.y+=radioBounds.min.y-tableBounds.max.y;
  table.updateMatrixWorld(true);
}
// Scale the display table so it is wider and deeper than the radio standing
// on it, then move it under the radio. The table model is TABLE_BASE in size.
export const TABLE_BASE={width:1000,height:530,depth:270,shelves:0,toeKick:0,sideThickness:20,shelfThickness:24,edgeStyle:'rounded'};
// Generators put their origin at different points of the footprint; move the
// parts so the origin is the footprint's centre and the radio turns in place.
export function centerFootprint(radio) {
  const rotation=radio.rotation.clone();radio.rotation.set(0,0,0);radio.updateMatrixWorld(true);
  const center=new THREE.Box3().setFromObject(radio).getCenter(new THREE.Vector3()).sub(radio.position);
  for(const child of radio.children){child.position.x-=center.x;child.position.z-=center.z}
  radio.rotation.copy(rotation);radio.updateMatrixWorld(true);
  return radio;
}
// Width of the circle a centred radio sweeps as it turns on its stand.
function footprintReach(radio) {
  const rotation=radio.rotation.clone();radio.rotation.set(0,0,0);radio.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(radio).getSize(new THREE.Vector3());
  radio.rotation.copy(rotation);radio.updateMatrixWorld(true);
  return 2*Math.hypot(size.x/2,size.z/2);
}
// The table is square enough to hold a centred radio at any turn. A plinth
// for a floor-standing radio is the same board, low and with a wider margin.
export function fitTableToRadio(radio,table,{height=.12,margin=90}={}) {
  const reach=footprintReach(radio)+margin;
  table.scale.set(reach/TABLE_BASE.width,height,reach/TABLE_BASE.depth);
  placeTableUnderRadio(radio,table);
}
// Tabletop radios stand on a table; floor-standing ones on a low plinth and
// take more of a taller stage.
export function stageForListening(radio,stand,floorStanding) {
  radio.rotation.set(0,-.35,0);radio.position.set(0,0,0);radio.updateMatrixWorld(true);
  fitTableToRadio(radio,stand,floorStanding?{height:.04,margin:160}:{});
  return {fill:floorStanding?.8:.4};
}
// Aim the camera so the space the radio sweeps as it turns fills `fill` of
// the view's height (and at most 90% of its width), then back off until its
// stand is in view too. Distances follow the radio's own size, so a console
// radio gets as much of the stage as a tabletop set does.
export function frameListening(camera,radio,stand,{fill=.4}={}) {
  const corners=box=>{const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z));return points};
  const sweep=new THREE.Box3().setFromObject(radio),reach=footprintReach(radio)/2;
  sweep.min.x=Math.min(sweep.min.x,-reach);sweep.max.x=Math.max(sweep.max.x,reach);sweep.min.z=Math.min(sweep.min.z,-reach);sweep.max.z=Math.max(sweep.max.z,reach);
  const radioPoints=corners(sweep),standPoints=stand?corners(new THREE.Box3().setFromObject(stand)):[];
  const t=Math.tan(camera.fov*Math.PI/360),centerY=(sweep.min.y+sweep.max.y)/2;
  const place=distance=>{camera.position.set(0,centerY+distance*.14,distance);camera.lookAt(0,centerY,0);camera.zoom=1;camera.updateProjectionMatrix();camera.updateMatrixWorld(true)};
  const project=points=>points.map(p=>p.clone().project(camera));
  let distance=Math.max((sweep.max.y-sweep.min.y)/2/t/fill,(sweep.max.x-sweep.min.x)/2/(t*camera.aspect)/.9);
  // Nearer corners project larger, so refine the distance against the real
  // projection rather than trusting the flat estimate.
  for(let i=0;i<4;i++){
    place(distance);
    const radioView=project(radioPoints),standView=project(standPoints);
    const ys=radioView.map(p=>p.y);
    const all=[...radioView,...standView];
    distance*=Math.max((Math.max(...ys)-Math.min(...ys))/2/fill,...radioView.map(p=>Math.abs(p.x)/.9),...all.map(p=>Math.abs(p.x)/.98),...all.map(p=>Math.abs(p.y)/.98));
  }
  place(distance);
}
// Stand a radio in a shelf cell: on the floor board, centred across the cell
// and set back from the shelf's front edge. Radios that span several slots
// face straight out; single-slot radios keep a slight turn.
export function placeRadioInCell(radio,cell) {
  radio.rotation.set(0,cell.w>1?0:-.12,0);radio.position.set(0,0,0);radio.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(radio);
  radio.position.set(cell.x-(bounds.min.x+bounds.max.x)/2,cell.floorY-bounds.min.y,SHELF_DEPTH-20-bounds.max.z);
  radio.updateMatrixWorld(true);
}
// Model settings for a catalog radio: its shelf pose, or its playing pose.
export function radioParams(catalogId,{on=false,volume}={}) {
  const record=catalog[catalogId];
  const params={...record.poses[on?'on':'off']};
  if(record.volumeParam&&volume!==undefined)params[record.volumeParam]=Math.round(volume*100);
  return params;
}
export class RoomScene {
  constructor(container, onError) {
    this.container=container;this.onError=onError;this.mode='welcome';this.catalogId='rca-ggie-1939';this.layout={cells:[],openings:new Set(),dividers:[]};this.pan={x:0,y:0};this.zoom=1;this.tiles=new Map();this.labels=[];this.radios=[];this.disposed=false;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(35,1,1,20000);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;
    container.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffeed1,0x19241f,1.7));
    const key=new THREE.DirectionalLight(0xffe5bd,2.1);key.position.set(-400,800,900);key.castShadow=false;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-1800;key.shadow.camera.right=1800;key.shadow.camera.top=1800;key.shadow.camera.bottom=-1800;this.scene.add(key);
    const fill=new THREE.DirectionalLight(0xb9c8bd,1.1);fill.position.set(500,200,500);this.scene.add(fill);
    this.world=new THREE.Group();this.scene.add(this.world);
    this.observer=new ResizeObserver(()=>{this.resize();this.render()});this.observer.observe(container);
    this.resize();
  }
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.mode==='collection'&&this.shelf)this.updateShelves();else if(this.mode==='listening'&&this.radio){this.frameStage();this.render()}else this.render()}
  async init(){
    const shelf=(overrides)=>buildModel('shelf-unit',{...TABLE_BASE,depth:SHELF_DEPTH,...overrides});
    const [radio,table,frame,board,divider]=await Promise.all([
      buildModel(catalog[this.catalogId].model,radioParams(this.catalogId)),
      buildModel('shelf-unit',TABLE_BASE),
      // Sides and back of one tile; its shelf boards are added per slot.
      shelf({}),
      // Two stacked boards one slot wide: the top of one tile and the bottom of the next.
      shelf({width:SEGMENT+2*SIDE,height:2*HALF_BOARD,back:false}),
      shelf({width:DIVIDER,height:TILE_H,sideThickness:DIVIDER/2,back:false}),
    ]);
    const parts=[radio,table,frame,board,divider];
    if(this.disposed){parts.forEach(p=>this.disposeModel(p));return}
    this.radio=centerFootprint(radio);this.shelf=table;
    const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=512;
    const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#ba9b74';ctx.fillRect(0,0,256,512);
    for(let i=0;i<650;i++){const x=(i*37.717)%256;ctx.strokeStyle=`rgba(57,30,12,${.035+(i%7)*.013})`;ctx.lineWidth=i%3===0?1:.45;ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<=512;y+=12)ctx.lineTo(x+Math.sin(y*.012+i)*1.8,y);ctx.stroke()}
    const grain=new THREE.CanvasTexture(textureCanvas);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;this.grain=grain;
    for(const model of [table,frame,board,divider])for(const child of model.children){child.material.color.set(child.name==='back-panel'?0x5f4735:0x95724e);child.material.map=grain;child.material.roughness=.86;}
    this.frame=new THREE.Group();this.frame.add(...frame.children.filter(c=>c.name!=='shelves'));
    this.board=board.children.find(c=>c.name==='shelves');this.board.position.y=-HALF_BOARD;
    this.divider=divider.children.find(c=>c.name==='sides');
    this.shelfParts=[this.frame,frame,board,divider];
    this.world.add(radio);this.setMode(this.mode);
  }
  // One shelf tile: the frame plus the board segments along its lower edge
  // that are not inside a merged cell.
  createTile(x,y){
    const tile=this.frame.clone();
    for(let slot=0;slot<SLOTS;slot++){
      if(this.layout.openings.has(`${x*SLOTS+slot},${y}`))continue;
      const board=this.board.clone();board.position.x=-INNER+SEGMENT*(slot+.5);tile.add(board);
    }
    tile.position.set(x*TILE_W,y*TILE_H,0);return tile;
  }
  setMode(mode){this.mode=mode; if(!this.radio)return;
    this.world.clear();this.tiles.clear();
    if(mode==='collection') {this.updateShelves();}
    else if(mode==='listening') {
      this.world.add(this.radio);this.radio.visible=true;this.stand=this.shelf.clone();
      this.stage=stageForListening(this.radio,this.stand,catalog[this.catalogId].floorStanding);
      this.world.add(this.stand);this.frameStage();
    }
    else {
      this.world.add(this.radio);this.radio.visible=true;
      const onTable=mode==='workbench';
      this.radio.rotation.set(onTable?0:.02,-.35,0);this.poseRadio();
      // Frame every radio as the GGIE is framed, scaled up for larger sets.
      const k=this.frameScale;
      const mobile=this.camera.aspect<.9,distance=mobile||onTable?570:410;
      this.camera.position.set(0,80*k,(distance+40)*k-40);this.camera.lookAt(0,0,-40);
      this.camera.zoom=1;this.camera.updateProjectionMatrix();
      if(onTable&&!catalog[this.catalogId].floorStanding) {
        const table=this.shelf.clone();fitTableToRadio(this.radio,table);this.world.add(table);
      }
    }
    this.render();
  }
  frameStage(){frameListening(this.camera,this.radio,this.stand,this.stage)}
  // Put the radio's centre where the GGIE's sits relative to the camera's
  // aim point (0,0,-40), scaled with the radio so larger sets stay framed.
  poseRadio(){
    const radio=this.radio;radio.position.set(0,0,0);radio.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(radio),center=bounds.getCenter(new THREE.Vector3());
    const size=bounds.getSize(new THREE.Vector3());
    // 238 × 178 × 163 mm is the GGIE; deep radios come nearer the camera too.
    const k=this.frameScale=Math.max(1,size.x/238,size.y/178,size.z/220);
    radio.position.set(-center.x,-center.y-2*k,-center.z-40-30*k);
    radio.updateMatrixWorld(true);
  }
  updateShelves(){if(!this.frame)return;
    const cx=Math.round(this.pan.x/TILE_W),cy=Math.round(this.pan.y/TILE_H);
    const rx=Math.ceil((this.container.clientWidth/this.container.clientHeight)*1.7/this.zoom)+1,ry=Math.ceil(1.8/this.zoom)+1;
    const keep=new Set();
    for(let x=cx-rx;x<=cx+rx;x++)for(let y=cy-ry;y<=cy+ry;y++){
      const key=`${x},${y}`;keep.add(key);if(!this.tiles.has(key)){const tile=this.createTile(x,y);this.world.add(tile);this.tiles.set(key,tile)}
    }
    for(const [key,tile]of this.tiles)if(!keep.has(key)){this.world.remove(tile);this.tiles.delete(key)}
    const distance=Math.max(2100,620/(Math.tan(35*Math.PI/360)*this.camera.aspect))/this.zoom;
    this.camera.position.set(this.pan.x,this.pan.y+300,distance);this.camera.lookAt(this.pan.x,this.pan.y+270,0);this.camera.zoom=1;this.camera.updateProjectionMatrix();
    this.render();
  }
  setPan(x,y,zoom=this.zoom){this.pan={x,y};this.zoom=Math.max(.55,Math.min(1.8,zoom));if(this.mode==='collection')this.updateShelves()}
  project(x,y,z=SHELF_DEPTH+20){const v=new THREE.Vector3(x,y,z).project(this.camera);return {x:(v.x+1)/2*this.container.clientWidth,y:(1-v.y)/2*this.container.clientHeight}}
  // Place the collection's radios and reshape the shelves around large ones.
  async setLayout(layout){
    for(const r of this.radios){this.world.remove(r);this.disposeModel(r)}this.radios=[];
    for(const d of this.dividers||[])this.world.remove(d);this.dividers=[];
    const openings=[...layout.openings].sort().join(';');
    this.layout=layout;
    // Before init finishes, keep the layout; init's setMode builds from it.
    if(this.mode!=='collection'||!this.frame)return;
    if(openings!==this.openingsKey){this.openingsKey=openings;for(const tile of this.tiles.values())this.world.remove(tile);this.tiles.clear();this.updateShelves()}
    for(const {x,floorY,height} of layout.dividers){
      const divider=this.divider.clone();divider.position.set(x,floorY,0);divider.scale.y=height/TILE_H;
      this.world.add(divider);this.dividers.push(divider);
    }
    const generation=this.generation=(this.generation||0)+1;
    for(const cell of layout.cells){
      const item=cell.radio;
      const radio=await buildModel(catalog[item.catalogId].model,radioParams(item.catalogId));
      if(this.disposed||generation!==this.generation||this.mode!=='collection'){this.disposeModel(radio);continue}
      placeRadioInCell(radio,cell);radio.userData.id=item.id;
      if(item.memberships?.highlighted!==undefined){const light=new THREE.PointLight(0xffd79b,180000,650,2);light.position.set(0,300,140);radio.add(light)}
      this.world.add(radio);this.radios.push(radio);
    }this.render();
  }
  async setRadioControls(overrides){const radio=centerFootprint(await buildModel(catalog[this.catalogId].model,overrides));if(this.disposed){this.disposeModel(radio);return}radio.position.copy(this.radio.position);radio.rotation.copy(this.radio.rotation);this.world.remove(this.radio);this.disposeModel(this.radio);this.radio=radio;this.world.add(radio);this.render()}
  polishCabinet(polished){this.radio?.traverse(mesh=>{if(mesh.isMesh&&/walnut|veneer|cabinet|fascia/i.test(mesh.name))mesh.material.roughness=polished?.32:.7});this.render()}
  openCabinet(open){if(!this.radio)return;for(const mesh of this.radio.children){if(/back|rear/i.test(mesh.name))mesh.position.z=open?-85:0}this.radio.rotation.y=open?2.6:-.35;this.render()}
  rotate(amount){if(this.mode!=='collection'&&this.radio){this.radio.rotation.y+=amount;this.render()}}
  render(){if(!this.disposed)this.renderer.render(this.scene,this.camera);this.onRender?.()}
  disposeModel(group){group.traverse(child=>{if(child.isMesh){child.geometry.dispose();child.material.dispose()}})}
  dispose(){this.disposed=true;this.generation=(this.generation||0)+1;this.grain?.dispose();this.observer.disconnect();if(this.radio)this.disposeModel(this.radio);if(this.shelf)this.disposeModel(this.shelf);for(const part of this.shelfParts||[])this.disposeModel(part);for(const r of this.radios)this.disposeModel(r);this.renderer.dispose()}
}
