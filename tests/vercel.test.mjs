import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
async function moduleFrom(path,replace){const source=replace(readFileSync(new URL(path,import.meta.url),'utf8'));const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))}
const auth=await moduleFrom('../lib/admin-auth.ts',s=>s.replace("import {cookies} from 'next/headers';","const cookies=async()=>({get:()=>undefined});").replace("import {readDocument,writeDocument} from './storage';","const readDocument=async()=>null;const writeDocument=async()=>{};"));
const cms=await moduleFrom('../lib/cms.ts',s=>s.replace("import {readDocument,writeDocument} from './storage';","const readDocument=async()=>({data:[],etag:'existing'});const writeDocument=async()=>{};").replace("export {isAdmin} from './admin-auth';",''));
process.env.ADMIN_SESSION_SECRET='test-only-secret-not-for-production';
test('signed sessions validate only for the pinned admin version',()=>{const t=auth.signSession('owner');assert.equal(auth.verifySession(t,'owner'),true);assert.equal(auth.verifySession(t,'other'),false)});
test('tampering and malformed session tokens fail closed',()=>{const t=auth.signSession('owner');assert.equal(auth.verifySession(t+'x','owner'),false);assert.equal(auth.verifySession('forged','owner'),false);assert.equal(auth.verifySession(t+'.extra','owner'),false)});
test('expired sessions are rejected',()=>{const now=Date.now;const t=auth.signSession('owner');try{Date.now=()=>now()+9*60*60*1000;assert.equal(auth.verifySession(t,'owner'),false)}finally{Date.now=now}});
test('missing signing secret fails closed',()=>{const key=process.env.ADMIN_SESSION_SECRET;const t=auth.signSession('owner');delete process.env.ADMIN_SESSION_SECRET;assert.equal(auth.verifySession(t,'owner'),false);process.env.ADMIN_SESSION_SECRET=key});
test('password hashes are salted and verify correctly',()=>{const a=auth.newAccount('long enough test password');const b=auth.newAccount('long enough test password');assert.notEqual(a.hash,b.hash);assert.equal(a.hash,auth.passwordHash('long enough test password',a.salt));assert.notEqual(a.hash,auth.passwordHash('wrong',a.salt))});
test('empty saved content stays empty rather than reseeding',async()=>{assert.deepEqual(await cms.listContent(),[])});
test('invalid image URLs and incomplete content are rejected',()=>{const base={kind:'blog',status:'published',title:'Test',body:'Body'};assert.throws(()=>cms.validate({...base,image:'javascript:alert(1)'}));assert.throws(()=>cms.validate({...base,title:''}));assert.equal(cms.validate({...base,image:'https://example.com/image.png'}).title,'Test')});
test('mutations require same origin',()=>{assert.equal(cms.originAllowed(new Request('https://example.com/api',{headers:{origin:'https://evil.test'}})),false);assert.equal(cms.originAllowed(new Request('https://example.com/api',{headers:{origin:'https://example.com'}})),true)});
test('HTML content is escaped',()=>assert.equal(cms.esc('<script>"x"</script>'),'&lt;script&gt;&quot;x&quot;&lt;/script&gt;'));

class MissingBlob extends Error {}
class VersionConflict extends Error {}
const blobMock={head:async()=>({etag:'api-version'}),get:async()=>({statusCode:200,stream:new Response('{"title":"current"}').body,blob:{etag:'W/"encoded-version"'}}),put:async(_p,_data,options)=>options,BlobNotFoundError:MissingBlob,BlobPreconditionFailedError:VersionConflict};
globalThis.__verdantBlobTest=blobMock;
const storage=await moduleFrom('../lib/storage.ts',s=>s.replace(/import .* from '@vercel\/blob';/,'const {BlobNotFoundError,BlobPreconditionFailedError}=globalThis.__verdantBlobTest; const head=(...a)=>globalThis.__verdantBlobTest.head(...a); const get=(...a)=>globalThis.__verdantBlobTest.get(...a); const put=(...a)=>globalThis.__verdantBlobTest.put(...a);'));
test('storage returns the API version, not a transformed or missing GET ETag',async()=>{const doc=await storage.readDocument('content');assert.equal(doc.etag,'api-version');const options=await storage.writeDocument('content',doc.data,doc.etag);assert.equal(options.ifMatch,'api-version');assert.equal(options.allowOverwrite,true)});
test('storage retries if a write occurs during its body read',async()=>{let heads=0,reads=0;const oldHead=blobMock.head,oldGet=blobMock.get;blobMock.head=async()=>({etag:++heads===1?'old':'new'});blobMock.get=async()=>({statusCode:200,stream:new Response(JSON.stringify({generation:++reads})).body,blob:{etag:''}});try{const doc=await storage.readDocument('content');assert.deepEqual(doc,{data:{generation:2},etag:'new'})}finally{blobMock.head=oldHead;blobMock.get=oldGet}});
test('empty version never turns an update into an unconditional overwrite',async()=>{await assert.rejects(()=>storage.writeDocument('content',{},''));const create=await storage.writeDocument('content',{});assert.equal(create.allowOverwrite,false);assert.equal(create.ifMatch,undefined)});
let collection=[],version=1,saveCalls=0,onFirstSave;
globalThis.__verdantCmsTest={
 contentDocument:async()=>({data:structuredClone(collection),etag:String(version)}),
 saveContent:async(records,etag)=>{saveCalls++;if(saveCalls===1&&onFirstSave){onFirstSave();throw new VersionConflict()}assert.equal(etag,String(version));collection=records;version++},
 isAdmin:async()=>true,listContent:async()=>collection,validate:cms.validate,originAllowed:cms.originAllowed,json:cms.json,
 isStorageConflict:e=>e instanceof VersionConflict,
};
const route=await moduleFrom('../app/api/admin/content/route.ts',s=>s.replace(/import .* from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/cms';/,"const {contentDocument,saveContent,isAdmin,listContent,validate,originAllowed,json}=globalThis.__verdantCmsTest;").replace(/import .* from '\.\.\/\.\.\/\.\.\/\.\.\/lib\/storage';/,"const {isStorageConflict}=globalThis.__verdantCmsTest;"));
const request=(method,body)=>new Request('https://example.com/api/admin/content',{method,headers:{origin:'https://example.com','content-type':'application/json'},body:JSON.stringify(body)});
const draft={kind:'product',status:'published',category:'balanced',title:'New NPK',body:'Product details'};
test('creating a product retries a competing collection write without duplicates or data loss',async()=>{collection=[];version=1;saveCalls=0;onFirstSave=()=>{collection.push({id:'other',title:'Other product',revision:0});version++};const r=await route.POST(request('POST',draft));assert.equal(r.status,201);assert.equal(collection.length,2);assert.equal(collection.filter(x=>x.title==='New NPK').length,1);assert.equal(collection[0].id,'other');assert.equal(saveCalls,2)});
test('editing rejects a concurrent edit of the same product instead of overwriting it',async()=>{collection=[{...draft,id:'existing',revision:0}];version=1;saveCalls=0;onFirstSave=()=>{collection[0].revision=1;collection[0].title='Saved by another session';version++};const r=await route.PUT(request('PUT',{...draft,id:'existing',revision:0,title:'My edit'}));assert.equal(r.status,409);assert.equal(collection[0].title,'Saved by another session');assert.equal(saveCalls,1)});
