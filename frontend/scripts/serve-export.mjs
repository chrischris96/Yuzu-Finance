import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/yuzu'){res.writeHead(308,{Location:'/yuzu/'});res.end();return}
  if(!url.pathname.startsWith('/yuzu/')){res.writeHead(404);res.end('Open /yuzu/');return}
  let target=path.resolve(root,decodeURIComponent(url.pathname.slice('/yuzu/'.length))||'.');
  if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(3000,'127.0.0.1',()=>console.log('Yuzu preview: http://127.0.0.1:3000/yuzu/'));
