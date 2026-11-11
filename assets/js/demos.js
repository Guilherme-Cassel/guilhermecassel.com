/* =============================================================
   As demonstrações dentro dos cards de "Work".

   Um projeto que tem "demo" no JSON ganha um <div data-demo="...">
   vazio dentro do card (quem cria é o site.js e o build.mjs). Este
   arquivo preenche cada um. Só é baixado quando a seção de projetos
   chega perto da tela.

     label      etiqueta de material que se redesenha enquanto você digita
     signature  assinatura de e-mail desenhada em canvas, com o peso em KB
     sheets     seis planilhas que viram um painel
     net        o caminho de quem chega de fora até a aplicação na DMZ

   Tudo aqui é ilustração com dado inventado: o sistema de verdade lê
   do ERP e do Microsoft Graph, e nada disso está exposto no site.
   ============================================================= */
(() => {
  'use strict';

  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const SVG = 'http://www.w3.org/2000/svg';
  const t = (chave) => window.gcTexto?.(`demos.${chave}`) ?? '';

  /** Cria um elemento HTML ou SVG com atributos e filhos. */
  const el = (nome, attrs = {}, ...filhos) => {
    const svg = ['svg', 'g', 'rect', 'path', 'text', 'circle', 'line', 'animateMotion'].includes(nome);
    const no = svg ? document.createElementNS(SVG, nome) : document.createElement(nome);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'text') no.textContent = v;
      else no.setAttribute(k, v);
    });
    no.append(...filhos);
    return no;
  };

  const campo = (rotulo, valor, attrs = {}) => {
    const input = el('input', { class: 'field', type: 'text', value: valor, ...attrs });
    return { input, no: el('label', { class: 'demo__campo' }, el('span', { text: rotulo }), input) };
  };

  /* ===========================================================
     label: a etiqueta de material
     =========================================================== */

  /* Intercalado 2 de 5: cada dígito são 5 elementos, 2 largos (W).
     Um par de dígitos vira 5 barras (o primeiro) entrelaçadas com 5
     espaços (o segundo). É o ^B2 do ZPL. */
  const ITF = ['NNWWN', 'WNNNW', 'NWNNW', 'WWNNN', 'NNWNW', 'WNWNN', 'NWWNN', 'NNNWW', 'WNNWN', 'NWNWN'];

  function barras(digitos) {
    const largura = (c) => (c === 'W' ? 5 : 2);
    const lista = [];              // { x, w } de cada barra preta
    let x = 0;
    const barra = (w) => { lista.push({ x, w }); x += w; };
    const espaco = (w) => { x += w; };

    barra(2); espaco(2); barra(2); espaco(2);                  // início
    for (let i = 0; i < digitos.length; i += 2) {
      const a = ITF[digitos[i]], b = ITF[digitos[i + 1]];
      for (let j = 0; j < 5; j += 1) { barra(largura(a[j])); espaco(largura(b[j])); }
    }
    barra(5); espaco(2); barra(2);                             // fim
    return { lista, total: x };
  }

  function demoEtiqueta(alvo) {
    const codigo = campo(t('label.code'), '00421708', { inputmode: 'numeric', maxlength: '12' });
    const desc = campo(t('label.desc'), t('label.defaultDesc'), { maxlength: '26' });
    const lote = campo(t('label.lot'), 'L2611-08', { maxlength: '12' });

    const papel = el('svg', { class: 'etiqueta', viewBox: '0 0 320 172', role: 'img' });
    const zpl = el('pre', { class: 'demo__codigo' });

    const desenhar = () => {
      // o código de barras só aceita dígito, e em quantidade par
      let digitos = codigo.input.value.replace(/\D/g, '') || '0';
      if (digitos.length % 2) digitos = `0${digitos}`;
      const descricao = desc.input.value.toUpperCase();
      const numeroLote = lote.input.value.toUpperCase();

      const { lista, total } = barras(digitos);
      const escala = Math.min(2.2, 288 / total);
      const inicio = 16;

      papel.replaceChildren(
        el('rect', { class: 'etiqueta__papel', x: 1, y: 1, width: 318, height: 170, rx: 8 }),
        el('text', { class: 'etiqueta__titulo', x: 16, y: 34, text: descricao }),
        el('g', {}, ...lista.map((b) => el('rect', {
          class: 'etiqueta__barra', x: inicio + b.x * escala, y: 50, width: b.w * escala, height: 66,
        }))),
        el('text', { class: 'etiqueta__digitos', x: inicio, y: 134, text: digitos }),
        el('text', { class: 'etiqueta__lote', x: 16, y: 158, text: `${t('label.lot').toUpperCase()} ${numeroLote}` }),
        el('text', { class: 'etiqueta__data', x: 304, y: 158, text: new Date().toLocaleDateString() }),
      );
      papel.setAttribute('aria-label', `${descricao}, ${digitos}`);

      zpl.textContent = [
        '^XA',
        `^FO30,30^A0N,36,36^FD${descricao}^FS`,
        `^FO30,85^BY2^B2N,90,Y,N^FD${digitos}^FS`,
        `^FO30,215^A0N,28,28^FD${t('label.lot').toUpperCase()} ${numeroLote}^FS`,
        '^XZ',
      ].join('\n');
    };

    [codigo, desc, lote].forEach((c) => c.input.addEventListener('input', desenhar));
    alvo.append(
      el('div', { class: 'demo__campos' }, desc.no, codigo.no, lote.no),
      papel,
      el('p', { class: 'demo__rotulo', text: t('label.zpl') }),
      zpl,
      el('p', { class: 'demo__nota', text: t('label.note') }),
    );
    desenhar();
  }

  /* ===========================================================
     signature: a assinatura de e-mail
     =========================================================== */
  function demoAssinatura(alvo) {
    const nome = campo(t('signature.name'), t('signature.defaultName'), { maxlength: '32' });
    const cargo = campo(t('signature.role'), t('signature.defaultRole'), { maxlength: '38' });

    // 2x de propósito: é o que mantém a letra nítida em tela de alta densidade
    const L = 380, A = 96, DENSIDADE = 2;
    const tela = el('canvas', { class: 'assinatura__tela', width: L * DENSIDADE, height: A * DENSIDADE, role: 'img' });
    const peso = el('span', { class: 'assinatura__peso' });
    const ctx = tela.getContext('2d');
    const fonte = '"Segoe UI", Arial, sans-serif';

    const desenhar = () => {
      ctx.setTransform(DENSIDADE, 0, 0, DENSIDADE, 0, 0);
      ctx.clearRect(0, 0, L, A);                      // fundo transparente, como a de verdade

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(0, 8, 4, A - 16);

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 20px ${fonte}`;
      ctx.fillText(nome.input.value, 18, 34, L - 24);

      ctx.fillStyle = '#2563eb';
      ctx.font = `600 13px ${fonte}`;
      ctx.fillText(cargo.input.value, 18, 54, L - 24);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(18, 64, 150, 1);

      ctx.fillStyle = '#64748b';
      ctx.font = `400 12px ${fonte}`;
      ctx.fillText(t('signature.footer'), 18, 82, L - 24);

      tela.setAttribute('aria-label', `${nome.input.value}, ${cargo.input.value}`);
      tela.toBlob((blob) => {
        if (!blob) return;
        peso.textContent = t('signature.size').replace('{kb}', (blob.size / 1024).toFixed(1));
      }, 'image/png');
    };

    [nome, cargo].forEach((c) => c.input.addEventListener('input', desenhar));
    alvo.append(
      el('div', { class: 'demo__campos' }, nome.no, cargo.no),
      // e-mail tem fundo branco, então a prévia também
      el('div', { class: 'assinatura__email' }, tela),
      el('p', { class: 'demo__rotulo' }, peso),
      el('p', { class: 'demo__nota', text: t('signature.note') }),
    );
    desenhar();
  }

  /* ===========================================================
     sheets: seis planilhas viram um painel
     =========================================================== */
  function demoPlanilhas(alvo) {
    // onde cada planilha começa: x, y e um giro leve, pra parecer bagunça
    const SOLTAS = [[14, 12, -8], [84, 4, 5], [236, 10, -4], [8, 86, 6], [226, 92, 9], [150, 104, -6]];

    const planilha = ([x, y, giro]) => el('g', { class: 'planilha', style: `--x:${x};--y:${y};--giro:${giro}deg` },
      el('rect', { class: 'planilha__folha', width: 64, height: 46, rx: 4 }),
      el('rect', { class: 'planilha__topo', width: 64, height: 10, rx: 4 }),
      el('path', { class: 'planilha__grade', d: 'M0 22H64M0 34H64M22 10V46M43 10V46' }));

    const painel = el('g', { class: 'painel' },
      el('rect', { class: 'painel__fundo', x: 70, y: 22, width: 180, height: 116, rx: 8 }),
      el('rect', { class: 'painel__topo', x: 70, y: 22, width: 180, height: 16, rx: 8 }),
      ...[82, 138, 194].map((x) => el('rect', { class: 'painel__kpi', x, y: 48, width: 46, height: 26, rx: 4 })),
      ...[[84, 40], [104, 26], [124, 34], [144, 18], [164, 30], [184, 12], [204, 22], [224, 8]].map(([x, topo]) =>
        el('rect', { class: 'painel__barra', x, y: 84 + topo, width: 12, height: 46 - topo, rx: 2 })));

    const desenho = el('svg', { class: 'planilhas', viewBox: '0 0 320 160', 'aria-hidden': 'true' },
      painel, ...SOLTAS.map(planilha));
    const legenda = el('span', { class: 'demo__rotulo' });
    const botao = el('button', { class: 'chip-btn', type: 'button', text: t('sheets.toggle') });

    let depois = false;
    const mostrar = () => {
      desenho.classList.toggle('depois', depois);
      legenda.textContent = t(depois ? 'sheets.after' : 'sheets.before');
    };
    botao.addEventListener('click', () => { depois = !depois; mostrar(); });

    alvo.append(desenho, el('div', { class: 'demo__linha' }, legenda, botao));
    mostrar();

    // Roda sozinha uma vez, quando o card aparece de verdade na tela.
    const olheiro = new IntersectionObserver((entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      olheiro.disconnect();
      setTimeout(() => { depois = true; mostrar(); }, calmo.matches ? 0 : 900);
    }, { threshold: 0.7 });
    olheiro.observe(desenho);
  }

  /* ===========================================================
     net: de fora até a aplicação, passando pela DMZ
     =========================================================== */
  function demoRede(alvo) {
    const caixa = (x, y, w, h, rotulo, classe = '') => el('g', { class: `rede__no ${classe}` },
      el('rect', { x, y, width: w, height: h, rx: 6 }),
      el('text', { x: x + w / 2, y: y + h / 2 + 4, text: rotulo }));

    const desenho = el('svg', { class: 'rede', viewBox: '0 0 340 176', role: 'img', 'aria-label': t('net.caption') },
      // a DMZ é a cerca tracejada em volta da VM
      el('rect', { class: 'rede__dmz', x: 196, y: 8, width: 138, height: 160, rx: 10 }),
      el('text', { class: 'rede__titulo', x: 206, y: 26, text: 'DMZ' }),

      el('path', { class: 'rede__fio', d: 'M76 70H104M168 70H206' }),
      el('path', { class: 'rede__fio rede__fio--interno', d: 'M136 88V122' }),
      el('path', { class: 'rede__fio', d: 'M265 64V72M265 100V108' }),

      caixa(6, 52, 70, 36, 'Internet'),
      el('text', { class: 'rede__legenda', x: 41, y: 104, text: t('net.domain') }),
      caixa(104, 52, 64, 36, 'Firewall', 'rede__no--firewall'),
      caixa(92, 122, 88, 30, t('net.lan'), 'rede__no--interno'),

      caixa(206, 36, 118, 28, 'Ubuntu · Hyper-V'),
      caixa(206, 72, 118, 28, 'Coolify · Docker'),
      caixa(206, 108, 118, 28, 'Blazor Server', 'rede__no--app'),
    );

    // o pacote que vem de fora: entra pelo firewall e para na DMZ
    if (!calmo.matches) {
      desenho.append(el('circle', { class: 'rede__pacote', r: 4 },
        el('animateMotion', { dur: '2.8s', repeatCount: 'indefinite', path: 'M76 70 H206' })));
    }

    alvo.append(desenho, el('p', { class: 'demo__nota', text: t('net.caption') }));
  }

  /* ---------- Partida ----------------------------------------- */
  const DEMOS = { label: demoEtiqueta, signature: demoAssinatura, sheets: demoPlanilhas, net: demoRede };

  document.querySelectorAll('[data-demo]').forEach((alvo) => {
    const montar = DEMOS[alvo.dataset.demo];
    if (!montar || alvo.childElementCount) return;
    montar(alvo);
    alvo.classList.add('esta-pronta');
  });
})();
