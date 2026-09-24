import { readFile, writeFile, mkdir, cp, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'docs');
const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
const books = JSON.parse(await readFile(path.join(root, 'content/books.json'), 'utf8'));
const origin = new URL(site.url).origin;
const esc = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const categories = {
  'word-search': {
    title: 'Large-Print Word Search for Seniors', short: 'Word search', label: 'LARGE-PRINT PUZZLES',
    description: 'Familiar themes, new discoveries, and the simple pleasure of finding the next word. Explore our collection of large-print word searches and puzzles.',
    card: 'A little challenge. A lovely way to unwind.'
  },
  'coloring-books': {
    title: 'Coloring Books for Adults', short: 'Coloring books', label: 'COLORING BOOKS',
    description: 'Slow down and add a little color to your day. Discover bold, easy coloring books inspired by comforting places and everyday moments.',
    card: 'Unplug, pick a color, and make it yours.'
  },
  'logbooks-journals': {
    title: 'Logbooks & Journals', short: 'Logbooks & journals', label: 'LOGBOOKS & JOURNALS',
    description: 'A place for the things you want to remember. Keep track of your hobbies, record the details, and make plans for the adventures ahead.',
    card: 'Keep the details. Make room for the dreams.'
  },
  'practical-guides': {
    title: 'Practical Guides', short: 'Practical guides', label: 'PRACTICAL GUIDES',
    description: 'Clear ideas for the work in front of you. Our practical guides help you approach everyday challenges with a little more confidence.'
  }
};
const arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const externalArrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';

// Fail closed on malformed data or unexpected outbound destinations.
const ids = new Set();
for (const book of books) {
  if (ids.has(book.id) || !/^[a-z0-9-]+$/.test(book.id)) throw new Error(`Invalid or duplicate book ID: ${book.id}`);
  ids.add(book.id);
  if (!categories[book.category]) throw new Error(`Unknown category for ${book.id}`);
  if (!book.title || !book.author || !book.formats?.length) throw new Error(`Incomplete book: ${book.id}`);
  if (book.amazonUrl !== '#') {
    const url = new URL(book.amazonUrl);
    if (url.protocol !== 'https:') throw new Error(`Use HTTPS for ${book.id}`);
    if (!(url.hostname === 'amzn.to' || /(^|\.)amazon\.[a-z.]+$/.test(url.hostname))) throw new Error(`Expected an Amazon URL for ${book.id}`);
  }
  if (book.cover.startsWith('/') || book.cover.includes('..') || /[:\\]/.test(book.cover)) throw new Error(`Cover must be a local asset: ${book.id}`);
}
if (site.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contactEmail)) throw new Error('Invalid contact email');
if (site.newsletter.action && new URL(site.newsletter.action).protocol !== 'https:') throw new Error('Newsletter action must use HTTPS');
if (site.newsletter.privacyUrl && new URL(site.newsletter.privacyUrl).protocol !== 'https:') throw new Error('Newsletter privacy URL must use HTTPS');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

// These are intentionally typographic cover placeholders, not final cover art.
const palettes = { amber:['#d99b49','#28251f','#41321e'], cream:['#f1e6cd','#3c3325','#79562d'], sand:['#c7b89c','#302a22','#514331'], ink:['#39352e','#f4e8cf','#dbba80'] };
for (const [index, book] of books.entries()) {
  const target = path.join(root, book.cover);
  try { await access(target); continue; } catch {}
  await mkdir(path.dirname(target), { recursive: true });
  const [background, ink, accent] = palettes[book.coverStyle] ?? palettes.cream;
  const lines = book.coverLines || [book.title];
  const size = book.id === 'the-accidental-project-manager' ? 53 : lines.some(l => l.length > 13) ? 40 : 52;
  const start = lines.length > 2 ? 166 : 190;
  const rows = lines.map((line, i) => `<text x="42" y="${start + i * 61}" fill="${ink}" font-family="Georgia,serif" font-size="${size}" letter-spacing="-1.8">${esc(line)}</text>`).join('');
  const labelSize = book.coverLabel.length > 30 ? 10 : 12;
  const subtitle = book.id === 'the-accidental-project-manager'
    ? '<text x="42" y="395" fill="#41321e" font-family="Arial,sans-serif" font-size="16"><tspan x="42">The 60-Minute Survival Guide</tspan><tspan x="42" dy="24">for Leading Projects When</tspan><tspan x="42" dy="24">Nobody Reports to You</tspan></text>'
    : `<text x="42" y="409" fill="${accent}" font-family="Georgia,serif" font-size="23" font-style="italic">The CANOD collection</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" role="img" aria-labelledby="title"><title id="title">${esc(book.title)} — placeholder cover</title><rect width="400" height="600" fill="${background}"/><rect x="22" y="22" width="356" height="556" fill="none" stroke="${accent}" stroke-width=".65" opacity=".5"/><path d="M42 96H358M42 492H358" stroke="${accent}" stroke-width="1" opacity=".6"/><text x="42" y="66" font-family="Arial,sans-serif" font-size="${labelSize}" letter-spacing="1.7" fill="${accent}">${esc(book.coverLabel)}</text>${rows}${subtitle}<text x="42" y="538" font-family="Georgia,serif" font-size="21" font-weight="bold" letter-spacing="2" fill="${ink}">CANOD</text><text x="355" y="536" text-anchor="end" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.4" fill="${accent}">ED. ${String(index+1).padStart(2,'0')}</text></svg>`;
  await writeFile(target, svg);
}
await cp(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

function buy(book, className = 'book-buy') {
  const placeholder = book.amazonUrl === '#';
  return `<a class="button ${className}" href="${esc(book.amazonUrl)}" ${placeholder ? 'data-amazon-placeholder' : 'target="_blank" rel="noopener noreferrer"'} aria-label="Buy ${esc(book.title)} on Amazon${placeholder ? ' — link coming soon' : ' (opens in a new tab)'}">Buy on Amazon${externalArrow}</a>`;
}
function prices(book) {
  return book.formats.map(f => `<span><strong>${esc(f.price)}</strong> <span class="format">${esc(f.name)}</span></span>`).join('');
}
function header(base) {
  return `<a class="skip-link" href="#main">Skip to content</a><header class="site-header"><div class="container header-inner"><div class="header-brand"><a class="wordmark" href="${base}" aria-label="CANOD home">CANOD<span class="brand-dot">.</span></a><span class="brand-description">Independent publisher.<br>Thoughtfully Canadian.</span></div><button class="menu-button" type="button" aria-controls="main-navigation" aria-expanded="false" data-menu-button hidden>Menu <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 8h16M4 16h16"/></svg></button><nav class="navigation" id="main-navigation" data-navigation aria-label="Main navigation"><a href="${base}#shop">Shop</a><a href="${base}#categories">Categories</a><a href="${base}#about">About</a><a href="#contact">Contact</a></nav></div></header>`;
}
function collectionLinks(base, selected = 'all') {
  return `<nav class="collection-links" aria-label="Book collections"><a href="${base}#shop"${selected === 'all' ? ' aria-current="page"' : ''}>All books</a>${Object.entries(categories).map(([id,c]) => `<a href="${base}${id}/"${selected === id ? ' aria-current="page"' : ''}>${esc(c.short)}</a>`).join('')}</nav>`;
}
function card(book, base) {
  return `<article class="book-card" id="${book.id}"><div class="book-cover-area"><img class="book-cover" src="${base}${book.cover}" alt="Placeholder cover for ${esc(book.title)}" width="400" height="600" loading="lazy" decoding="async"></div><p class="book-category">${esc(categories[book.category].short)}</p><h3>${esc(book.title)}</h3><p class="book-author">by ${esc(book.author)}</p><p class="book-description">${esc(book.description)}</p><div class="book-purchase"><p class="book-prices">${prices(book)}</p>${buy(book)}</div></article>`;
}
function catalog(base, selected = 'all') {
  const selection = selected === 'all' ? books : books.filter(b => b.category === selected);
  return `<section class="section catalog" id="shop" aria-labelledby="catalog-title"><div class="section-heading"><div><p class="eyebrow">THE CANOD BOOKSHELF</p><h2 id="catalog-title">${selected === 'all' ? 'Find your next good book.' : 'Explore the collection.'}</h2></div><p>${selection.length} ${selection.length === 1 ? 'title' : 'titles'}</p></div>${collectionLinks(base, selected)}<div class="book-grid">${selection.map(b => card(b,base)).join('')}</div><p class="catalog-note">Prices vary by marketplace and edition. Check Amazon for the current price and availability. Covers shown are previews.</p></section>`;
}
function newsletter() {
  const active = Boolean(site.newsletter.action);
  return `<section class="newsletter" id="newsletter" aria-labelledby="newsletter-title"><div><p class="eyebrow">A NOTE FROM OUR BOOKSHELF</p><h2 id="newsletter-title">New releases and free puzzles</h2><p class="newsletter-description">A little something to look forward to in your inbox.</p></div><div>${active ? `<form action="${esc(site.newsletter.action)}" method="post">` : '<div role="group" aria-label="Newsletter sign-up, coming soon">'}<label class="signup-label" for="newsletter-email">Your email address</label><div class="signup-controls"><input type="email" id="newsletter-email" name="${esc(site.newsletter.emailField)}" autocomplete="email" placeholder="you@example.com" aria-describedby="newsletter-note" required ${active ? '' : 'disabled'}><button class="button button-primary" type="${active ? 'submit' : 'button'}" ${active ? '' : 'disabled'}>Subscribe</button></div>${active ? Object.entries(site.newsletter.hiddenFields).map(([name,value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`).join('') : ''}<p class="newsletter-note" id="newsletter-note">${active ? `By subscribing, you agree to receive CANOD emails. Unsubscribe anytime.${site.newsletter.privacyUrl ? ` <a href="${esc(site.newsletter.privacyUrl)}">Privacy information</a>.` : ''}` : 'Sign-ups open soon. No email addresses are collected yet.'}</p>${active ? '</form>' : '</div>'}</div></section>`;
}
function footer(base) {
  return `<footer class="site-footer" id="contact"><div class="container"><div class="footer-top"><div class="footer-brand"><a class="wordmark" href="${base}" aria-label="CANOD home">CANOD<span class="brand-dot">.</span></a><p>Practical books. Quiet moments.<br>A little room for discovery.</p></div><nav class="footer-links" aria-label="Footer navigation"><p class="footer-label">Explore</p><a href="${base}#shop">All books</a><a href="${base}#categories">Categories</a><a href="${base}#about">About CANOD</a></nav><div><p class="footer-label">Get in touch</p>${site.contactEmail ? `<a class="contact-email" href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : `<span class="contact-email">${esc(site.contactPlaceholder)}</span><p class="contact-note">Contact address coming soon.</p>`}</div></div><div class="footer-bottom"><p>© 2026 CANOD. All rights reserved.</p><p>Independent publishing, from Canada.</p></div></div></footer><div class="store-notice" data-store-notice hidden><p role="status" aria-live="polite" data-notice-text></p><button type="button" aria-label="Dismiss notification" data-dismiss-notice>×</button></div>`;
}
function document(title, description, route, body, base = './', noindex = false) {
  const canonical = `${origin}${route}`;
  const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="8" fill="#9b551e"/><text x="24" y="35" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="37" fill="#faf7f0">C</text></svg>');
  const schema = { '@context': 'https://schema.org', '@type': 'Organization', name: site.name, url: origin, description: site.description };
  return `<!doctype html>\n<html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#faf7f0">${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}<meta property="og:type" content="website"><meta property="og:site_name" content="CANOD"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary"><link rel="icon" type="image/svg+xml" href="${icon}"><link rel="stylesheet" href="${base}assets/site.css"><script src="${base}assets/site.js" defer></script><script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head><body>${header(base)}<main id="main">${body}</main>${footer(base)}</body></html>\n`;
}

const featured = books.find(b => b.id === 'the-accidental-project-manager');
const home = `<div class="container"><section class="hero" aria-labelledby="hero-title"><div><p class="eyebrow">THE FEATURED READ</p><h1 id="hero-title">The Accidental<br>Project<br><em>Manager.</em></h1><p class="hero-subtitle">${esc(featured.subtitle)}</p><p class="hero-copy">You didn’t set out to manage a project. Now that it’s yours, find a practical way to bring people together and move the work forward.</p><div class="hero-buy">${buy(featured,'button-primary')}<p class="hero-formats">Kindle <b>$3.99</b><br>Paperback <b>$9.99</b></p></div></div><div class="hero-visual"><img class="hero-cover" src="./${featured.cover}" alt="Placeholder cover for The Accidental Project Manager" width="400" height="600" fetchpriority="high" decoding="async"><span class="cover-caption">Cover preview</span><div class="reading-note" aria-label="A 60-minute guide"><span>A PRACTICAL</span><strong>60</strong><span>MINUTE READ</span></div></div></section><div class="intro-line"><span>Good books for everyday life.</span><span>Independently published in Canada.</span></div><section class="section" id="categories" aria-labelledby="categories-title"><div class="section-heading"><div><p class="eyebrow">SOMETHING FOR YOUR KIND OF DAY</p><h2 id="categories-title">Explore the collections.</h2></div></div><div class="category-grid">${Object.entries(categories).filter(([,c])=>c.card).map(([id,c],i)=>`<a class="category-card" href="./${id}/"><div class="category-top"><span>0${i+1}</span><span>${books.filter(b=>b.category===id).length} TITLES</span></div><h3>${esc(c.title)}</h3><div class="category-bottom"><p>${esc(c.card)}</p>${arrow}</div></a>`).join('')}</div></section>${catalog('./')}<section class="about" id="about" aria-labelledby="about-title"><div><p class="eyebrow">HELLO, WE’RE CANOD</p><h2 id="about-title">Made for the everyday. And the days in between.</h2></div><p class="about-copy">CANOD is an independent Canadian publisher of practical books, puzzles, and journals. From finding your feet at work to finding a quiet moment at home, we publish books that make room for learning, creativity, and the small pleasures of everyday life.</p></section>${newsletter()}</div>`;
await writeFile(path.join(out, 'index.html'), document('CANOD — Books for everyday life', site.description, '/', home));
for (const [id,c] of Object.entries(categories)) {
  const body = `<div class="container"><section class="collection-hero" aria-labelledby="collection-title"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="../">Home</a><span aria-hidden="true">/</span><span aria-current="page">${esc(c.short)}</span></nav><p class="eyebrow">${esc(c.label)}</p><h1 id="collection-title">${esc(c.title)}</h1><p class="collection-description">${esc(c.description)}</p></section>${catalog('../',id)}${newsletter()}</div>`;
  await mkdir(path.join(out,id), {recursive:true});
  await writeFile(path.join(out,id,'index.html'), document(`${c.title} | CANOD`,c.description,`/${id}/`,body,'../'));
}
// 404 asset paths use the intended domain root, including for unknown nested URLs.
await writeFile(path.join(out,'404.html'), document('Page not found | CANOD','Find your way back to the CANOD bookshelf.','/404.html','<div class="container not-found"><p class="eyebrow">PAGE 404</p><h1>This page isn’t on our bookshelf.</h1><p>It may have moved, or the address may be a little off.</p><a class="button button-primary" href="/">Back to the books '+arrow+'</a></div>','/',true));
await writeFile(path.join(out,'CNAME'), `${new URL(origin).hostname}\n`);
await writeFile(path.join(out,'.nojekyll'), '');
await writeFile(path.join(out,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(path.join(out,'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/',...Object.keys(categories).map(id=>`/${id}/`)].map(route=>`<url><loc>${origin}${route}</loc></url>`).join('')}</urlset>\n`);
console.log(`Built ${books.length} books, 4 collection pages, and homepage into docs/.`);
