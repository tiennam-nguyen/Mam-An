import { useEffect,useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServices } from '../../shared/ui/ServicesContext';
import { ErrorNotice,SafetyNote } from '../../shared/ui/common';
import { safetyCopy } from '../../shared/content/safetyCopy';
export function AnalyzePage(){
 const {session,liveEnabled}=useServices(),state=useSyncExternalStore(session.subscribe,session.getSnapshot),navigate=useNavigate();
 const analyzing=state.draft?.analysisState==='ANALYZING';
 useEffect(()=>{if(state.draft&&['REVIEW_READY','REVIEW_REQUIRED'].includes(state.draft.analysisState))navigate('/review');},[state.draft,navigate]);
 useEffect(()=>()=>{if(session.getSnapshot().draft?.analysisState==='ANALYZING')session.cancel();},[session]);
 return <section className="narrow"><p className="eyebrow">BẮT ĐẦU TỪ BỮA ĂN</p><h1>Hôm nay bạn ăn gì?</h1><p>Chọn ảnh để xem trước, hoặc khám phá bằng mâm cơm mẫu.</p><div className="card acquisition">
 {state.draft?.imagePreviewUrl?<img className="preview" src={state.draft.imagePreviewUrl} alt="Ảnh bữa ăn đã chọn"/>:<div className="photo-placeholder"><span>◎</span><h2>Một bức ảnh, một bữa ăn</h2><p>JPEG, PNG hoặc WebP · tối đa 20 MB</p></div>}
 <div className="actions">{(['FILE','CAMERA'] as const).map(source=><label className="button" key={source}>{source==='FILE'?'Chọn ảnh':'Chụp ảnh'}<input aria-label={source==='FILE'?'Chọn ảnh bữa ăn':'Chụp ảnh bữa ăn'} type="file" accept="image/jpeg,image/png,image/webp" capture={source==='CAMERA'?'environment':undefined} hidden disabled={state.preparing} onChange={e=>{const file=e.target.files?.[0];if(file)void session.select(file,source);e.target.value='';}}/></label>)}</div>
 {state.preparing&&<p role="status">Đang chuẩn bị ảnh…</p>}
 {state.draft?.imagePreviewUrl&&<><button className="primary" disabled={analyzing||state.preparing||!liveEnabled} onClick={()=>void session.analyze()}>{analyzing?'Đang phân tích…':'Phân tích trực tiếp'}</button>{!liveEnabled&&<p className="muted">AI trực tiếp chưa bật. Bạn vẫn có thể nhập món thủ công hoặc dùng mẫu.</p>}<SafetyNote kind="privacy"/></>}
 <ErrorNotice error={state.error}/>{analyzing&&<p role="status">Đang chờ gợi ý món ăn…</p>}
 </div><div className="card sample-card"><div><span className="badge">KHÔNG CẦN MẠNG</span><h2>Thử với mâm cơm mẫu</h2><p>{safetyCopy.demo}</p></div><button className="primary" disabled={state.preparing} onClick={()=>void session.sample()}>Dùng bữa ăn mẫu</button></div><div className="actions"><button onClick={()=>session.manual()}>Nhập món thủ công</button><button className="quiet" onClick={()=>session.cancel()}>Hủy phiên</button></div></section>;
}
