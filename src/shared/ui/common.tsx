import type { AppError } from '../errors/appError';
import { errorPresenter } from '../../application/services/errorPresenter';
import { safetyCopy } from '../content/safetyCopy';
export const formatNumber=(value:number|null)=>value===null?'Chưa có dữ liệu':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value);
export const formatTime=(value:string)=>new Date(value).toLocaleString('vi-VN',{dateStyle:'medium',timeStyle:'short'});
export function ErrorNotice({error,retry}:{error:AppError|null;retry?:()=>void}){return error?<div className="notice error" role="alert"><p>{errorPresenter(error)}</p>{retry&&<button onClick={retry}>Thử lại</button>}</div>:null;}
export function SafetyNote({kind='estimate'}:{kind?:keyof typeof safetyCopy}){return <p className="safety">{safetyCopy[kind]}</p>;}
export function DemoBadge(){return <span className="badge">Dữ liệu mẫu</span>;}
export function Completeness({value}:{value:string}){return value==='COMPLETE'?null:<p className="notice">{value==='UNKNOWN'?safetyCopy.unknown:safetyCopy.partial}</p>;}
