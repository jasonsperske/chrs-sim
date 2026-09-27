import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,mergeBookmarks,buildShelfGroups,updateMembership} from '../src/catalog.js';
test('the collection starts with every catalog radio and no bookmarks',()=>{
 const {radios,legacy}=mergeBookmarks([]);
 assert.deepEqual(radios.map(r=>r.id).sort(),Object.keys(catalog).sort());
 for(const radio of radios){assert.equal(radio.id,radio.catalogId);assert.deepEqual(radio.memberships,{});assert.equal(radio.personal,null)}
 assert.deepEqual(legacy,[]);
 assert.equal(buildShelfGroups(radios,'all')[0].radios.length,Object.keys(catalog).length);
 assert.deepEqual(buildShelfGroups(radios,'favorites')[0].radios,[]);
});
test('shelves list radios by release year',()=>{
 const {radios}=mergeBookmarks([]);
 assert.deepEqual(buildShelfGroups(radios,'all')[0].radios.map(r=>r.id),['fritchle-1931','silvertone-6110-1938','rca-ggie-1939','navy-field-radio-1943']);
});
test('saved bookmarks are kept for their radio',()=>{
 const saved=updateMembership(mergeBookmarks([]).radios.find(r=>r.id==='fritchle-1931'),'favorites',true,500);
 const {radios,legacy}=mergeBookmarks([saved]);
 assert.deepEqual(radios.find(r=>r.id==='fritchle-1931').memberships,{favorites:500});
 assert.deepEqual(legacy,[]);
});
test('acquired copies from earlier versions fold into one bookmark per radio',()=>{
 const personal={relationship:'used',startYear:1960,endYear:1965,ongoing:false,note:''};
 const stored=[
  {id:'a',catalogId:'rca-ggie-1939',schemaVersion:2,addedAt:100,memberships:{favorites:300,personal:150},personal},
  {id:'b',catalogId:'rca-ggie-1939',schemaVersion:2,addedAt:200,memberships:{favorites:250,highlighted:400},personal:null},
  {id:'c',catalogId:'rca-ggie-1939',section:'personal',addedAt:50},
  {id:'d',catalogId:'retired-model',schemaVersion:2,addedAt:10,memberships:{favorites:1},personal:null},
 ];
 const {radios,legacy}=mergeBookmarks(stored);
 const ggie=radios.find(r=>r.id==='rca-ggie-1939');
 assert.deepEqual(ggie.memberships,{favorites:300,personal:150,highlighted:400});
 assert.deepEqual(ggie.personal,personal);
 assert.deepEqual(legacy.sort(),['a','b','c','d']);
 assert.equal(radios.length,Object.keys(catalog).length);
});
