import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createRadioId,normalizeRadio,buildShelfGroups} from '../src/catalog.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
test('unknown catalog entries cannot be added',()=>assert.throws(()=>normalizeRadio({catalogId:'unknown'}),/Unknown/));
test('collection begins empty; new radios have no personal memberships',()=>{
 assert.deepEqual(buildShelfGroups([],'favorites')[0].radios,[]);
 const radio=normalizeRadio({catalogId:'rca-ggie-1939'},100);
 assert.deepEqual(radio.memberships,{});assert.equal(radio.isNew,true);assert.equal(radio.addedAt,100);
});
test('acquisition identifiers reject markup and malformed values',()=>{
 assert.throws(()=>normalizeRadio({id:'<script>',catalogId:'rca-ggie-1939'}),/identifier/);
 assert.throws(()=>normalizeRadio({id:42,catalogId:'rca-ggie-1939'}),/identifier/);
});

test('adding on HTTP works when randomUUID is unavailable',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
 const httpCrypto={getRandomValues:bytes=>webcrypto.getRandomValues(bytes)};
 Object.defineProperty(globalThis,'crypto',{configurable:true,value:httpCrypto});
 try{
  assert.equal(globalThis.crypto.randomUUID,undefined);
  const radios=Array.from({length:100},()=>normalizeRadio({catalogId:'rca-ggie-1939'}));
  assert.equal(new Set(radios.map(r=>r.id)).size,100);
  for(const radio of radios){
   assert.match(radio.id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
   assert.deepEqual(radio.memberships,{});
   assert.equal(radio.isNew,true);
  }
 }finally{if(descriptor)Object.defineProperty(globalThis,'crypto',descriptor);else delete globalThis.crypto}
});
test('fallback identifiers set UUID version and variant bits',()=>{
 assert.equal(createRadioId({getRandomValues:bytes=>bytes.fill(255)}),'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
