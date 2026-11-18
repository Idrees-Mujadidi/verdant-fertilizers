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
