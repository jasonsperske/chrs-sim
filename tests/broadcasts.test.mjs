import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {monthDistance,chooseRecording,validateBroadcastCatalog} from '../src/broadcasts.js';
const read=id=>JSON.parse(readFileSync(new URL(`../public/broadcasts/${id}.json`,import.meta.url),'utf8'));
const ggie=read('rca-ggie-1939');
const isShadow=r=>r.id.startsWith('shadow-');
// The weighting tests use the GGIE's twelve FDR recordings, one per month.
const catalog={...ggie,recordings:ggie.recordings.filter(r=>!isShadow(r))};
test('radio catalog has twelve dated, period-correct recordings',()=>{
 assert.equal(validateBroadcastCatalog(ggie,'rca-ggie-1939'),ggie);
 assert.equal(catalog.recordings.length,12);
 assert.equal(new Set(catalog.recordings.map(r=>r.date.slice(5,7))).size,12);
});
test('The Shadow episodes air on Sundays in each radio’s period and share its draws evenly',()=>{
 for(const id of ['silvertone-6110-1938','rca-ggie-1939']){
  const data=read(id),shadow=data.recordings.filter(isShadow),others=data.recordings.filter(r=>!isShadow(r));
  assert.ok(shadow.length>20,`${id} carries the series`);
  for(const r of shadow){
   assert.equal(new Date(r.date+'T12:00:00Z').getUTCDay(),0,`${r.id} is a Sunday`);
   assert.match(r.audioUrl,/^https:\/\/archive\.org\/download\/the-shadow-radio-show-1937-1954-old-time-radio-all-available-episodes\//);
  }
  const total=list=>list.reduce((sum,r)=>sum+r.baseWeight,0);
  assert.ok(Math.abs(total(shadow)/total(others)-1)<.05,`${id}: the series is drawn about as often as everything else`);
 }
});
test('month proximity wraps between December and January',()=>{
 assert.equal(monthDistance(11,0),1);assert.equal(monthDistance(0,10),2);assert.equal(monthDistance(0,6),6);
});
test('weighted random draw favors current month and preserves all other months',()=>{
 const counts=new Map();
 for(let i=0;i<2300;i++){
  const recording=chooseRecording(catalog,{now:new Date(2026,8,19),random:()=>(i+.5)/2300});
  const month=recording.date.slice(5,7);counts.set(month,(counts.get(month)||0)+1);
 }
 assert.equal(counts.size,12);
 assert.equal(counts.get('09'),600);
 assert.equal(counts.get('08'),300);assert.equal(counts.get('10'),300);
 assert.equal(counts.get('07'),200);assert.equal(counts.get('11'),200);
 assert.equal(counts.get('03'),100);
});
test('random selection never immediately repeats when alternatives exist',()=>{
 const previousId=catalog.recordings[0].id;
 for(let i=0;i<100;i++)assert.notEqual(chooseRecording(catalog,{previousId,random:()=>i/100}).id,previousId);
 assert.equal(chooseRecording({...catalog,recordings:[]}),null);
 assert.equal(chooseRecording({...catalog,recordings:[catalog.recordings[0]]},{previousId}).id,previousId);
});
test('invalid dates, wrong radio, and out-of-period recordings are rejected',()=>{
 assert.throws(()=>validateBroadcastCatalog(catalog,'another-radio'),/Invalid/);
 for(const date of ['1939-02-31','1938-09-03','1941-01-01']){
  const copy=JSON.parse(JSON.stringify(catalog));copy.recordings[0].date=date;
  assert.throws(()=>validateBroadcastCatalog(copy,catalog.radioId),/historical period/);
 }
});
test('every catalog radio has a valid, period-correct recording catalog',async()=>{
 const {catalog:radios}=await import('../src/catalog.js');
 for(const id of Object.keys(radios)){
  const data=JSON.parse(readFileSync(new URL(`../public/broadcasts/${id}.json`,import.meta.url),'utf8'));
  assert.equal(validateBroadcastCatalog(data,id),data);
  assert.ok(data.recordings.length>0,`${id} has recordings`);
 }
});
