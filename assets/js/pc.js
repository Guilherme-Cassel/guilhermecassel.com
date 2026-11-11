/* =============================================================
   O PC que se desmonta, no fim do "Sobre".

   É o computador de verdade em que este site foi escrito, modelado
   à mão a partir de fotos: gabinete aquário com vidro na lateral e
   na frente, nove fans de luz branca, water cooler com o radiador no
   topo, a placa de vídeo com a tampa holográfica. Nenhuma biblioteca
   3D: são caixas e discos girados, projetados e pintados num canvas,
   do mais distante pro mais próximo.

   Conforme a página rola, as peças se afastam umas das outras (a
   "vista explodida" de manual de montagem). Arrastar gira o gabinete.

   Só é baixado quando a seção chega perto da tela, e só gasta quadro
   enquanto está visível.

   Eixos do modelo: x vai da traseira (-1) pra frente (+1) do gabinete,
   y é a altura (0 a 2.1) e z vem da câmara de trás (-0.6) até o vidro
   lateral (+0.6), que é o lado de quem olha.
   ============================================================= */
(() => {
  'use strict';

  const raiz = document.querySelector('[data-pc]');
  const tela = raiz?.querySelector('[data-pc-tela]');
  if (!raiz || !tela) return;

  const ctx = tela.getContext('2d');
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- A lista de peças, ao lado do desenho ------------- */
  const nomes = window.gcTexto?.('pc.parts') || [];
  const lista = raiz.querySelector('[data-pc-pecas]');
  let destaque = 0;                       // número da peça em foco, 0 = nenhuma
  if (lista) {
    lista.replaceChildren(...nomes.map((nome, i) => {
      const li = document.createElement('li');
      li.textContent = nome;
      li.addEventListener('pointerenter', () => { destaque = i + 1; pedirQuadro(); });
      li.addEventListener('pointerleave', () => { destaque = 0; pedirQuadro(); });
      return li;
    }));
  }

  /* ---------- As peças ----------------------------------------
     Cada peça diz onde fica, do que é feita e pra onde vai quando o
     gabinete se abre (`abre`). `n` liga a peça à lista ao lado.     */
  const PRETO = [18, 20, 26], GRAFITE = [34, 38, 48], PLACA = [86, 94, 108];

  const caixa = (c, s, cor, abre, extra = {}) => ({ tipo: 'caixa', c, s, cor, abre, ...extra });
  const fan = (c, eixo, r, abre, extra = {}) => ({ tipo: 'fan', c, eixo, r, abre, ...extra });

  const PECAS = [
    // a estrutura do gabinete
    caixa([0, 0.05, 0], [2, 0.1, 1.2], PRETO, [0, -0.55, 0]),                       // base
    caixa([-0.98, 1.05, 0.15], [0.04, 1.9, 0.9], PRETO, [-0.5, 0, 0]),              // traseira
    caixa([0, 1.05, -0.31], [1.96, 1.9, 0.02], GRAFITE, [0, 0, 0]),                 // bandeja da placa-mãe
    caixa([0, 1.05, -0.46], [2, 1.9, 0.28], PRETO, [0, 0, -0.75], { n: 9, marca: [0.72, -0.55, 0] }),   // câmara de trás (fonte)
    caixa([0, 2.05, 0], [2, 0.1, 1.2], PRETO, [0, 0.95, 0]),                        // tampa

    // placa-mãe e o que vai espetado nela
    caixa([-0.15, 1.2, -0.28], [1.25, 1.35, 0.04], PLACA, [0, 0, 0.16], { n: 6, camuflada: true }),
    caixa([-0.28, 1.5, -0.2], [0.24, 0.24, 0.12], PRETO, [0, 0.06, 0.95], { n: 3, bloco: true }),   // bloco do water cooler sobre o Ryzen
    ...[0, 1, 2, 3].map((i) =>
      caixa([0.1 + i * 0.065, 1.47, -0.19], [0.035, 0.6, 0.14], [14, 15, 19], [0.12, 0.1, 0.62 + i * 0.07], { n: i === 0 ? 4 : 0 })),
    caixa([-0.3, 1.13, -0.25], [0.34, 0.07, 0.02], [205, 208, 214], [0, 0, 0.42], { n: 7 }),          // SSD M.2
    caixa([-0.2, 0.82, 0.02], [1.2, 0.16, 0.56], [24, 27, 34], [0, -0.02, 0.85], { n: 5, holografica: true }),   // placa de vídeo

    // refrigeração: radiador no topo com três fans, mais seis fans em volta
    caixa([0, 1.93, 0.14], [1.7, 0.1, 0.72], [16, 18, 23], [0, 0.55, 0], { n: 2, aletas: true }),
    ...[-0.56, 0, 0.56].map((x) => fan([x, 1.855, 0.14], 'y', 0.26, [0, 0.36, 0])),
    ...[-0.56, 0, 0.56].map((x) => fan([x, 0.13, 0.14], 'y', 0.26, [0, -0.3, 0])),
    ...[0.72, 1.4].map((y) => fan([0.9, y, 0.14], 'x', 0.3, [0.55, 0, 0], { n: y > 1 ? 8 : 0 })),
    fan([-0.93, 1.5, 0.12], 'x', 0.27, [-0.72, 0, 0]),

    // os vidros e a faixa dos botões, por último porque ficam na frente
    caixa([0, 1.05, 0.6], [2, 1.9, 0.015], null, [0, 0, 1.15], { vidro: true, n: 1, marca: [-0.72, 0.62, 0] }),
    caixa([1, 1.05, 0.15], [0.015, 1.9, 0.9], null, [1.05, 0, 0], { vidro: true }),
    caixa([1, 1.05, -0.46], [0.03, 1.9, 0.28], PRETO, [1.05, 0, -0.75], { painel: true }),
  ];

  // as duas mangueiras do water cooler: do bloco até o radiador
  const MANGUEIRAS = [{ de: [-0.2, 1.56, -0.12], ate: [0.62, 1.88, 0.05] }, { de: [-0.2, 1.48, -0.12], ate: [0.7, 1.88, 0.12] }];
  const BLOCO = PECAS.find((p) => p.bloco), RADIADOR = PECAS.find((p) => p.aletas);

  /* ---------- Câmera ------------------------------------------ */
  const CENTRO = [0, 1.05, 0];
  const LUZ = (() => { const v = [-0.35, 0.75, 0.55], n = Math.hypot(...v); return v.map((k) => k / n); })();
  let giro = -0.62, inclina = 0.3;        // de frente pro canto, um pouco de cima
  let L = 0, A = 0, escala = 1, escalaFechado = 1, escalaAberto = 1, dpr = 1;

  let cosG = 1, senG = 0, cosI = 1, senI = 0;
  const mirar = () => { cosG = Math.cos(giro); senG = Math.sin(giro); cosI = Math.cos(inclina); senI = Math.sin(inclina); };

  /** Gira um vetor do modelo pro espaço da câmera (z positivo = perto). */
  const girar = ([x, y, z]) => {
    const x1 = x * cosG + z * senG, z1 = -x * senG + z * cosG;
    return [x1, y * cosI - z1 * senI, y * senI + z1 * cosI];
  };
  /** Do modelo pra tela, com um pouco de perspectiva. */
  const projetar = (p) => {
    const [x, y, z] = girar([p[0] - CENTRO[0], p[1] - CENTRO[1], p[2] - CENTRO[2]]);
    const f = 11 / (11 - z);
    return [L / 2 + x * escala * f, A * 0.52 - y * escala * f, z];
  };

  const soma = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
  const rgb = (cor, luz = 1, alfa = 1) =>
    `rgba(${Math.round(cor[0] * luz)},${Math.round(cor[1] * luz)},${Math.round(cor[2] * luz)},${alfa})`;

  /* ---------- Desenho ----------------------------------------- */
  const FACES = [    // cantos de cada face de uma caixa e pra onde ela aponta
    [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]],
    [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
  ];

  const tracar = (pontos) => {
    ctx.beginPath();
    pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
  };

  function facesDaCaixa(peca, centro, itens) {
    const apagada = destaque && peca.n !== destaque ? 0.35 : 1;
    FACES.forEach(([normal, cantos]) => {
      const n = girar(normal);
      if (n[2] <= 0.001) return;                               // de costas pra câmera
      const pts = cantos.map((k) => projetar([
        centro[0] + k[0] * peca.s[0] / 2, centro[1] + k[1] * peca.s[1] / 2, centro[2] + k[2] * peca.s[2] / 2]));
      const fundo = pts.reduce((s, p) => s + p[2], 0) / 4;
      const luz = 0.5 + 0.5 * Math.max(0, normal[0] * LUZ[0] + normal[1] * LUZ[1] + normal[2] * LUZ[2]);

      itens.push({ z: fundo, pintar() {
        ctx.globalAlpha = apagada;
        tracar(pts);
        if (peca.vidro) {
          ctx.fillStyle = 'rgba(150,175,230,0.07)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(190,210,255,0.5)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          // o reflexo atravessado que todo vidro tem
          const [a, b, c, d] = pts;
          ctx.beginPath();
          ctx.moveTo(a[0] + (b[0] - a[0]) * 0.12, a[1] + (b[1] - a[1]) * 0.12);
          ctx.lineTo(d[0] + (c[0] - d[0]) * 0.34, d[1] + (c[1] - d[1]) * 0.34);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = Math.max(3, escala * 0.07);
          ctx.stroke();
        } else {
          let tinta = rgb(peca.cor, luz);
          const deCima = normal[1] === 1, deFrente = normal[2] === 1;
          if (peca.holografica && deCima) {
            // a tampa da placa de vídeo, que muda de cor conforme o ângulo
            const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
            const fase = (giro * 0.9 + 10) % 1;
            [[0, '#262a33'], [0.3 + fase * 0.1, '#3b4a6b'], [0.45 + fase * 0.1, '#c2607e'], [0.52 + fase * 0.1, '#e0b25a'],
              [0.6 + fase * 0.1, '#5fd0b4'], [0.72 + fase * 0.1, '#4a6fd0'], [1, '#20242c']].forEach(([p, c]) => g.addColorStop(Math.min(1, p), c));
            tinta = g;
          }
          ctx.fillStyle = tinta;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.09)';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (peca.camuflada && deFrente) manchas(pts);
          if (peca.aletas && deFrente) riscos(pts, 26);
          if (peca.painel && normal[0] === 1) botoes(pts);
          if (peca.bloco && deFrente) {
            const [cx, cy] = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2];
            ctx.beginPath();
            ctx.arc(cx, cy, escala * 0.07, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(210,200,255,0.95)';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#b9a6ff'; ctx.shadowBlur = 10 * dpr;
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
        ctx.globalAlpha = 1;
      } });
    });
  }

  /** Um ponto dentro de um quadrilátero, por coordenadas de 0 a 1. */
  const dentro = ([a, b, c, d], u, v) => {
    const x1 = a[0] + (b[0] - a[0]) * u, y1 = a[1] + (b[1] - a[1]) * u;
    const x2 = d[0] + (c[0] - d[0]) * u, y2 = d[1] + (c[1] - d[1]) * u;
    return [x1 + (x2 - x1) * v, y1 + (y2 - y1) * v];
  };

  // o estampado claro da placa-mãe, que é a marca registrada dela
  const MANCHAS = [[0.08, 0.72, 0.3, 0.2], [0.62, 0.78, 0.26, 0.14], [0.05, 0.1, 0.22, 0.16], [0.7, 0.08, 0.2, 0.24], [0.42, 0.42, 0.16, 0.12]];
  function manchas(pts) {
    ctx.fillStyle = 'rgba(225,230,238,0.5)';
    MANCHAS.forEach(([u, v, w, h]) => {
      tracar([dentro(pts, u, v), dentro(pts, u + w, v), dentro(pts, u + w * 0.8, v + h), dentro(pts, u + w * 0.15, v + h)]);
      ctx.fill();
    });
  }
  function riscos(pts, quantos) {
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < quantos; i += 1) {
      const a = dentro(pts, i / quantos, 0.1), b = dentro(pts, i / quantos, 0.9);
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    }
    ctx.stroke();
  }
  // a faixa da frente: botão de ligar, reset, fone, USB e o pendrive azul
  function botoes(pts) {
    [[0.9, 0.3, '#8b93a5'], [0.84, 0.2, '#6b7283'], [0.79, 0.14, '#3b4150']].forEach(([v, r, cor]) => {
      const [x, y] = dentro(pts, 0.5, v);
      ctx.beginPath();
      ctx.arc(x, y, escala * 0.1 * r, 0, Math.PI * 2);
      ctx.fillStyle = cor;
      ctx.fill();
    });
    const [x, y] = dentro(pts, 0.5, 0.7);
    ctx.fillStyle = '#3aa0ff';
    ctx.shadowColor = '#3aa0ff'; ctx.shadowBlur = 12 * dpr;
    ctx.fillRect(x - escala * 0.01, y - escala * 0.02, escala * 0.09, escala * 0.04);
    ctx.shadowBlur = 0;
  }

  /** Um fan: a moldura quadrada, o disco de luz branca e as pás girando. */
  function desenharFan(peca, centro, itens, tempo) {
    const apagada = destaque && destaque !== 8 ? 0.35 : 1;
    // dois vetores no plano do disco, conforme o eixo em que ele gira
    const [u, v] = peca.eixo === 'y' ? [[1, 0, 0], [0, 0, 1]] : [[0, 0, 1], [0, 1, 0]];
    const em = (a, raio) => projetar(soma(soma(centro, u, Math.cos(a) * raio), v, Math.sin(a) * raio));
    const meio = projetar(centro);
    const r = peca.r;

    itens.push({ z: meio[2], pintar() {
      ctx.globalAlpha = apagada;
      // moldura
      tracar([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => projetar(soma(soma(centro, u, a * r * 1.08), v, b * r * 1.08))));
      ctx.fillStyle = 'rgba(12,14,19,0.92)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // o disco aceso
      const borda = Array.from({ length: 30 }, (_, i) => em((i / 30) * Math.PI * 2, r));
      tracar(borda);
      ctx.fillStyle = 'rgba(236,231,255,0.93)';
      ctx.shadowColor = 'rgba(185,166,255,0.95)';
      ctx.shadowBlur = 22 * dpr;
      ctx.fill();
      ctx.shadowBlur = 0;

      // sete pás, girando
      ctx.fillStyle = 'rgba(40,36,62,0.5)';
      const angulo = tempo * 5.5 + centro[0] * 3 + centro[1];
      for (let k = 0; k < 7; k += 1) {
        const a = angulo + (k / 7) * Math.PI * 2;
        tracar([em(a, r * 0.3), em(a + 0.34, r * 0.96), em(a + 0.72, r * 0.96), em(a + 0.42, r * 0.3)]);
        ctx.fill();
      }
      // o miolo, com o adesivo redondo
      tracar(Array.from({ length: 18 }, (_, i) => em((i / 18) * Math.PI * 2, r * 0.32)));
      ctx.fillStyle = 'rgba(16,18,24,0.96)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,255,0.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    } });
  }

  function desenharMangueira({ de, ate }, e, itens) {
    const a = soma(de, BLOCO.abre, e), b = soma(ate, RADIADOR.abre, e);
    // sai reto do bloco em direção ao vidro, sobe e entra no radiador
    const c1 = soma(a, [0.18, 0.12, 0.42]), c2 = soma(b, [0.02, -0.5, 0.28]);
    const pontos = Array.from({ length: 15 }, (_, i) => {
      const t = i / 14, m = 1 - t;
      return projetar([0, 1, 2].map((k) => m * m * m * a[k] + 3 * m * m * t * c1[k] + 3 * m * t * t * c2[k] + t * t * t * b[k]));
    });
    itens.push({ z: pontos[7][2] + 0.05, pintar() {
      ctx.globalAlpha = destaque && destaque !== 2 ? 0.35 : 1;
      ctx.beginPath();
      pontos.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0b0c10';
      ctx.lineWidth = Math.max(3, escala * 0.07);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = Math.max(1, escala * 0.018);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } });
  }

  let aberto = 0, alvo = 0;          // 0 = montado, 1 = todo desmontado

  function desenhar(tempo) {
    mirar();
    // montado ele ocupa menos espaço, então pode aparecer maior
    escala = escalaFechado + (escalaAberto - escalaFechado) * (aberto * aberto * (3 - 2 * aberto));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);

    // o brilho que o gabinete joga na mesa
    const chao = projetar([0, -0.2 - aberto * 0.5, 0.1]);
    const halo = ctx.createRadialGradient(chao[0], chao[1], 0, chao[0], chao[1], escala * 2.4);
    halo.addColorStop(0, 'rgba(150,130,255,0.22)');
    halo.addColorStop(1, 'rgba(150,130,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, L, A);

    const e = aberto * aberto * (3 - 2 * aberto);      // suaviza a saída e a chegada
    const itens = [];
    PECAS.forEach((peca) => {
      const centro = soma(peca.c, peca.abre, e);
      if (peca.tipo === 'fan') desenharFan(peca, centro, itens, tempo);
      else facesDaCaixa(peca, centro, itens);
    });
    MANGUEIRAS.forEach((m) => desenharMangueira(m, e, itens));

    // pinta do mais distante pro mais próximo
    itens.sort((a, b) => a.z - b.z).forEach((item) => item.pintar());

    // os números que ligam cada peça à lista, quando já dá pra ver as peças
    const visivel = Math.min(1, Math.max(0, (e - 0.3) / 0.35));
    if (visivel > 0) {
      ctx.font = `700 ${Math.max(10, Math.round(escala * 0.11))}px ui-monospace, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      PECAS.filter((p) => p.n).forEach((peca) => {
        // `marca` desloca o número dentro da peça, pra um não cair em cima do outro
        const [x, y] = projetar(soma(soma(peca.c, peca.abre, e), peca.marca || [0, 0, 0]));
        const raio = Math.max(9, escala * 0.1);
        const foco = destaque === peca.n;
        ctx.globalAlpha = visivel * (destaque && !foco ? 0.4 : 1);
        ctx.beginPath();
        ctx.arc(x, y, raio * (foco ? 1.3 : 1), 0, Math.PI * 2);
        ctx.fillStyle = foco ? '#ffd166' : '#3b6bff';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = foco ? '#1a1202' : '#fff';
        ctx.fillText(String(peca.n), x, y + 0.5);
      });
      ctx.globalAlpha = 1;
    }
    raiz.classList.toggle('esta-aberto', e > 0.45);
  }

  /* ---------- Tamanho, rolagem e arrasto ----------------------- */
  function dimensionar() {
    const r = tela.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    L = r.width; A = r.height;
    tela.width = Math.round(L * dpr);
    tela.height = Math.round(A * dpr);
    // o modelo montado ocupa uns 3.3 por 2.9; desmontado, uns 5.4 por 4.5
    escalaFechado = Math.min(L / 3.3, A / 2.9);
    escalaAberto = Math.min(L / 5.4, A / 4.5);
  }

  /** Quanto abrir: fica montado até aparecer inteiro na tela, e daí em
      diante cada pedaço de rolagem afasta as peças um pouco mais. */
  function medirRolagem() {
    const r = tela.getBoundingClientRect();
    const p = (innerHeight - 24 - r.bottom) / (innerHeight * 0.36);
    alvo = calmo.matches ? 0.62 : Math.min(1, Math.max(0, p));
  }

  let quadro = 0, visivel = false, ultimo = 0, tempo = 0;
  let arrastando = false, ultimoX = 0, balanco = 0;

  const laco = (agora) => {
    quadro = 0;
    const dt = Math.min(0.05, (agora - ultimo) / 1000 || 0);
    ultimo = agora;
    if (!calmo.matches) tempo += dt;
    // o gabinete persegue a rolagem com um atraso leve, pra não tremer
    aberto += (alvo - aberto) * Math.min(1, dt * 7);
    if (Math.abs(alvo - aberto) < 0.001) aberto = alvo;
    // parado, ele balança de leve de um lado pro outro
    if (!arrastando && !calmo.matches) {
      const novo = Math.sin(tempo * 0.5) * 0.09;
      giro += novo - balanco;
      balanco = novo;
    }
    desenhar(tempo);
    if (visivel && !document.hidden && !calmo.matches) quadro = requestAnimationFrame(laco);
  };
  function pedirQuadro() {
    if (!quadro) { ultimo = performance.now(); quadro = requestAnimationFrame(laco); }
  }

  new IntersectionObserver((entradas) => {
    visivel = entradas.some((x) => x.isIntersecting);
    if (visivel) { medirRolagem(); pedirQuadro(); }
  }, { rootMargin: '120px 0px' }).observe(tela);

  addEventListener('scroll', () => { if (visivel) { medirRolagem(); pedirQuadro(); } }, { passive: true });
  addEventListener('resize', () => { dimensionar(); medirRolagem(); pedirQuadro(); });
  document.addEventListener('visibilitychange', pedirQuadro);
  calmo.addEventListener('change', () => { medirRolagem(); pedirQuadro(); });

  tela.addEventListener('pointerdown', (ev) => {
    arrastando = true; ultimoX = ev.clientX;
    tela.setPointerCapture(ev.pointerId);
  });
  tela.addEventListener('pointermove', (ev) => {
    if (!arrastando) return;
    giro = Math.min(1.1, Math.max(-2.2, giro + (ev.clientX - ultimoX) * 0.008));
    ultimoX = ev.clientX;
    pedirQuadro();
  });
  ['pointerup', 'pointercancel'].forEach((tipo) => tela.addEventListener(tipo, () => { arrastando = false; }));
  // no teclado, as setas giram
  tela.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    ev.preventDefault();
    giro = Math.min(1.1, Math.max(-2.2, giro + (ev.key === 'ArrowLeft' ? -0.12 : 0.12)));
    pedirQuadro();
  });

  dimensionar();
  medirRolagem();
  aberto = alvo;
  pedirQuadro();
})();
