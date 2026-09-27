import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStudioRuntime} from '../public/vendor/studio-runtime.js';
import {placeTableUnderRadio,fitTableToRadio,centerFootprint,stageForListening,frameListening,radioParams,TABLE_BASE} from '../src/scene.js';
import {catalog} from '../src/catalog.js';
const {THREE,compileObject}=createStudioRuntime();
function model(id,overrides={}) {
 const definition=compileObject(id,readFileSync(new URL(`../public/vendor/${id}.js`,import.meta.url),'utf8'));
 const params=Object.fromEntries(definition.params.map(p=>[p.id,p.default]));
 const group=new THREE.Group();
 for(const part of definition.build({...params,...overrides}))group.add(new THREE.Mesh(part.geometry));
 return group;
}
test('radio feet remain on the tabletop when rotated or powered on',()=>{
 const table=model('shelf-unit',{width:1000,height:530,depth:270,shelves:0,toeKick:0,sideThickness:20,shelfThickness:24,edgeStyle:'rounded'});
 table.scale.set(.52,.12,2);
 for(const power of ['off','on']){
  const radio=model('ggie-radio',{power});radio.position.set(0,-90,0);radio.rotation.set(0,-.35,0);
  placeTableUnderRadio(radio,table);
  const tabletop=new THREE.Box3().setFromObject(table);
  for(const yaw of [-.35,0,Math.PI/2,2.6,Math.PI,Math.PI*2]){
   radio.rotation.y=yaw;
   const radioBounds=new THREE.Box3().setFromObject(radio);
   assert.ok(Math.abs(radioBounds.min.y-tabletop.max.y)<.001,'feet must meet, not intersect, the tabletop');
   assert.ok(radioBounds.min.x>=tabletop.min.x&&radioBounds.max.x<=tabletop.max.x,'table supports radio width');
   assert.ok(radioBounds.min.z>=tabletop.min.z&&radioBounds.max.z<=tabletop.max.z,'table supports radio depth');
  }
  radio.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose()}});
 }
 table.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.dispose();mesh.material.dispose()}});
});
test('every tabletop radio fits on its listening-corner table',()=>{
 for(const [catalogId,record] of Object.entries(catalog)){
  if(record.floorStanding)continue;
  for(const on of [false,true]){
   const table=model('shelf-unit',TABLE_BASE);
   const radio=centerFootprint(model(record.model,radioParams(catalogId,{on,volume:.5})));radio.rotation.set(0,-.35,0);
   fitTableToRadio(radio,table);
   const tabletop=new THREE.Box3().setFromObject(table);
   for(const yaw of [-.35,0,Math.PI/4,Math.PI/2,2.6,Math.PI]){
    radio.rotation.y=yaw;const bounds=new THREE.Box3().setFromObject(radio);
    assert.ok(Math.abs(bounds.min.y-tabletop.max.y)<.001,`${catalogId} stands on the table`);
    assert.ok(bounds.min.x>=tabletop.min.x&&bounds.max.x<=tabletop.max.x&&bounds.min.z>=tabletop.min.z&&bounds.max.z<=tabletop.max.z,`${catalogId} fits the tabletop at any turn`);
   }
  }
 }
});
test('the listening corner frames every radio at its own size, at any turn',()=>{
 // Desktop stage, the taller floor stage, and phone stages.
 for(const aspect of [1.62,1,1.3,.75]){
  const heights={};
  for(const [catalogId,record] of Object.entries(catalog)){
   const radio=centerFootprint(model(record.model,radioParams(catalogId))),stand=model('shelf-unit',TABLE_BASE);
   const camera=new THREE.PerspectiveCamera(35,aspect,1,20000);
   frameListening(camera,radio,stand,stageForListening(radio,stand,record.floorStanding));
   const project=box=>{const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));return points};
   for(const yaw of [-.35,0,Math.PI/4,Math.PI/2,2.6]){
    radio.rotation.y=yaw;radio.updateMatrixWorld(true);
    const points=project(new THREE.Box3().setFromObject(radio));
    assert.ok(points.every(p=>Math.abs(p.x)<=1&&Math.abs(p.y)<=1),`${catalogId} stays in view at aspect ${aspect}, yaw ${yaw}`);
   }
   radio.rotation.y=-.35;radio.updateMatrixWorld(true);
   const ys=project(new THREE.Box3().setFromObject(radio)).map(p=>p.y);
   heights[catalogId]=(Math.max(...ys)-Math.min(...ys))/2;
  }
  // A console radio uses more of its stage than a tabletop set does.
  assert.ok(heights['fritchle-1931']>=Math.max(...Object.values(heights))-.001,`the Fritchle fills the most height at aspect ${aspect}`);
  assert.ok(heights['fritchle-1931']>.6,`the Fritchle fills most of the stage at aspect ${aspect}`);
 }
});
