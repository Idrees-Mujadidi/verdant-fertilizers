import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export const db=()=>{if(!env.DB)throw new Error('Database unavailable');return env.DB};
export async function isAdmin(){
 const user=await getChatGPTUser();if(!user)return false;
 const existing=await db().prepare("SELECT value FROM settings WHERE key='admin_user_id'").first<{value:string}>();
 if(existing)return existing.value===user.userId;
 const email=(env as any).ADMIN_BOOTSTRAP_EMAIL;
 if(!email||user.email.toLowerCase()!==email.toLowerCase())return false;
 await db().prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('admin_user_id',?)").bind(user.userId).run();
 const pinned=await db().prepare("SELECT value FROM settings WHERE key='admin_user_id'").first<{value:string}>();return pinned?.value===user.userId;
}
export async function seed(){
 const existing=await db().prepare("SELECT value FROM settings WHERE key='seeded_v1'").first();if(existing)return;
 const now=new Date().toISOString();
 const examples=[['nitrogen','Nitrogen nutrition','essential','Explore essential crop nutrients','Explore nitrogen-based fertilizer options for your crop nutrition plan. Share your soil analysis, crop, and growth stage with your supplier.'],['npk','NPK blends','balanced','Bring your nutrient plan together','Explore blends containing nitrogen, phosphorus, and potassium. The right nutrient ratio depends on your soil test and crop requirements.'],['soil','Soil enrichment','soil','Start with the ground beneath you','Explore soil amendment options as part of a broader soil care plan. Share your soil conditions and goals with your supplier.']];
 await db().batch([...examples.map(([id,title,category,summary,body])=>db().prepare("INSERT OR IGNORE INTO content(id,kind,status,data,created_at,updated_at) SELECT ?,'product','published',?,?,? WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key='seeded_v1')").bind(id,JSON.stringify({title,category,summary,body,image:'',price:'',size:''}),now,now)),db().prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('seeded_v1','1')")]);
}
export async function listContent(admin=false){await seed();const rows=await db().prepare('SELECT * FROM content '+(admin?'':"WHERE status='published'")+' ORDER BY created_at DESC,id').all<any>();return rows.results.map(r=>({...r,...JSON.parse(r.data),data:undefined}));}
export function validate(v:any){
 if(!v||!['product','blog'].includes(v.kind)||!['draft','published'].includes(v.status))throw new Error('Choose a valid content type and status.');
 const out:any={};for(const [key,max] of Object.entries({title:120,summary:300,body:30000,image:2000,category:30,price:80,size:80})){if(typeof v[key]!=='string'&&v[key]!=null)throw new Error('Invalid '+key);out[key]=(v[key]||'').trim();if(out[key].length>max)throw new Error(key+' is too long.');}
 if(!out.title||!out.body)throw new Error('Title and description/content are required.');
 if(v.kind==='product'&&!['essential','balanced','soil'].includes(out.category))throw new Error('Choose a product category.');
 if(out.image&&!/^\/media\/[a-f0-9-]+$/.test(out.image)){let url;try{url=new URL(out.image)}catch{throw new Error('Use a valid HTTPS image URL.')}if(url.protocol!=='https:')throw new Error('Image URL must start with https://.');}
 return out;
}
export function originAllowed(req:Request){return req.headers.get('origin')===new URL(req.url).origin;}
export function json(data:any,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export function esc(x:any){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}
