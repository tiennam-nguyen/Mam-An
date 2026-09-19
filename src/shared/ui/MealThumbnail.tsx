import { useEffect,useState } from 'react';
import type { ThumbnailRef } from '../../domain/meal/meal';
import { useServices } from './ServicesContext';
export function MealThumbnail({reference}:{reference:ThumbnailRef|null}){
 const {thumbnails}=useServices(),[url,setUrl]=useState<string|null>(null);
 useEffect(()=>{let active=true,objectUrl:string|null=null;setUrl(null);if(reference?.kind==='BUNDLED_ASSET')setUrl(reference.path);else if(reference)void thumbnails.get(reference.id).then(result=>{if(active&&result.ok&&result.value){objectUrl=URL.createObjectURL(result.value.blob);setUrl(objectUrl);}});return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl);};},[reference,thumbnails]);
 return url?<img className="meal-thumb" src={url} alt="" onError={()=>setUrl(null)}/>:<div className="meal-thumb placeholder" aria-hidden="true">◌</div>;
}
