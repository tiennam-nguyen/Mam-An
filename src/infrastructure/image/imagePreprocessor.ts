import type { ImageProcessor } from '../../application/ports/imageProcessor';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
export const imagePolicy={maxOriginalBytes:20000000,maxRequestBytes:3000000,maxPixels:40000000,analysisEdge:1600,thumbnailEdge:240,quality:0.82,thumbnailQuality:0.7};
function encode(image:ImageBitmap,edge:number,quality:number):Promise<Blob>{
 const ratio=Math.min(1,edge/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
 const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
 context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Encoding failed')),'image/jpeg',quality));
}
export class BrowserImageProcessor implements ImageProcessor {
 async prepare(file:Blob){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size)return fail('INVALID_IMAGE');
  if(file.size>imagePolicy.maxOriginalBytes)return fail('IMAGE_TOO_LARGE');
  let image:ImageBitmap|undefined;
  try{
   image=await createImageBitmap(file);if(image.width*image.height>imagePolicy.maxPixels)return fail('IMAGE_TOO_LARGE');
   const analysisBlob=await encode(image,imagePolicy.analysisEdge,imagePolicy.quality);
   if(analysisBlob.size>imagePolicy.maxRequestBytes)return fail('IMAGE_TOO_LARGE');
   let thumbnail:Blob|null=null;try{thumbnail=await encode(image,imagePolicy.thumbnailEdge,imagePolicy.thumbnailQuality);if(thumbnail.size>200000)thumbnail=null;}catch{/* A thumbnail is optional; analysis remains usable. */}
   return ok({analysisBlob,thumbnail});
  }catch{return fail('INVALID_IMAGE');}finally{image?.close();}
 }
}
