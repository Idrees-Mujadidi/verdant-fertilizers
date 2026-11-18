import {cookies} from 'next/headers';
import {createHmac,timingSafeEqual,scryptSync,randomBytes} from 'node:crypto';
import {readDocument,writeDocument} from './storage';
export const AUTH_PATH='private/admin.json';
export type AdminAccount={salt:string,hash:string,version:string,failures:number,lockedUntil:number};
export const safeEqual=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
export function passwordHash(password:string,salt:string){return scryptSync(password,salt,64).toString('hex')}
export function newAccount(password:string):AdminAccount{const salt=randomBytes(32).toString('hex');return {salt,hash:passwordHash(password,salt),version:randomBytes(32).toString('hex'),failures:0,lockedUntil:0}}
export function signSession(version:string){const key=process.env.ADMIN_SESSION_SECRET;if(!key)throw Error('Admin authentication is not configured');const payload=Buffer.from(JSON.stringify({version,expires:Date.now()+8*60*60*1000})).toString('base64url');return payload+'.'+createHmac('sha256',key).update(payload).digest('base64url')}
export function verifySession(token:string,version:string){try{const key=process.env.ADMIN_SESSION_SECRET;if(!key)return false;const [payload,mac,...rest]=token.split('.');if(rest.length||!payload||!mac||!safeEqual(mac,createHmac('sha256',key).update(payload).digest('base64url')))return false;const v=JSON.parse(Buffer.from(payload,'base64url').toString());return v.version===version&&typeof v.expires==='number'&&v.expires>Date.now()}catch{return false}}
export async function isAdmin(){const token=(await cookies()).get('verdant_admin')?.value;if(!token)return false;const record=await readDocument<AdminAccount>(AUTH_PATH);return !!record&&verifySession(token,record.data.version)}
export {readDocument,writeDocument};
