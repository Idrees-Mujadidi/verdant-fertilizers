import {cookies} from 'next/headers';
import {AUTH_PATH,type AdminAccount,newAccount,passwordHash,safeEqual,signSession,readDocument,writeDocument} from '../../../../lib/admin-auth';
import {originAllowed,json} from '../../../../lib/cms';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!originAllowed(req))return json({error:'Request origin rejected.'},403);
 let v:any;try{const text=await req.text();if(text.length>5000)return json({error:'Invalid request.'},400);v=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
 if(typeof v.password!=='string'||v.password.length>128)return json({error:'Invalid password.'},400);
 try{
 const record=await readDocument<AdminAccount>(AUTH_PATH);let account:AdminAccount;
 if(v.action==='setup'){
  if(record)return json({error:'Admin account is already set up. Please sign in.'},409);
  const token=process.env.ADMIN_SETUP_TOKEN;if(!token||typeof v.token!=='string'||!safeEqual(v.token,token))return json({error:'A valid private setup link is required.'},403);
  if(v.password.length<12)return json({error:'Use a password with at least 12 characters.'},400);
  account=newAccount(v.password);await writeDocument(AUTH_PATH,account);
 }else{
  if(!record)return json({error:'Use the private setup link to create your admin password first.'},403);
  account=record.data;if(account.lockedUntil>Date.now())return json({error:'Too many attempts. Try again in 15 minutes.'},429);
  if(!safeEqual(passwordHash(v.password,account.salt),account.hash)){
   account.failures=account.lockedUntil?1:account.failures+1;account.lockedUntil=account.failures>=5?Date.now()+15*60*1000:0;await writeDocument(AUTH_PATH,account,record.etag);return json({error:'Incorrect password.'},401);
  }
  account.failures=0;account.lockedUntil=0;await writeDocument(AUTH_PATH,account,record.etag);
 }
 (await cookies()).set('verdant_admin',signSession(account.version),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60});return json({ok:true});
 }catch{ return json({error:'Sign-in could not complete. Please try again.'},503)}
}
export async function DELETE(req:Request){if(!originAllowed(req))return json({error:'Request origin rejected.'},403);(await cookies()).delete('verdant_admin');return json({ok:true})}
