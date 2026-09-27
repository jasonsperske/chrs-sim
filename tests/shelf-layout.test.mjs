import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createStudioRuntime} from '../public/vendor/studio-runtime.js';
import {catalog,buildShelfGroups,emptyBookmark} from '../src/catalog.js';
import {packGroup,layoutCollection,TILE_H,SHELF_DEPTH,HALF_BOARD} from '../src/shelf-layout.js';
import {placeRadioInCell,radioParams} from '../src/scene.js';
const {THREE,compileObject}=createStudioRuntime();
const radio=(catalogId,id=catalogId)=>({...emptyBookmark(catalogId),id});
const footprint=r=>catalog[r.catalogId].footprint;
function model(id,overrides={}) {
 const definition=compileObject(id,readFileSync(new URL(`../public/vendor/${id}.js`,import.meta.url),'utf8'));
 const params=Object.fromEntries(definition.params.map(p=>[p.id,p.default]));
 const group=new THREE.Group();
 for(const part of definition.build({...params,...overrides}))group.add(new THREE.Mesh(part.geometry));
 return group;
}
test('small radios fill the gaps beside large ones, in newest-first order',()=>{
 const radios=['rca-ggie-1939','fritchle-1931','silvertone-6110-1938','navy-field-radio-1943','rca-ggie-1939'].map((c,i)=>radio(c,'r'+i));
 const {placements,rows}=packGroup(radios,footprint);
 assert.deepEqual(placements.map(({col,row,w,h})=>[col,row,w,h]),[[0,0,1,1],[1,0,2,3],[0,1,1,1],[0,3,2,2],[0,2,1,1]]);
 assert.equal(rows,5);
 const cells=new Set();
 for(const {col,row,w,h} of placements)for(let r=row;r<row+h;r++)for(let c=col;c<col+w;c++){assert.ok(!cells.has(`${c},${r}`),'cells must not overlap');cells.add(`${c},${r}`)}
});
test('shelf regions grow to fit tall radios so the next row does not overlap',()=>{
 const records={a:{manufacturer:'A',footprint:{w:2,h:3}},b:{manufacturer:'B'},c:{manufacturer:'C'},d:{manufacturer:'D'}};
 const radios=['a','b','c','d'].map(id=>({...radio('rca-ggie-1939',id),catalogId:id}));
 const groups=buildShelfGroups(radios,'manufacturer',records);
 assert.equal(groups[0].rows,3);assert.equal(groups[3].y,-3);
});
test('boards inside a merged cell are removed and dividers close its open sides',()=>{
 const groups=buildShelfGroups([radio('fritchle-1931','f'),radio('rca-ggie-1939','g')],'all');
 const {cells,openings,dividers}=layoutCollection(groups);
 // The Fritchle takes slots 0–1 of rows 0, -1 and -2; the boards at the two
 // interior levels (rows -1 and 0) are left out under both of its slots.
 assert.deepEqual([...openings].sort(),['0,-1','0,0','1,-1','1,0']);
 assert.equal(dividers.length,1);
 assert.equal(dividers[0].height,3*TILE_H-2*HALF_BOARD);
 const [fritchle,ggie]=cells;
 assert.ok(fritchle.x+fritchle.width/2<=dividers[0].x-10&&ggie.x-ggie.width/2>=dividers[0].x+10,'divider sits between the cells');
});
test('every catalog radio stands inside its cell without touching a board',()=>{
 for(const [catalogId,record] of Object.entries(catalog)){
  assert.ok(existsSync(new URL(`../public/vendor/${record.model}.js`,import.meta.url)),`${record.model} is vendored`);
  const [cell]=layoutCollection(buildShelfGroups([radio(catalogId)],'all')).cells;
  const model3d=model(record.model,radioParams(catalogId));
  placeRadioInCell(model3d,cell);
  const bounds=new THREE.Box3().setFromObject(model3d);
  assert.ok(Math.abs(bounds.min.y-cell.floorY)<.001,`${catalogId} stands on its shelf`);
  assert.ok(bounds.max.y<cell.topY,`${catalogId} clears the board above`);
  assert.ok(bounds.min.x>=cell.x-cell.width/2&&bounds.max.x<=cell.x+cell.width/2,`${catalogId} fits the cell width`);
  assert.ok(bounds.min.z>9&&bounds.max.z<SHELF_DEPTH,`${catalogId} fits between the back panel and the shelf edge`);
 }
});
