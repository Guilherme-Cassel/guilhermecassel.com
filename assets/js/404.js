/* =============================================================
   A página de erro e o corredor que mora nela.

   É o mesmo gênero do joguinho que aparece quando a internet cai:
   pula o obstáculo, a coisa acelera, uma hora você bate. O bicho e
   os cactos são desenhados aqui em retângulos, um a um. Nenhum
   sprite foi copiado de lugar nenhum: o mérito da brincadeira é a
   mecânica, e essa é de domínio de todo mundo.

   Canvas 2D e um laço de rAF, sem engine e sem dependência, igual
   ao resto do site.
   ============================================================= */
(() => {
  'use strict';

  const $ = (s) => document.querySelector(s);

  /* ---------- Texto da página --------------------------------- */
  let conteudo = null;

  async function carregarTexto() {
    const idioma = localStorage.getItem('idioma') === 'pt' ? 'pt' : 'en';
    try {
      conteudo = await (await fetch(`/content/${idioma}.json`, { cache: 'no-cache' })).json();
      document.documentElement.lang = conteudo.meta.lang;
      document.querySelectorAll('[data-t]').forEach((el) => {
        const v = el.dataset.t.split('.').reduce((o, k) => o?.[k], conteudo);
        if (typeof v === 'string') el.textContent = v;
      });
      document.querySelectorAll('[data-label]').forEach((el) => {
        const v = el.dataset.label.split('.').reduce((o, k) => o?.[k], conteudo);
        if (typeof v === 'string') el.setAttribute('aria-label', v);
      });
    } catch (erro) {
      console.error(erro);   // sem o JSON, o inglês que está no HTML já serve
    }
  }

  const frase = (chave, reserva) => conteudo?.notFound?.[chave] || reserva;

  /* ===========================================================
     O corredor
     =========================================================== */
  function prepararCorrida() {
    const tela = $('[data-corrida]');
    const dica = $('[data-corrida-dica]');
    if (!tela) return;

    const ctx = tela.getContext('2d');
    const ALTURA = 160;              // altura lógica; a largura varia com a tela
    const CHAO = 130;                // linha do chão
    let L = 600, escala = 1;

    let cor = {};
    const lerCores = () => {
      const s = getComputedStyle(document.documentElement);
      const t = (n) => s.getPropertyValue(n).trim();
      cor = { tinta: t('--text-muted'), forte: t('--text'), marca: t('--brand'), fraca: t('--border-strong') };
    };
    new MutationObserver(lerCores).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });

    const dimensionar = () => {
      const r = tela.getBoundingClientRect();
      if (!r.height) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      escala = r.height / ALTURA;
      L = r.width / escala;
      tela.width = Math.round(r.width * dpr);
      tela.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
      if (!rodando) desenhar();
    };
    addEventListener('resize', dimensionar);

    /* ---------- Estado ---------------------------------------- */
    const RECORDE = 'recorde-404';
    /* O recorde a bater é meu, e é 404. Fica no placar como se fosse
       um HI qualquer até alguém passar; aí o recorde da pessoa assume. */
    const MEU_RECORDE = 404;
    const BICHO_X = 48, BICHO_L = 22, BICHO_A = 24;
    const GRAVIDADE = 2100, PULO = 620;

    let y, vy, cactos, nuvens, distancia, rodando, morto, ultimo, quadro, passo;
    const seuRecorde = Number(localStorage.getItem(RECORDE) || 0);
    let recorde = Math.max(seuRecorde, MEU_RECORDE);
    let venceu = seuRecorde > MEU_RECORDE;
    const desafio = $('[data-corrida-desafio]');
    if (venceu && desafio) desafio.textContent = frase('gameBeat', '');

    const pontos = () => Math.floor(distancia / 12);
    const velocidade = () => Math.min(430, 200 + pontos() * 2.2);

    function armar() {
      y = 0; vy = 0; distancia = 0; morto = false; passo = 0;
      cactos = [{ x: L + 120, tipo: 0 }];
      nuvens = [{ x: L * 0.4, y: 34 }, { x: L * 0.9, y: 58 }];
    }

    const novoCacto = (ultimoX) => ({
      x: ultimoX + 260 + Math.random() * 260,
      tipo: Math.floor(Math.random() * 3),
    });

    /* ---------- Desenho ---------------------------------------- */
    const px = (x, cy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(cy), w, h); };

    /* O bicho: um lagarto de caixinhas. Duas pernas que se revezam
       enquanto ele corre, e o olho vira um X quando ele bate. */
    function desenharBicho(bx, by) {
      const c = cor.forte;
      px(bx, by + 6, 15, 12, c);                       // corpo
      px(bx + 12, by, 10, 9, c);                       // cabeça
      px(bx + 21, by + 4, 3, 2, c);                    // focinho
      px(bx - 4, by + 7, 5, 4, c);                     // cauda
      if (morto) {                                     // olho em X
        px(bx + 15, by + 2, 2, 2, cor.marca);
        px(bx + 17, by + 4, 2, 2, cor.marca);
        px(bx + 17, by + 2, 2, 2, cor.marca);
        px(bx + 15, by + 4, 2, 2, cor.marca);
      } else {
        px(bx + 17, by + 2, 3, 3, cor.marca);          // olho
      }
      const correndo = !morto && y === 0;
      const esq = correndo && passo % 2 === 0;
      px(bx + 2, by + 18, 4, esq ? 6 : 3, c);
      px(bx + 9, by + 18, 4, esq ? 3 : 6, c);
    }

    function desenharCacto(cx, tipo) {
      const c = cor.tinta;
      const alturas = [22, 30, 26];
      const a = alturas[tipo];
      px(cx, CHAO - a, 7, a, c);                       // tronco
      px(cx - 5, CHAO - a + 7, 5, 3, c);               // braço esquerdo
      px(cx - 5, CHAO - a + 7, 3, 9, c);
      px(cx + 7, CHAO - a + 12, 5, 3, c);              // braço direito
      px(cx + 9, CHAO - a + 12, 3, 8, c);
      if (tipo === 2) { px(cx + 14, CHAO - 18, 6, 18, c); }   // um par colado
    }

    function desenhar() {
      ctx.clearRect(0, 0, L, ALTURA);

      nuvens.forEach((n) => {
        px(n.x, n.y, 18, 4, cor.fraca);
        px(n.x + 4, n.y - 3, 10, 3, cor.fraca);
      });

      px(0, CHAO, L, 2, cor.fraca);                    // chão
      for (let i = (-distancia % 36); i < L; i += 36) {  // pedrinhas
        px(i, CHAO + 5, 5, 2, cor.fraca);
        px(i + 16, CHAO + 4, 2, 2, cor.fraca);
      }

      cactos.forEach((c) => desenharCacto(c.x, c.tipo));
      desenharBicho(BICHO_X, CHAO - BICHO_A - y);

      ctx.fillStyle = cor.tinta;
      ctx.font = '600 13px ui-monospace, monospace';
      ctx.textAlign = 'right';
      const placar = String(pontos()).padStart(5, '0');
      ctx.fillText(recorde ? `HI ${String(recorde).padStart(5, '0')}   ${placar}` : placar, L - 8, 20);
      ctx.textAlign = 'left';
    }

    /* ---------- Física ----------------------------------------- */
    function mover(dt) {
      const v = velocidade();
      distancia += v * dt;

      vy -= GRAVIDADE * dt;
      y += vy * dt;
      if (y <= 0) { y = 0; vy = 0; }

      passo = Math.floor(distancia / 22);              // troca de perna

      nuvens.forEach((n) => { n.x -= v * 0.22 * dt; });
      if (nuvens[0].x < -30) { nuvens.shift(); nuvens.push({ x: L + 40, y: 24 + Math.random() * 44 }); }

      cactos.forEach((c) => { c.x -= v * dt; });
      if (cactos[0].x < -30) cactos.shift();
      const derradeiro = cactos[cactos.length - 1];
      if (derradeiro.x < L - 200) cactos.push(novoCacto(derradeiro.x));

      /* Colisão com folga: a caixa do bicho é menor que o desenho,
         senão parece injusto, e jogo que parece injusto ninguém joga. */
      const bx = BICHO_X + 3, bl = BICHO_L - 6;
      const by = CHAO - BICHO_A - y + 4, ba = BICHO_A - 6;
      for (const c of cactos) {
        const cl = c.tipo === 2 ? 20 : 12;
        const ca = [22, 30, 26][c.tipo];
        if (bx + bl > c.x - 5 && bx < c.x + cl && by + ba > CHAO - ca) { fim(); return; }
      }
    }

    function fim() {
      morto = true; rodando = false;
      cancelAnimationFrame(quadro);
      if (pontos() > recorde) {
        recorde = pontos();
        localStorage.setItem(RECORDE, String(recorde));
        if (!venceu) {                       // passou de mim pela primeira vez
          venceu = true;
          if (desafio) desafio.textContent = frase('gameBeat', '');
        }
      }
      desenhar();
      if (dica) dica.textContent = frase('gameOver', 'You crashed. Press again to run.');
    }

    function laco(agora) {
      if (!rodando) return;
      const dt = Math.min(0.032, (agora - ultimo) / 1000 || 0);
      ultimo = agora;
      mover(dt);
      if (rodando) desenhar();
      quadro = requestAnimationFrame(laco);
    }

    /* ---------- Entradas ---------------------------------------- */
    function acionar() {
      if (morto || !rodando) {                         // começa ou recomeça
        lerCores(); dimensionar(); armar();
        rodando = true; ultimo = performance.now();
        if (dica) dica.textContent = frase('gameHint', 'Press space, or tap, to run');
        quadro = requestAnimationFrame(laco);
        return;
      }
      if (y === 0) vy = PULO;                          // pula só no chão
    }

    tela.addEventListener('pointerdown', (e) => { e.preventDefault(); tela.focus({ preventScroll: true }); acionar(); });
    tela.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'ArrowUp' && e.key !== 'Enter') return;
      e.preventDefault();
      acionar();
    });

    /* Fora da tela o jogo para: rAF rodando à toa não serve a ninguém. */
    new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting || !rodando) return;
        rodando = false;
        cancelAnimationFrame(quadro);
      });
    }, { threshold: 0 }).observe(tela);

    lerCores();
    armar();
    dimensionar();
    desenhar();
  }

  carregarTexto().finally(prepararCorrida);
})();
