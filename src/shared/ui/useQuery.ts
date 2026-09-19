import { useCallback,useEffect,useState } from 'react';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../errors/appError';
export function useQuery<T>(load:()=>Promise<Result<T,AppError>>){
 const [state,setState]=useState<{loading:boolean;data:T|null;error:AppError|null}>({loading:true,data:null,error:null}),[revision,setRevision]=useState(0);
 const retry=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{let active=true;setState({loading:true,data:null,error:null});load().then(result=>{if(active)setState(result.ok?{loading:false,data:result.value,error:null}:{loading:false,data:null,error:result.error});}).catch(()=>{if(active)setState({loading:false,data:null,error:{code:'STORAGE_READ_FAILED',source:'STORAGE',retryable:true,requestId:null,detail:null}});});return()=>{active=false;};},[load,revision]);
 return {...state,retry};
}
