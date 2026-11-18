import { db,isAdmin,listContent,validate,originAllowed,json } from '../../../../lib/cms';
export const dynamic='force-dynamic';
export async function GET(){if(!await isAdmin())return json({error:'Admin sign-in required.'},403);return json(await listContent(true));}
async function write(req:Request){
 if(!originAllowed(req))return json({error:'Request origin rejected.'},403);
 if(!await isAdmin())return json({error:'Admin sign-in required.'},403);
 if(Number(req.headers.get('content-length')||0)>100000)return json({error:'Request too large.'},413);
 let v:any;try{const text=await req.text();if(text.length>100000)return json({error:'Request too large.'},413);v=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
 if(req.method==='DELETE'){
  if(typeof v.id!=='string'||!Number.isInteger(v.revision))return json({error:'Invalid record.'},400);
  const result=await db().prepare('DELETE FROM content WHERE id=? AND revision=?').bind(v.id,v.revision).run();
  return result.meta.changes?json({ok:true}):json({error:'This item changed or was deleted. Refresh the list.'},409);
 }
 let data;try{data=validate(v)}catch(e){return json({error:(e as Error).message},400)}
 const now=new Date().toISOString();
 if(req.method==='POST'){const id=crypto.randomUUID();await db().prepare('INSERT INTO content(id,kind,status,data,created_at,updated_at) VALUES(?,?,?,?,?,?)').bind(id,v.kind,v.status,JSON.stringify(data),now,now).run();return json({id},201)}
 if(typeof v.id!=='string'||!Number.isInteger(v.revision))return json({error:'Invalid record.'},400);
 const result=await db().prepare('UPDATE content SET status=?,data=?,updated_at=?,revision=revision+1 WHERE id=? AND kind=? AND revision=?').bind(v.status,JSON.stringify(data),now,v.id,v.kind,v.revision).run();
 return result.meta.changes?json({ok:true}):json({error:'This item changed in another session. Reload before editing.'},409);
}
export const POST=write;export const PUT=write;export const DELETE=write;
