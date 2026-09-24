import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../docs/', import.meta.url));
const args = process.argv.slice(2);
const argValue = (key, fallback) => {
  const i = args.indexOf(key);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const port = Number(argValue('--port',process.env.PORT || '4173'));
const host = argValue('--host','0.0.0.0');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    let file = path.resolve(root, `.${decoded}`);
    if (file !== root.slice(0,-1) && !file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    try {
      if ((await stat(file)).isDirectory()) {
        if (!decoded.endsWith('/')) { res.writeHead(301,{Location:`${url.pathname}/${url.search}`}); res.end(); return; }
        file = path.join(file,'index.html');
      }
    } catch {
      res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});
      res.end(await readFile(path.join(root,'404.html'))); return;
    }
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(port,host,()=>console.log(`CANOD preview: http://${host}:${port}`));
