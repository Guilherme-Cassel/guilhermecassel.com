/* =============================================================
   A prévia do joguinho no topo da página.

   É uma janelinha onde o jogo se joga sozinho: os canos passam e o
   monograma desvia por conta própria. Não tem som, não tem placar e
   ninguém perde; serve só pra avisar que lá embaixo tem um jogo.
   Clicar nela leva pro jogo de verdade (quem cuida disso é o site.js).

   Pausa sozinha quando sai da tela ou a aba fica em segundo plano, e
   quem pediu menos movimento recebe um quadro parado.
   ============================================================= */
(() => {
  'use strict';

  const moldura = document.querySelector('[data-previa]');
  const tela = moldura?.querySelector('canvas');
  if (!moldura || !tela) return;

  const ctx = tela.getContext('2d');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');

  // As mesmas medidas lógicas do jogo: tudo vive numa altura de 280.
  const ALTURA = 280, CHAO = 14, AVE_R = 13, CANO_L = 48;
  const GRAVIDADE = 1050, PULO = 300, VEL = 105, VAO = 124, ESPACO = 300;

  let L = 640, aveX = 140, aveY = ALTURA / 2, aveV = 0, canos = [];
  let cor = {};

  const lerCores = () => {
    const s = getComputedStyle(document.documentElement);
    const t = (nome) => s.getPropertyValue(nome).trim();
    cor = { marca: t('--blue-600'), cano: t('--border-strong'), canoTopo: t('--border') };
  };
  new MutationObserver(() => { lerCores(); desenhar(); }).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme'],
  });

  const novoCano = (x) => ({ x, topo: 36 + Math.random() * (ALTURA - CHAO - 72 - VAO) });

  function dimensionar() {
    const r = tela.getBoundingClientRect();
    if (!r.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const escala = r.height / ALTURA;
    L = r.width / escala;
    aveX = Math.max(90, L * 0.22);
    tela.width = Math.round(r.width * dpr);
    tela.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);

    // canos suficientes pra cobrir a largura toda, e mais um de folga
    canos = [];
    for (let x = aveX + 220; x < L + ESPACO; x += ESPACO) canos.push(novoCano(x));
  }

  const quadrado = (x, y, w, h, raio, tinta) => {
    ctx.fillStyle = tinta;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, raio);
    ctx.fill();
  };

  function desenhar() {
    ctx.clearRect(0, 0, L, ALTURA);
    quadrado(0, ALTURA - CHAO, L, CHAO, 0, cor.canoTopo);

    canos.forEach((c) => {
      const boca = 12, baixoY = c.topo + VAO;
      quadrado(c.x, 0, CANO_L, c.topo - boca, 4, cor.cano);
      quadrado(c.x - 4, c.topo - boca, CANO_L + 8, boca, 4, cor.canoTopo);
      quadrado(c.x - 4, baixoY, CANO_L + 8, boca, 4, cor.canoTopo);
      quadrado(c.x, baixoY + boca, CANO_L, ALTURA - CHAO - baixoY - boca, 4, cor.cano);
    });

    ctx.save();
    ctx.translate(aveX, aveY);
    ctx.rotate(Math.max(-0.5, Math.min(0.7, aveV / 620)));
    quadrado(-AVE_R, -AVE_R, AVE_R * 2, AVE_R * 2, 7, cor.marca);
    ctx.fillStyle = '#fff';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GC', 0, 5);
    ctx.restore();
  }

  function passo(dt) {
    canos.forEach((c) => { c.x -= VEL * dt; });
    if (canos[0].x + CANO_L < -10) {
      canos.shift();
      canos.push(novoCano(canos[canos.length - 1].x + ESPACO));
    }

    /* O piloto automático: mira o meio do vão do próximo cano e bate
       asa sempre que está abaixo dele e já caindo. Simples assim. */
    const proximo = canos.find((c) => c.x + CANO_L > aveX - AVE_R) || canos[0];
    const alvo = proximo.topo + VAO * 0.62;
    if (aveY > alvo && aveV > -40) aveV = -PULO;

    aveV += GRAVIDADE * dt;
    aveY = Math.min(ALTURA - CHAO - AVE_R, Math.max(AVE_R, aveY + aveV * dt));
  }

  /* ---------- Laço: só roda enquanto dá pra ver --------------- */
  let quadro = 0, ultimo = 0, visivel = false;

  const laco = (agora) => {
    const dt = Math.min(0.033, (agora - ultimo) / 1000);
    ultimo = agora;
    passo(dt);
    desenhar();
    quadro = requestAnimationFrame(laco);
  };

  const ajustar = () => {
    cancelAnimationFrame(quadro);
    if (!visivel || document.hidden || calmo.matches) { desenhar(); return; }
    ultimo = performance.now();
    quadro = requestAnimationFrame(laco);
  };

  new IntersectionObserver((entradas) => {
    visivel = entradas.some((e) => e.isIntersecting);
    ajustar();
  }, { threshold: 0.1 }).observe(tela);
  document.addEventListener('visibilitychange', ajustar);
  calmo.addEventListener('change', ajustar);
  addEventListener('resize', () => { dimensionar(); desenhar(); });

  lerCores();
  dimensionar();
  // uns segundos de jogo adiantados, pra prévia já nascer no meio da ação
  for (let i = 0; i < 90; i += 1) passo(1 / 30);
  desenhar();
  moldura.classList.add('esta-pronta');
})();
