import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRadio,migrateRadio,updateMembership,validatePersonal,personalCaption,buildShelfGroups,catalog} from '../src/catalog.js';
const radio=(id,time=100)=>normalizeRadio({id,catalogId:'rca-ggie-1939'},time);
test('historical labels come from catalog attributes and cannot become personal memberships',()=>{
 const a=radio('a');const original=JSON.stringify(catalog);
 for(const key of ['manufacturer','year','era','type']){
  const groups=buildShelfGroups([a],key);
  assert.equal(groups[0].name,String(catalog[a.catalogId][key]));
  assert.deepEqual(groups[0].radios,[a]);
  assert.throws(()=>updateMembership(a,key,true),/Unknown/);
 }
 assert.equal(JSON.stringify(catalog),original);
});
test('personal collections are independent and sorted by their own membership times',()=>{
 let a=radio('a',100),b=radio('b',200);
 a=updateMembership(a,'favorites',true,500);b=updateMembership(b,'favorites',true,400);
 a=updateMembership(a,'personal',true,300);b=updateMembership(b,'personal',true,600);
 a=updateMembership(a,'highlighted',true,700);
 const ids=key=>buildShelfGroups([a,b],key)[0].radios.map(r=>r.id);
 assert.deepEqual(ids('favorites'),['a','b']);assert.deepEqual(ids('personal'),['b','a']);assert.deepEqual(ids('highlighted'),['a']);
 a=updateMembership(a,'favorites',false);
 assert.equal(a.memberships.personal,300);assert.equal(a.memberships.highlighted,700);
 assert.equal(buildShelfGroups([a,b],'collections').length,3);
});
test('date edits and repeated checking preserve order, re-adding updates it',()=>{
 let a=updateMembership(radio('a'),'personal',true,300);
 a=updateMembership(a,'personal',true,800);assert.equal(a.memberships.personal,300);
 a.personal=validatePersonal({relationship:'used',startYear:1960,endYear:1965});
 assert.equal(personalCaption(a),'Used · 1960–1965');assert.equal(a.memberships.personal,300);
 a=updateMembership(a,'personal',false);assert.equal(personalCaption(a),'');
 a=updateMembership(a,'personal',true,900);assert.equal(a.memberships.personal,900);assert.equal(a.personal.startYear,1960);
});
test('legacy memberships migrate without inventing personal choices from historical sections',()=>{
 for(const section of ['favorites','personal','pre-war','manufacturer']){
  const old={id:'legacy',catalogId:'rca-ggie-1939',section,addedAt:50,isNew:false};
  const migrated=migrateRadio(old);
  assert.equal(migrated.schemaVersion,2);assert.equal(migrated.section,undefined);
  assert.deepEqual(migrated.memberships,['favorites','personal'].includes(section)?{[section]:50}:{});
  assert.deepEqual(migrateRadio(migrated),migrated);
 }
});
test('personal history validates ranges and supports unknown and ongoing years',()=>{
 assert.throws(()=>validatePersonal({relationship:'owned',startYear:2000,endYear:1990}),/end year/);
 assert.throws(()=>validatePersonal({relationship:'owned',startYear:2030},2026),/between/);
 const a=updateMembership(radio('a'),'personal',true);
 a.personal=validatePersonal({relationship:'owned-used',startYear:1980,endYear:1990,ongoing:true});
 assert.equal(a.personal.endYear,null);assert.equal(personalCaption(a),'Owned & used · 1980–present');
 a.personal=validatePersonal({relationship:'used'});assert.equal(personalCaption(a),'Used · Dates not recorded');
});
test('shelf regions grow to fit memberships without overlapping the next row',()=>{
 const records={};const radios=[];
 for(let i=0;i<10;i++){
  records['model-'+i]={manufacturer:i<7?'A':String.fromCharCode(66+i-7)};
  radios.push({...radio(String(i)),catalogId:'model-'+i});
 }
 const groups=buildShelfGroups(radios,'manufacturer',records);
 assert.equal(groups[0].radios.length,7);assert.equal(groups[3].y,-3);
});
