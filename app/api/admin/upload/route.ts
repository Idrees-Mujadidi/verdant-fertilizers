import {put} from '@vercel/blob';
import {isAdmin,originAllowed,json} from '../../../../lib/cms';
export async function POST(req:Request){
 if(!originAllowed(req)||!await isAdmin())return json({error:'Admin access required.'},403);
 if(Number(req.headers.get('content-length')||0)>4200000)return json({error:'Images must be 4 MB or smaller.'},413);
 const form=await req.formData();const f=form.get('file');if(!(f instanceof File)||f.size>4000000||!f.size)return json({error:'Choose an image up to 4 MB.'},400);
 const bytes=new Uint8Array(await f.arrayBuffer());let type='';
 if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)type='image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')type='image/webp';
 if(!type)return json({error:'Upload a JPG, PNG, or WebP image.'},400);
 const id=crypto.randomUUID();await put('media/'+id,Buffer.from(bytes),{access:'private',addRandomSuffix:false,contentType:type});return json({url:'/media/'+id});
}
