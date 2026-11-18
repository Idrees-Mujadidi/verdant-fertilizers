import {get,put} from '@vercel/blob';
export async function readDocument<T>(path:string):Promise<{data:T,etag:string}|null>{
 const r=await get(path,{access:'private',useCache:false});
 if(!r)return null;if(r.statusCode!==200)throw Error('Storage read failed');
 return {data:await new Response(r.stream).json() as T,etag:r.blob.etag};
}
export async function writeDocument(path:string,data:unknown,etag?:string){
 return put(path,JSON.stringify(data),{access:'private',addRandomSuffix:false,contentType:'application/json',allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{}),cacheControlMaxAge:0});
}
