import { createStudioRuntime } from '../public/vendor/studio-runtime.js';
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
export class RoomScene {
  constructor(container, onError) {
    this.container=container;this.onError=onError;this.mode='welcome';this.pan={x:0,y:0};this.zoom=1;this.tiles=new Map();this.labels=[];this.radios=[];this.disposed=false;
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
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.mode==='collection'&&this.shelf)this.updateShelves();else this.render()}
  async init(){
    const [radio,shelf]=await Promise.all([buildModel('ggie-radio',{power:'off'}),buildModel('shelf-unit',{width:1000,height:530,depth:270,shelves:0,toeKick:0,sideThickness:20,shelfThickness:24,edgeStyle:'rounded'})]);
    if(this.disposed){this.disposeModel(radio);this.disposeModel(shelf);return}
    this.radio=radio;this.shelf=shelf;
    const textureCanvas=document.createElement('canvas');textureCanvas.width=256;textureCanvas.height=512;
    const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#ba9b74';ctx.fillRect(0,0,256,512);
    for(let i=0;i<650;i++){const x=(i*37.717)%256;ctx.strokeStyle=`rgba(57,30,12,${.035+(i%7)*.013})`;ctx.lineWidth=i%3===0?1:.45;ctx.beginPath();ctx.moveTo(x,0);for(let y=0;y<=512;y+=12)ctx.lineTo(x+Math.sin(y*.012+i)*1.8,y);ctx.stroke()}
    const grain=new THREE.CanvasTexture(textureCanvas);grain.colorSpace=THREE.SRGBColorSpace;grain.wrapS=grain.wrapT=THREE.RepeatWrapping;this.grain=grain;
    for(const child of shelf.children){child.material.color.set(child.name==='back-panel'?0x5f4735:0x95724e);child.material.map=grain;child.material.roughness=.86;}
    this.world.add(radio);this.setMode(this.mode);
  }
  setMode(mode){this.mode=mode; if(!this.radio)return;
    this.world.clear();this.tiles.clear();
    if(mode==='collection') {this.updateShelves();}
    else {
      this.world.add(this.radio);this.radio.visible=true;
      const onTable=mode==='workbench'||mode==='listening';
      this.radio.position.set(0,-90,0);this.radio.rotation.set(onTable?0:.02,-.35,0);
      const mobile=this.camera.aspect<.9;
      this.camera.position.set(0,80,mobile?570:(mode==='workbench'||mode==='listening'?570:410));this.camera.lookAt(0,0,-40);
      this.camera.zoom=1;this.camera.updateProjectionMatrix();
      if(mode==='workbench'||mode==='listening') {
        const table=this.shelf.clone();table.scale.set(.52,.12,2);
        placeTableUnderRadio(this.radio,table);this.world.add(table);
      }
    }
    this.render();
  }
  updateShelves(){if(!this.shelf)return;
    const cx=Math.round(this.pan.x/1000),cy=Math.round(this.pan.y/530);
    const rx=Math.ceil((this.container.clientWidth/this.container.clientHeight)*1.7/this.zoom)+1,ry=Math.ceil(1.8/this.zoom)+1;
    const keep=new Set();
    for(let x=cx-rx;x<=cx+rx;x++)for(let y=cy-ry;y<=cy+ry;y++){
      const key=`${x},${y}`;keep.add(key);if(!this.tiles.has(key)){const tile=this.shelf.clone();tile.position.set(x*1000,y*530,0);this.world.add(tile);this.tiles.set(key,tile)}
    }
    for(const [key,tile]of this.tiles)if(!keep.has(key)){this.world.remove(tile);this.tiles.delete(key)}
    const distance=Math.max(2100,620/(Math.tan(35*Math.PI/360)*this.camera.aspect))/this.zoom;
    this.camera.position.set(this.pan.x,this.pan.y+300,distance);this.camera.lookAt(this.pan.x,this.pan.y+270,0);this.camera.zoom=1;this.camera.updateProjectionMatrix();
    this.render();
  }
  setPan(x,y,zoom=this.zoom){this.pan={x,y};this.zoom=Math.max(.55,Math.min(1.8,zoom));if(this.mode==='collection')this.updateShelves()}
  project(x,y,z=290){const v=new THREE.Vector3(x,y,z).project(this.camera);return {x:(v.x+1)/2*this.container.clientWidth,y:(1-v.y)/2*this.container.clientHeight}}
  async setRadios(items){
    for(const r of this.radios){this.world.remove(r);this.disposeModel(r)}this.radios=[];
    if(this.mode!=='collection')return;
    const generation=this.generation=(this.generation||0)+1;
    for(const item of items){
      const radio=await buildModel('ggie-radio',{power:'off'});
      if(this.disposed||generation!==this.generation||this.mode!=='collection'){this.disposeModel(radio);continue}
      radio.position.set(item.x,item.y+26,240);radio.rotation.y=-.12;radio.userData.id=item.id;
      if(item.isNew||item.memberships?.highlighted!==undefined){const light=new THREE.PointLight(0xffd79b,180000,650,2);light.position.set(0,300,140);radio.add(light)}
      this.world.add(radio);this.radios.push(radio);
    }this.render();
  }
  async setRadioControls(overrides){const radio=await buildModel('ggie-radio',overrides);if(this.disposed){this.disposeModel(radio);return}radio.position.copy(this.radio.position);radio.rotation.copy(this.radio.rotation);this.world.remove(this.radio);this.disposeModel(this.radio);this.radio=radio;this.world.add(radio);this.render()}
  polishCabinet(polished){this.radio?.traverse(mesh=>{if(mesh.isMesh&&/walnut|veneer|cabinet|fascia/i.test(mesh.name))mesh.material.roughness=polished?.32:.7});this.render()}
  openCabinet(open){if(!this.radio)return;for(const mesh of this.radio.children){if(/back|rear/i.test(mesh.name))mesh.position.z=open?-85:0}this.radio.rotation.y=open?2.6:-.35;this.render()}
  rotate(amount){if(this.mode!=='collection'&&this.radio){this.radio.rotation.y+=amount;this.render()}}
  render(){if(!this.disposed)this.renderer.render(this.scene,this.camera);this.onRender?.()}
  disposeModel(group){group.traverse(child=>{if(child.isMesh){child.geometry.dispose();child.material.dispose()}})}
  dispose(){this.disposed=true;this.generation=(this.generation||0)+1;this.grain?.dispose();this.observer.disconnect();if(this.radio)this.disposeModel(this.radio);if(this.shelf)this.disposeModel(this.shelf);for(const r of this.radios)this.disposeModel(r);this.renderer.dispose()}
}
