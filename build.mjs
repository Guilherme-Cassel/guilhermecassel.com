/* =============================================================
   build.mjs: grava o texto dos JSON dentro do HTML.

   Roda na sua máquina, sem dependência nenhuma:

       node build.mjs

   Lê   src/index.html (a estrutura) + content/en.json + content/pt.json
   Gera index.html (inglês), pt/index.html (português) e sitemap.xml

   Os arquivos gerados vão pro repositório junto com o resto; o
   Cloudflare Pages só serve o que está commitado, não roda nada.
   Mudou uma frase no JSON? Roda o build de novo antes do commit.

   O site.js continua refazendo o conteúdo no navegador a partir do
   mesmo JSON. Este arquivo existe pra quem chega sem JavaScript:
   buscador, preview de link, leitor de tela em modo simples.
   As funções "montar" daqui espelham as de assets/js/site.js; se
   mudar o HTML de um bloco lá, muda aqui também.
   ============================================================= */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SITE = 'https://guilhermecassel.com';
const hoje = new Date();

const IDIOMAS = [
  { lang: 'en', caminho: '/',    saida: 'index.html',    ogLocale: 'en_US', hreflang: 'en' },
  { lang: 'pt', caminho: '/pt/', saida: 'pt/index.html', ogLocale: 'pt_BR', hreflang: 'pt-BR' },
];

/* Páginas que não passam pelo build mas entram no sitemap, em pares
   de idioma. */
const PARES_EXTRAS = [
  [{ hreflang: 'en', caminho: '/resume/' }, { hreflang: 'pt-BR', caminho: '/curriculo/' }],
];

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const tag = (nome, classe, texto) =>
  `<${nome}${classe ? ` class="${classe}"` : ''}>${esc(texto)}</${nome}>`;

const chips = (itens) =>
  `<div class="row">${itens.map((i) => tag('span', 'badge', i)).join('')}</div>`;

/** Mesma conta de assets/js/site.js: idade e tempo de casa. */
function calcularValor(stat) {
  if (stat.auto === 'age' || stat.auto === 'yearsSince') {
    const de = new Date(stat.from);
    let anos = hoje.getFullYear() - de.getFullYear();
    const passou =
      hoje.getMonth() > de.getMonth() ||
      (hoje.getMonth() === de.getMonth() && hoje.getDate() >= de.getDate());
    if (!passou) anos -= 1;
    return anos;
  }
  return Number(stat.value) || 0;
}

/* ---------- Os blocos que o site.js monta em lista ------------ */
const blocos = (c) => ({
  'data-stats': c.stats.map((s) => {
    const v = calcularValor(s);
    return `<div class="stat"><p class="stat__value"><span data-count="${v}">${v}</span>${esc(s.suffix || '')}</p>` +
           `${tag('p', 'stat__label', s.label)}</div>`;
  }).join(''),

  'data-about-text': c.about.paragraphs.map((p) => tag('p', '', p)).join(''),
  'data-music-text': c.music.paragraphs.map((p) => tag('p', '', p)).join(''),

  'data-timeline': c.experience.items.map((item) =>
    `<li${item.current ? ' class="is-current"' : ''}>${tag('h3', '', item.role)}` +
    tag('p', 'timeline__meta', `${item.org} · ${item.period}`) +
    `<ul class="timeline__bullets">${item.bullets.map((b) => tag('li', '', b)).join('')}</ul></li>`
  ).join(''),

  'data-work': c.projects.work.map((p) =>
    `<article class="card card--interactive work-card">` +
    `<div class="work-card__head">${tag('h3', '', p.name)}${tag('span', 'badge badge--live', p.tag)}</div>` +
    `<dl>${[['problem', p.problem], ['decision', p.decision], ['result', p.result]]
      .map(([k, texto]) => `<div>${tag('dt', '', c.projects.labels[k])}${tag('dd', '', texto)}</div>`).join('')}</dl>` +
    (p.demo ? `<div class="work-card__demo" data-demo="${esc(p.demo)}"></div>` : '') +
    `${chips(p.stack)}</article>`
  ).join(''),

  'data-fases': c.about.phases.map((f) =>
    `<li class="fase"><svg class="fase__icone" viewBox="0 0 24 24" aria-hidden="true"><use href="#fase-${esc(f.icon)}"/></svg>` +
    `${tag('span', 'fase__quando', f.when)}${tag('span', 'fase__nome', f.label)}</li>`
  ).join(''),

  'data-side': c.projects.side.map((p) =>
    `<a class="card card--interactive side-card" href="${esc(p.url)}" target="_blank" rel="noopener">` +
    `${tag('h4', '', p.name)}${tag('p', '', p.desc)}${chips(p.stack)}</a>`
  ).join(''),

  'data-stack': c.stack.groups.map((g) =>
    `<div class="stack-group">${tag('h3', '', g.name)}${chips(g.items)}</div>`
  ).join(''),

  'data-contact-links': c.contact.links.filter((l) => l.url).map((l) =>
    `<a class="link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>`
  ).join(''),

  // A máquina de escrever começa da primeira frase já escrita.
  'data-typewriter': esc(c.hero.roles[0]),
});

function renderizar(molde, c, idioma) {
  const outro = IDIOMAS.find((i) => i !== idioma);
  const pegar = (caminho) =>
    caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), c);
  const texto = (caminho) => {
    const v = pegar(caminho);
    return typeof v === 'string' ? v.replace('{year}', hoje.getFullYear()) : undefined;
  };

  const extras = {
    lang: idioma.lang,
    url: SITE + idioma.caminho,
    ogLocale: idioma.ogLocale,
    altUrl: outro.caminho,
    altLang: outro.hreflang,
  };

  let html = molde;

  // 1. {{chave}} no <head> e nos atributos
  html = html.replace(/\{\{([\w.]+)\}\}/g, (tudo, chave) => {
    const v = extras[chave] ?? texto(chave);
    if (v == null) throw new Error(`Chave {{${chave}}} não existe em content/${idioma.lang}.json`);
    return esc(v);
  });

  // 2. Texto simples: <p data-t="hero.lead"></p>
  html = html.replace(/<(\w+)([^>]*\bdata-t="([^"]+)"[^>]*)>[^<]*<\/\1>/g, (tudo, nome, attrs, chave) => {
    const v = texto(chave);
    return v == null ? tudo : `<${nome}${attrs}>${esc(v)}</${nome}>`;
  });

  // 3. Nome acessível dos botões que só têm ícone
  html = html.replace(/data-label="([^"]+)"/g, (tudo, chave) => {
    const v = texto(chave);
    return v == null ? tudo : `${tudo} aria-label="${esc(v)}"`;
  });

  // 4. Texto alternativo das imagens (e o title, que é o que aparece no hover)
  html = html.replace(/data-alt="([^"]+)"( data-title="([^"]+)")? alt=""/g, (tudo, chaveAlt, attrTitle, chaveTitle) => {
    const alt = texto(chaveAlt) ?? '';
    const title = (chaveTitle && texto(chaveTitle)) || alt;
    return `data-alt="${chaveAlt}"${attrTitle || ''} alt="${esc(alt)}" title="${esc(title)}"`;
  });

  // 5. Links que vêm do JSON
  const link = (nome) => c.contact.links.find((l) => l.name.toLowerCase() === nome)?.url || '#';
  html = html.replace(/data-link="(\w+)" href="#"/g, (tudo, nome) => `data-link="${nome}" href="${esc(link(nome))}"`);
  html = html.replace(/data-cv href="#"/g, `data-cv href="${esc(c.contact.cvUrl)}"`);

  // 6. Os blocos em lista: <div data-stats></div> recebe o conteúdo
  for (const [attr, conteudo] of Object.entries(blocos(c))) {
    const re = new RegExp(`(<(\\w+)[^>]*\\b${attr}\\b[^>]*>)(</\\2>)`);
    if (!re.test(html)) throw new Error(`Não achei o bloco [${attr}] vazio em src/index.html`);
    html = html.replace(re, (tudo, abre, nome, fecha) => abre + conteudo + fecha);
  }

  const aviso = `<!-- GERADO por build.mjs a partir de src/index.html e content/${idioma.lang}.json. ` +
                `Não edite este arquivo: edite a origem e rode "node build.mjs". -->`;
  return html.replace(/^<!doctype html>/i, (d) => `${d}\n${aviso}`);
}

function sitemap() {
  const pares = [IDIOMAS.map((i) => ({ hreflang: i.hreflang, caminho: i.caminho })), ...PARES_EXTRAS];
  const data = hoje.toISOString().slice(0, 10);
  const urls = pares.flatMap((par) => par.map((pagina) =>
    `  <url>\n    <loc>${SITE}${pagina.caminho}</loc>\n    <lastmod>${data}</lastmod>\n` +
    par.map((p) => `    <xhtml:link rel="alternate" hreflang="${p.hreflang}" href="${SITE}${p.caminho}"/>`).join('\n') +
    `\n  </url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n` +
    `${urls.join('\n')}\n</urlset>\n`;
}

/* ---------- Partida ------------------------------------------- */
const molde = (await readFile('src/index.html', 'utf8')).replace(/\r\n/g, '\n');

for (const idioma of IDIOMAS) {
  const c = JSON.parse(await readFile(`content/${idioma.lang}.json`, 'utf8'));
  const html = renderizar(molde, c, idioma);
  const resto = html.match(/\{\{[\w.]+\}\}/);
  if (resto) throw new Error(`Sobrou ${resto[0]} sem preencher em ${idioma.saida}`);
  if (idioma.saida.includes('/')) await mkdir(idioma.saida.split('/').slice(0, -1).join('/'), { recursive: true });
  await writeFile(idioma.saida, html);
  console.log(`✓ ${idioma.saida}  (${(html.length / 1024).toFixed(1)} KB)`);
}

await writeFile('sitemap.xml', sitemap());
console.log('✓ sitemap.xml');
