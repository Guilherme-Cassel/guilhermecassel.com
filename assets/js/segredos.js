/* =============================================================
   Os segredos do site. Baixado por último, quando o navegador
   está à toa, porque nada aqui é necessário pra ler a página.

     1. O d20 do topo: rola e leva pra uma seção. 20 e 1 são
        especiais, como manda a mesa.
     2. O código Konami (↑ ↑ ↓ ↓ ← → ← → B A): liga e desliga o
        modo difícil do joguinho. Quem aplica a dificuldade é o
        próprio jogo, em site.js; daqui só sai o aviso.
   ============================================================= */
(() => {
  'use strict';

  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const texto = (chave, troca = {}) => {
    let t = window.gcTexto?.(chave);
    if (typeof t !== 'string') return '';
    Object.entries(troca).forEach(([k, v]) => { t = t.replace(`{${k}}`, v); });
    return t;
  };

  /* ---------- Recado: uma faixa que sobe e some --------------- */
  let recado = null, timerRecado = null;

  function avisar(mensagem, duracao = 3200) {
    if (!recado) {
      recado = document.createElement('p');
      recado.className = 'recado';
      recado.setAttribute('role', 'status');
      document.body.append(recado);
    }
    recado.textContent = mensagem;
    recado.classList.add('esta-visivel');
    clearTimeout(timerRecado);
    if (duracao) timerRecado = setTimeout(() => recado.classList.remove('esta-visivel'), duracao);
  }

  /* ---------- 1. O d20 ---------------------------------------- */
  const dado = document.querySelector('[data-d20]');
  let rolando = false;

  const secoes = () => [...document.querySelectorAll('main > section[id]')]
    .filter((s) => s.querySelector('h2'));

  /* ---------- O dado em 3D -----------------------------------
     Um icosaedro de verdade: 12 vértices, 20 faces. A cada quadro
     giramos os vértices, jogamos fora as faces que estão de costas
     (num sólido convexo isso basta, não precisa ordenar nada) e
     desenhamos as outras como polígonos de SVG. A cor de cada face
     vem do CSS, a partir de quanta luz ela pega.                  */
  const SVG = 'http://www.w3.org/2000/svg';
  const PHI = (1 + Math.sqrt(5)) / 2;

  const menos = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unitario = (v) => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; };
  const aplicar = (m, v) => [ponto(m[0], v), ponto(m[1], v), ponto(m[2], v)];
  const vezes = (a, b) => a.map((linha) => [0, 1, 2].map((j) => linha[0] * b[0][j] + linha[1] * b[1][j] + linha[2] * b[2][j]));

  /** Matriz de rotação de `angulo` radianos em torno de `eixo` (Rodrigues). */
  function girarEm(eixo, angulo) {
    const [x, y, z] = eixo, c = Math.cos(angulo), s = Math.sin(angulo), t = 1 - c;
    return [
      [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
      [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
      [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
    ];
  }

  // Os 12 vértices: as três combinações de (0, ±1, ±φ).
  const VERTICES = [];
  [-1, 1].forEach((a) => [-PHI, PHI].forEach((b) => {
    VERTICES.push([0, a, b], [a, b, 0], [b, 0, a]);
  }));
  const RAIO = Math.hypot(1, PHI);
  VERTICES.forEach((v) => { v[0] /= RAIO; v[1] /= RAIO; v[2] /= RAIO; });

  // As 20 faces: todo trio de vértices vizinhos entre si (aresta = 2/RAIO).
  const ARESTA = 2 / RAIO;
  const vizinhos = (i, j) => Math.abs(Math.hypot(...menos(VERTICES[i], VERTICES[j])) - ARESTA) < 1e-6;
  const FACES = [];
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) for (let k = j + 1; k < 12; k += 1) {
    if (!vizinhos(i, j) || !vizinhos(j, k) || !vizinhos(i, k)) continue;
    const [a, b, c] = [VERTICES[i], VERTICES[j], VERTICES[k]];
    const normal = unitario(cruz(menos(b, a), menos(c, a)));
    // a normal tem que apontar pra fora; se não aponta, inverte a ordem
    const fora = ponto(normal, a) > 0;
    FACES.push({ v: fora ? [i, j, k] : [i, k, j], normal: fora ? normal : normal.map((n) => -n) });
  }

  /* A pose de descanso: a face 0 virada de frente pra quem olha, com
     uma ponta pra cima. É nela que o número aparece quando o dado para. */
  const POSE = (() => {
    const frente = FACES[0].normal;
    const centro = FACES[0].v.reduce((s, i) => s.map((n, k) => n + VERTICES[i][k] / 3), [0, 0, 0]);
    const cima = unitario(menos(VERTICES[FACES[0].v[0]], centro));
    return [cruz(cima, frente), cima, frente];
  })();

  const LUZ = unitario([-0.45, 0.6, 0.66]);

  /** Monta um <svg> com o dado e devolve como redesenhá-lo. */
  function criarDado() {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'd20__solido');
    svg.setAttribute('viewBox', '-1.1 -1.1 2.2 2.2');
    svg.setAttribute('aria-hidden', 'true');
    const poligonos = FACES.map(() => svg.appendChild(document.createElementNS(SVG, 'polygon')));
    const numero = svg.appendChild(document.createElementNS(SVG, 'text'));

    /** `giro` é a rotação extra sobre a pose de descanso; `n` é o número a mostrar. */
    const desenhar = (giro, n = null) => {
      const m = giro ? vezes(giro, POSE) : POSE;
      const pontos = VERTICES.map((v) => aplicar(m, v));
      FACES.forEach((face, i) => {
        const normal = aplicar(m, face.normal);
        const p = poligonos[i];
        if (normal[2] <= 0) { p.style.display = 'none'; return; }   // de costas
        p.style.display = '';
        p.style.setProperty('--luz', (0.18 + 0.82 * Math.max(0, ponto(normal, LUZ))).toFixed(3));
        // no SVG o y cresce pra baixo, então inverte
        p.setAttribute('points', face.v.map((k) => `${pontos[k][0].toFixed(3)},${(-pontos[k][1]).toFixed(3)}`).join(' '));
      });
      numero.textContent = n ?? '';
      if (n != null) { numero.setAttribute('x', '0'); numero.setAttribute('y', '-0.02'); }
    };
    return { svg, desenhar };
  }

  /* O dado pequeno do topo: troca o desenho plano pelo sólido e fica
     girando devagar. Para de gastar quadro quando a aba some. */
  const pequeno = criarDado();
  const EIXO_OCIOSO = unitario([0.35, 1, 0.2]);
  let anguloOcioso = 0, quadroOcioso = 0, ultimoOcioso = 0, numeroNoTopo = null;

  if (dado) {
    dado.replaceChildren(pequeno.svg);
    pequeno.desenhar(girarEm(EIXO_OCIOSO, 0.6));
  }

  const ocioso = (agora) => {
    const dt = Math.min(0.05, (agora - ultimoOcioso) / 1000);
    ultimoOcioso = agora;
    // passa o mouse e ele acelera, como quem sacode o dado na mão
    anguloOcioso += dt * (dado.matches(':hover') ? 4.2 : 0.7);
    if (!rolando && numeroNoTopo == null) pequeno.desenhar(girarEm(EIXO_OCIOSO, anguloOcioso));
    quadroOcioso = requestAnimationFrame(ocioso);
  };
  const ligarOcioso = () => {
    cancelAnimationFrame(quadroOcioso);
    if (!dado || calmo.matches || document.hidden) return;
    ultimoOcioso = performance.now();
    quadroOcioso = requestAnimationFrame(ocioso);
  };
  document.addEventListener('visibilitychange', ligarOcioso);
  calmo.addEventListener('change', ligarOcioso);
  ligarOcioso();

  /* O dado grande, que tomba no meio da tela na hora de rolar. */
  let palco = null, grande = null;

  function rolar() {
    if (rolando) return;
    rolando = true;
    const resultado = 1 + Math.floor(Math.random() * 20);

    if (!palco) {
      grande = criarDado();
      palco = document.createElement('div');
      palco.className = 'd20-palco';
      palco.append(grande.svg);
      document.body.append(palco);
    }
    palco.classList.remove('acertou', 'errou');
    void palco.offsetWidth;                       // garante que a entrada anima
    palco.classList.add('esta-visivel');

    /* O tombo: muitas voltas em torno de um eixo torto, freando até
       parar exatamente na pose de descanso (ângulo zero). */
    const eixo = unitario([Math.random() - 0.5, Math.random() - 0.5, 0.35 + Math.random() * 0.4]);
    const voltas = (4 + Math.random() * 2) * Math.PI * 2;
    const duracao = calmo.matches ? 0 : 1500;
    const inicio = performance.now();

    const tombar = (agora) => {
      const t = duracao ? Math.min(1, (agora - inicio) / duracao) : 1;
      const resto = Math.pow(1 - t, 3);            // freia no fim
      if (t < 1) {
        const giro = girarEm(eixo, voltas * resto);
        grande.desenhar(giro);
        pequeno.desenhar(giro);
        requestAnimationFrame(tombar);
        return;
      }
      // parou: o número aparece na face da frente
      grande.desenhar(null, resultado);
      pequeno.desenhar(null, resultado);
      numeroNoTopo = resultado;
      if (resultado === 20) palco.classList.add('acertou');
      if (resultado === 1) palco.classList.add('errou');

      setTimeout(() => {
        palco.classList.remove('esta-visivel');
        rolando = false;
        parar(resultado);
      }, 1100);
      // o dado do topo guarda o número um pouco e volta a girar
      setTimeout(() => { numeroNoTopo = null; }, 4200);
    };
    requestAnimationFrame(tombar);
  }

  function parar(n) {
    if (n === 1) {
      // falha crítica: você tropeça e cai numa rota que não existe
      avisar(texto('eggs.nat1'), 0);
      setTimeout(() => { location.href = '/falha-critica'; }, 2200);
      return;
    }

    const lista = secoes();
    const alvo = n === 20
      ? document.querySelector('#contact')
      : lista[(n - 2) % lista.length];
    if (!alvo) return;

    avisar(n === 20
      ? texto('eggs.nat20')
      : texto('eggs.rollResult', { n, section: alvo.querySelector('h2').textContent }));

    alvo.scrollIntoView({ behavior: calmo.matches ? 'auto' : 'smooth', block: 'start' });
    if (n === 20) {
      alvo.classList.add('acerto-critico');
      setTimeout(() => alvo.classList.remove('acerto-critico'), 2400);
    }
  }

  dado?.addEventListener('click', rolar);

  /* ---------- 2. Konami --------------------------------------- */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let passo = 0;
  let dificil = false;

  addEventListener('keydown', (e) => {
    // quem está digitando num campo não está tentando trapacear
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    passo = tecla === KONAMI[passo] ? passo + 1 : (tecla === KONAMI[0] ? 1 : 0);
    if (passo < KONAMI.length) return;

    passo = 0;
    dificil = !dificil;
    avisar(texto(dificil ? 'eggs.hardOn' : 'eggs.hardOff'));
    document.dispatchEvent(new CustomEvent('jogo:dificil', { detail: dificil }));
  });
})();
