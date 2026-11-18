import {get,head,put,BlobNotFoundError,BlobPreconditionFailedError} from '@vercel/blob';

export function isStorageConflict(error:unknown){
 return error instanceof BlobPreconditionFailedError || (error instanceof Error && /already exists/i.test(error.message));
}

export async function readDocument<T>(path:string):Promise<{data:T,etag:string}|null>{
 // GET's HTTP ETag can describe an encoded representation. Use the Blob API's
 // version for writes, and bracket the uncached body read so it belongs to it.
 for(let attempt=0;attempt<4;attempt++){
  let before;
  try{before=await head(path)}catch(error){if(error instanceof BlobNotFoundError)return null;throw error}
  if(!before.etag)throw new Error('Storage did not return a document version');
  const r=await get(path,{access:'private',useCache:false});
  if(!r)continue;
  if(r.statusCode!==200)throw new Error('Storage read failed');
  const data=await new Response(r.stream).json() as T;
  let after;
  try{after=await head(path)}catch(error){if(error instanceof BlobNotFoundError)continue;throw error}
  if(before.etag===after.etag)return {data,etag:after.etag};
 }
 throw new BlobPreconditionFailedError();
}

export async function writeDocument(path:string,data:unknown,etag?:string){
 if(etag!==undefined&&!etag)throw new Error('Cannot update a document without its version');
 return put(path,JSON.stringify(data),{
  access:'private',addRandomSuffix:false,contentType:'application/json',
  allowOverwrite:etag!==undefined,...(etag!==undefined?{ifMatch:etag}:{}),cacheControlMaxAge:0,
 });
}
