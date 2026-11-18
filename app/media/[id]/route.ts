import {get} from '@vercel/blob';
import {isAdmin,listContent} from '../../../lib/cms';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:any){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});if(!(await listContent()).some(x=>x.image==='/media/'+id)&&!await isAdmin())return new Response('Not found',{status:404});const r=await get('media/'+id,{access:'private'});if(r?.statusCode!==200)return new Response('Not found',{status:404});return new Response(r.stream,{headers:{'Content-Type':r.blob.contentType||'application/octet-stream','Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}})}
