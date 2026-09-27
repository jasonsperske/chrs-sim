// Development server. Like a static host with a 404 page, it serves
// index.html for paths with no file, so deep links like /radio/<id> load.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {extname,join,normalize,resolve} from 'node:path';
const root=resolve(process.argv[2]||'.'),port=Number(process.env.PORT)||5173;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.md':'text/markdown; charset=utf-8'};
createServer(async (request,response)=>{
  let path=join(root,normalize(decodeURIComponent(new URL(request.url,'http://localhost').pathname)));
  let status=200;
  if(!path.startsWith(root)){response.writeHead(403).end();return}
  try{if((await stat(path)).isDirectory())path=join(path,'index.html');await stat(path)}
  catch{path=join(root,'index.html');status=404}
  try{const body=await readFile(path);response.writeHead(status,{'content-type':types[extname(path)]||'application/octet-stream'}).end(body)}
  catch{response.writeHead(404).end('Not found')}
}).listen(port,'0.0.0.0',()=>console.log(`Serving ${root} at http://localhost:${port}/`));
