import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const docs = path.join(root,'docs');
const books = JSON.parse(await readFile(path.join(root,'content/books.json'),'utf8'));
const walk = async(dir) => (await Promise.all((await readdir(dir,{withFileTypes:true})).map(e=>e.isDirectory()?walk(path.join(dir,e.name)):path.join(dir,e.name)))).flat();
const files = await walk(docs);
const htmlFiles = files.filter(f=>f.endsWith('.html'));
for(const file of htmlFiles) {
  const html = await readFile(file,'utf8');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${file}: exactly one page heading`);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  const idList = [...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(idList.length,new Set(idList).size,`${file}: duplicate IDs`);
  for (const [,attr,url] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|data:)/.test(url) || url === '#') continue;
    const [pathname,fragment] = url.split('#');
    let target = pathname ? (pathname.startsWith('/') ? path.join(docs,pathname) : path.resolve(path.dirname(file),pathname)) : file;
    if (target.endsWith('/') || !path.extname(target)) target = path.join(target,'index.html');
    await access(target);
    if (fragment && attr==='href') {
      const targetHtml = target===file ? html : await readFile(target,'utf8');
      assert(targetHtml.includes(`id="${fragment}"`),`${file}: missing anchor ${url}`);
    }
  }
}
const homepage = await readFile(path.join(docs,'index.html'),'utf8');
assert.equal((homepage.match(/class="book-card"/g)||[]).length,11);
for(const book of books) assert(homepage.includes(`id="${book.id}"`));
assert.equal((homepage.match(/data-amazon-placeholder/g)||[]).length,12);
for(const [category,count] of [['word-search',5],['coloring-books',2],['logbooks-journals',3],['practical-guides',1]]) {
  const html=await readFile(path.join(docs,category,'index.html'),'utf8');
  assert.equal((html.match(/class="book-card"/g)||[]).length,count,`${category}: category count`);
}
console.log(`Checked ${htmlFiles.length} HTML pages: 11 titles, category counts, local assets, links, anchors, and placeholder links passed.`);
