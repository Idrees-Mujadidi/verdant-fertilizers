import {contentDocument,saveContent,isAdmin,listContent,validate,originAllowed,json} from '../../../../lib/cms';
import {isStorageConflict} from '../../../../lib/storage';
export const dynamic='force-dynamic';
export async function GET(){if(!await isAdmin())return json({error:'Admin sign-in required.'},403);return json(await listContent(true));}
async function write(req:Request){
 if(!originAllowed(req)||!await isAdmin())return json({error:'Admin access required.'},403);
 if(Number(req.headers.get('content-length')||0)>100000)return json({error:'Request too large.'},413);
 let v:any;try{const text=await req.text();if(text.length>100000)return json({error:'Request too large.'},413);v=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
 const id=req.method==='POST'?crypto.randomUUID():v.id;
 for(let attempt=0;attempt<4;attempt++){
 let doc;try{doc=await contentDocument()}catch(error){if(isStorageConflict(error))continue;throw error}
 const records=doc.data;
 if(req.method!=='POST'&&(typeof id!=='string'||!Number.isInteger(v.revision)))return json({error:'Invalid record.'},400);
 const index=records.findIndex(x=>x.id===id);
 if(req.method!=='POST'&&(index<0||records[index].revision!==v.revision))return json({error:'This item changed or was deleted. Refresh the list.'},409);
 if(req.method==='DELETE')records.splice(index,1);
 else{let data;try{data=validate(v)}catch(e){return json({error:(e as Error).message},400)}const now=new Date().toISOString();
 if(req.method==='POST'){records.push({...data,id,kind:v.kind,status:v.status,revision:0,created_at:now,updated_at:now})}
 else{if(records[index].kind!==v.kind)return json({error:'Content type cannot be changed.'},400);records[index]={...records[index],...data,status:v.status,revision:v.revision+1,updated_at:now}}}
 try{await saveContent(records,doc.etag)}catch(e){if(isStorageConflict(e))continue;console.error('Content save failed');return json({error:'Could not save. Please try again.'},503)}
 return json({ok:true,id},req.method==='POST'?201:200);
 }
 return json({error:'The collection is busy. Your draft is still open; please try saving again.'},409);
}
export const POST=write;export const PUT=write;export const DELETE=write;
