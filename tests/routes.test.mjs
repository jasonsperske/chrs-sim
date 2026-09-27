import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,cpSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseRoute,routePath} from '../src/routes.js';
test('paths name the welcome screen, the shelves and each radio page mode',()=>{
 assert.deepEqual(parseRoute(''),{view:'welcome'});
 assert.deepEqual(parseRoute('collection'),{view:'collection'});
 assert.deepEqual(parseRoute('radio/fritchle-1931'),{view:'radio',radioId:'fritchle-1931',mode:'about'});
 assert.deepEqual(parseRoute('radio/fritchle-1931/listen/'),{view:'radio',radioId:'fritchle-1931',mode:'listen'});
 assert.deepEqual(parseRoute('something/else'),{view:'unknown'});
 for(const route of [{view:'welcome'},{view:'collection'},{view:'radio',radioId:'rca-ggie-1939',mode:'about'},{view:'radio',radioId:'rca-ggie-1939',mode:'listen'}])
  assert.deepEqual(parseRoute(routePath(route)),route);
});
test('hash links from the earlier version still resolve',()=>{
 assert.deepEqual(parseRoute('','#radio/silvertone-6110-1938/listen'),{view:'radio',radioId:'silvertone-6110-1938',mode:'listen'});
 assert.deepEqual(parseRoute('','#collection'),{view:'collection'});
});
// Runs index.html's inline base script against a path and returns the base.
function baseFor(pathname) {
 const script=/<script>([\s\S]*?)<\/script>/.exec(readFileSync(new URL('../index.html',import.meta.url),'utf8'))[1];
 const base={};
 new Function('location','document',script)({pathname},{createElement:()=>base,head:{append(){}}});
 return base.href;
}
test('deep links resolve assets against the site base, at a root or in a subdirectory',()=>{
 for(const root of ['/','/chrs-sim/'])
  for(const route of ['','index.html','collection','radio/fritchle-1931','radio/fritchle-1931/listen','radio/fritchle-1931/listen/','listening'])
   assert.equal(baseFor(root+route),root,`${root}${route}`);
});
test('the build ships index.html as 404.html for deep links',()=>{
 const dir=mkdtempSync(join(tmpdir(),'chrs-build-'));
 for(const path of ['index.html','src','public','scripts'])cpSync(new URL(`../${path}`,import.meta.url),join(dir,path),{recursive:true});
 execFileSync(process.execPath,['scripts/build.mjs'],{cwd:dir});
 assert.equal(readFileSync(join(dir,'dist/404.html'),'utf8'),readFileSync(join(dir,'dist/index.html'),'utf8'));
});
