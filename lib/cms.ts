import {readDocument,writeDocument} from './storage';
export {isAdmin} from './admin-auth';
export type ContentRecord={id:string,kind:string,status:string,revision:number,created_at:string,updated_at:string,[key:string]:any};
const CONTENT_PATH='private/content.json';
export function initialContent():ContentRecord[]{
 const now=new Date().toISOString();
 return [['nitrogen','Nitrogen nutrition','essential','Explore essential crop nutrients','Explore nitrogen-based fertilizer options for your crop nutrition plan. Share your soil analysis, crop, and growth stage with your supplier.'],['npk','NPK blends','balanced','Bring your nutrient plan together','Explore blends containing nitrogen, phosphorus, and potassium. The right nutrient ratio depends on your soil test and crop requirements.'],['soil','Soil enrichment','soil','Start with the ground beneath you','Explore soil amendment options as part of a broader soil care plan. Share your soil conditions and goals with your supplier.']].map(([id,title,category,summary,body])=>({id,title,category,summary,body,kind:'product',status:'published',revision:0,image:'',price:'',size:'',created_at:now,updated_at:now}));
}
export async function contentDocument(){return await readDocument<ContentRecord[]>(CONTENT_PATH)||{data:initialContent(),etag:undefined}}
export async function listContent(admin=false){const {data}=await contentDocument();return data.filter(x=>admin||x.status==='published').sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id))}
export async function saveContent(records:ContentRecord[],etag?:string){await writeDocument(CONTENT_PATH,records,etag)}
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
