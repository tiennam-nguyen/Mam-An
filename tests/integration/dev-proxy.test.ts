import { createServer as createHttpServer } from 'node:http';
import { createServer as createViteServer, type UserConfig, type ConfigEnv } from 'vite';
import { it, expect } from 'vitest';
import viteConfig from '../../vite.config';

it('development proxy preserves browser origin/Host without contacting providers', async()=>{
 const api=createHttpServer((request,response)=>{
  response.statusCode=request.headers.origin==='http://'+request.headers.host?200:403;
  response.end();
 });
 await new Promise<void>(resolve=>api.listen(0,'127.0.0.1',resolve));
 const address=api.address();
 if(!address||typeof address==='string')throw new Error('Missing local port');
 const config=(viteConfig as (env:ConfigEnv)=>UserConfig)({command:'serve',mode:'test'});
 const proxy=config.server?.proxy?.['/api'];
 if(!proxy)throw new Error('Missing proxy configuration');
 const target='http://127.0.0.1:'+address.port;
 const vite=await createViteServer({configFile:false,plugins:[],server:{host:'127.0.0.1',port:0,proxy:{'/api':typeof proxy==='string'?target:{...proxy,target}}}});
 try {
  await vite.listen();
  const clientAddress=vite.httpServer?.address();
  if(!clientAddress||typeof clientAddress==='string')throw new Error('Missing client port');
  const origin='http://127.0.0.1:'+clientAddress.port;
  const response=await fetch(origin+'/api/v1/analyze-meal',{method:'POST',headers:{origin},body:'synthetic'});
  expect(response.status).toBe(200);
 } finally {
  await vite.close();
  await new Promise<void>((resolve,reject)=>api.close(error=>error?reject(error):resolve()));
 }
},10000);
