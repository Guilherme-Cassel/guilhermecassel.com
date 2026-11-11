/* =============================================================
   O trombone tocável da seção de música, em 3D.

   Só é baixado quando a seção chega perto da tela (quem decide é o
   site.js). Nenhum arquivo de áudio e nenhuma biblioteca 3D: o som é
   um oscilador passando por um filtro, e o instrumento é um modelo
   feito de tubos e de superfícies de revolução, girado, projetado e
   pintado num canvas, do mais distante pro mais próximo.

   O modelo segue as proporções de um trombone tenor de verdade,
   medidas numa foto de catálogo e conferidas com as medidas usuais:
   uns 115 cm de ponta a ponta e campana de 8 polegadas (20 cm).
   Uma unidade do modelo vale 0,306 cm.

   Como um trombone funciona, e como isto aqui imita:
     - a vara tem 7 posições; cada uma abaixa a nota meio tom
     - pra abaixar meio tom o tubo precisa ficar 5,9% mais longo, e a
       vara dobra o que sai: por isso as posições NÃO são igualmente
       espaçadas. Vão de uns 8 cm entre a 1ª e a 2ª até quase 11 cm
       entre a 6ª e a 7ª, e é assim que estão aqui
     - na 3ª posição a mão chega na borda da campana
     - o lábio escolhe o harmônico (aqui, os quatro botões)
     - entre uma posição e outra a nota escorrega: é o glissando

   Só faz som enquanto você segura a vara. Arrastar fora dela gira o
   instrumento.
   ============================================================= */
(() => {
  'use strict';

  const raiz = document.querySelector('[data-trombone]');
  const vara = raiz?.querySelector('[data-trombone-vara]');
  if (!raiz || !vara) return;

  const leituraPosicao = raiz.querySelector('[data-trombone-posicao]');
  const leituraNota = raiz.querySelector('[data-trombone-nota]');
  const botoes = [...raiz.querySelectorAll('[data-trombone-parcial]')];
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');

  // Os harmônicos da 1ª posição de um trombone tenor em si bemol.
  const PARCIAIS = [116.54, 174.61, 233.08, 293.66];   // Bb2, F3, Bb3, D4
  const NOTAS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

  let posicao = 1;        // 1 a 7, com casas decimais no meio do caminho
  let parcial = 1;
  let soprando = false;

  const frequencia = () => PARCIAIS[parcial] * Math.pow(2, -(posicao - 1) / 12);

  const nomeDaNota = (hz) => {
    const midi = Math.round(69 + 12 * Math.log2(hz / 440));
    return `${NOTAS[midi % 12]}${Math.floor(midi / 12) - 1}`;
  };

  /* A física da vara. Um trombone em si bemol tem uns 270 cm de tubo;
     cada centímetro que a vara sai acrescenta dois. MEIO_TUBO é metade
     do tubo, em unidades do modelo. */
  const MEIO_TUBO = 441.5;
  /** Quanto a vara sai (em unidades do modelo) numa posição. */
  const saida = (p) => MEIO_TUBO * (Math.pow(2, (p - 1) / 12) - 1);
  /** O contrário: em que posição a vara está, dado o quanto saiu. */
  const posicaoDe = (s) => 1 + 12 * Math.log2(1 + Math.max(0, s) / MEIO_TUBO);

  /* ---------- Som ------------------------------------------- */
  let ctx = null, osc = null, filtro = null, ganho = null;
  const VOLUME = 0.11;    // baixo de propósito: isto aqui é um portfólio

  function soprar() {
    if (soprando) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!ctx) ctx = new Audio();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    const hz = frequencia();
    osc = ctx.createOscillator();
    filtro = ctx.createBiquadFilter();
    ganho = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz, t);

    /* O ataque de um metal é o filtro abrindo: a nota nasce abafada
       e ganha brilho em poucos centésimos de segundo. */
    filtro.type = 'lowpass';
    filtro.Q.value = 2.2;
    filtro.frequency.setValueAtTime(hz * 1.3, t);
    filtro.frequency.exponentialRampToValueAtTime(hz * 5, t + 0.09);

    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(VOLUME, t + 0.05);

    osc.connect(filtro).connect(ganho).connect(ctx.destination);
    osc.start(t);
    soprando = true;
    raiz.classList.add('esta-soando');
    pedirQuadro();
  }

  function calar() {
    if (!soprando) return;
    soprando = false;
    raiz.classList.remove('esta-soando');
    const t = ctx.currentTime;
    ganho.gain.cancelScheduledValues(t);
    ganho.gain.setValueAtTime(Math.max(0.0001, ganho.gain.value), t);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.stop(t + 0.12);
    osc = filtro = ganho = null;
    pedirQuadro();
  }

  /** A nota persegue a vara com um atraso mínimo: é isso que faz o
      glissando soar contínuo em vez de degrau por degrau. */
  function afinar() {
    if (!soprando) return;
    const t = ctx.currentTime, hz = frequencia();
    osc.frequency.setTargetAtTime(hz, t, 0.012);
    filtro.frequency.cancelScheduledValues(t);
    filtro.frequency.setTargetAtTime(hz * 5, t, 0.03);
  }

  /* ===========================================================
     O modelo

     Eixos: x corre ao longo do instrumento (a volta de afinação fica
     em x=10, a ponta da vara em x=382), y é a altura e z vem na
     direção de quem olha. A seção da campana fica no plano z=0. A
     vara fica num plano inclinado, um pouco à frente: o tubo de cima
     dela passa na frente da campana e o de baixo passa por baixo da
     borda, exatamente como na foto de qualquer trombone montado.
     =========================================================== */
  const LATAO = [232, 178, 70], CROMO = [176, 186, 202], NIQUEL = [214, 219, 228];

  const TOPO = [35.6, 0];        // (y, z) do tubo de cima da seção da campana, que vira a campana
  const BASE = [0, 0];           // o tubo de baixo, que vai até o encaixe da vara
  const V_CIMA = [20, 32];       // tubo de cima da vara: é nele que vai o bocal
  const V_BAIXO = [-3, 10];      // tubo de baixo da vara: liga na seção da campana
  const V_MEIO = [(V_CIMA[0] + V_BAIXO[0]) / 2, (V_CIMA[1] + V_BAIXO[1]) / 2];

  const X_BORDA = 233;                         // onde termina a campana
  const X_MAO = X_BORDA - saida(3);            // a travessa da mão na 1ª posição: na 3ª ela chega na borda
  const X_VARA = [162, 366];                   // de onde a onde vão os tubos da vara externa

  // O perfil da campana, medido na foto: (x, raio). Cresce devagar e abre de uma vez no fim.
  const PERFIL = [[66, 1.7], [100, 2.4], [140, 3.5], [165, 4.6], [182, 5.8], [196, 7.4], [206, 9.6],
    [214, 12.6], [220, 16.2], [225, 20.6], [229, 25.6], [231.6, 29.6], [233, 32.5]];
  const BOCAL = [[119.5, 4.1], [121, 4.3], [124, 3.9], [128, 2.4], [131, 1.5], [138, 1.3]];

  /* ---------- Câmera ------------------------------------------ */
  const CENTRO = [288, 24, 12];
  const LUZ = (() => { const v = [-0.4, 0.62, 0.68], n = Math.hypot(...v); return v.map((k) => k / n); })();
  let giro = -0.5, inclina = 0.26;
  let L = 0, A = 0, escala = 1, dpr = 1;
  let cosG = 1, senG = 0, cosI = 1, senI = 0;
  const mirar = () => { cosG = Math.cos(giro); senG = Math.sin(giro); cosI = Math.cos(inclina); senI = Math.sin(inclina); };

  /** Gira um vetor do modelo pro espaço da câmera (z positivo = perto). */
  const girar = ([x, y, z]) => {
    const x1 = x * cosG + z * senG, z1 = -x * senG + z * cosG;
    return [x1, y * cosI - z1 * senI, y * senI + z1 * cosI];
  };
  /** Do modelo pra tela: [x, y, profundidade, ampliação]. */
  const projetar = (p) => {
    const [x, y, z] = girar([p[0] - CENTRO[0], p[1] - CENTRO[1], p[2] - CENTRO[2]]);
    const f = 1500 / (1500 - z);
    return [L / 2 + x * escala * f, A * 0.5 - y * escala * f, z, f];
  };

  const tinta = (cor, luz) => `rgb(${cor.map((c) => Math.round(Math.min(255, c * luz))).join(',')})`;

  /* ---------- Peças de desenho --------------------------------
     Cada função põe itens numa lista; cada item sabe a que distância
     está e como se pintar. No fim a lista é ordenada e pintada.     */

  /** Um tubo reto, cortado em gomos pra ordenar direito com o resto. */
  function tubo(itens, a, b, raio, cor) {
    const gomos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 18));
    for (let i = 0; i < gomos; i += 1) {
      const p = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * (i / gomos));
      const q = [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * ((i + 1) / gomos));
      linha(itens, [p, q], raio, cor, 'butt');
    }
  }

  /** Uma curva (ou um gomo) desenhada como cilindro: sombra, corpo e reflexo. */
  function linha(itens, pontos, raio, cor, ponta = 'round') {
    const tela = pontos.map(projetar);
    const meio = tela[Math.floor(tela.length / 2)];
    const largura = Math.max(2.4, raio * 2 * escala * meio[3]);
    const tracar = () => {
      ctx2.beginPath();
      tela.forEach(([x, y], i) => (i ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y)));
    };
    itens.push({ z: tela.reduce((s, p) => s + p[2], 0) / tela.length, pintar() {
      ctx2.lineCap = ponta; ctx2.lineJoin = 'round';
      tracar(); ctx2.lineWidth = largura; ctx2.strokeStyle = tinta(cor, 0.42); ctx2.stroke();
      tracar(); ctx2.lineWidth = largura * 0.66; ctx2.strokeStyle = tinta(cor, 0.95); ctx2.stroke();
      // o reflexo corre deslocado pra cima, que é de onde vem a luz
      ctx2.save();
      ctx2.translate(0, -largura * 0.17);
      tracar(); ctx2.lineWidth = Math.max(0.8, largura * 0.2); ctx2.strokeStyle = tinta(cor, 1.5); ctx2.stroke();
      ctx2.restore();
    } });
  }

  /** Meia volta de tubo: do ponto `de` ao ponto `ate`, abaulando na direção `fora`. */
  function volta(itens, de, ate, fora, raio, cor) {
    const centro = [0, 1, 2].map((k) => (de[k] + ate[k]) / 2);
    const braco = [0, 1, 2].map((k) => de[k] - centro[k]);
    const r = Math.hypot(...braco);
    const pontos = Array.from({ length: 17 }, (_, i) => {
      const a = (i / 16) * Math.PI;
      return [0, 1, 2].map((k) => centro[k] + braco[k] * Math.cos(a) + fora[k] * r * Math.sin(a));
    });
    linha(itens, pontos, raio, cor);
  }

  /** Superfície de revolução em torno de uma reta paralela a x: a campana e o bocal. */
  function revolucao(itens, perfil, [cy, cz], cor, opcoes = {}) {
    const GOMOS = opcoes.gomos || 40;
    const aneis = perfil.map(([x, r]) => Array.from({ length: GOMOS }, (_, j) => {
      const a = (j / GOMOS) * Math.PI * 2;
      return [x, cy + r * Math.cos(a), cz + r * Math.sin(a)];
    }));
    const brilho = opcoes.brilho || 1;

    for (let i = 0; i < perfil.length - 1; i += 1) {
      // a inclinação da parede neste trecho: é ela que vira a normal pra trás
      const dx = perfil[i + 1][0] - perfil[i][0], dr = perfil[i + 1][1] - perfil[i][1];
      const comprimento = Math.hypot(dx, dr);
      for (let j = 0; j < GOMOS; j += 1) {
        const k = (j + 1) % GOMOS;
        const a = ((j + 0.5) / GOMOS) * Math.PI * 2;
        const normal = girar([-dr / comprimento, (dx / comprimento) * Math.cos(a), (dx / comprimento) * Math.sin(a)]);
        const cantos = [aneis[i][j], aneis[i + 1][j], aneis[i + 1][k], aneis[i][k]].map(projetar);
        const deFora = normal[2] > 0;
        let cheio;
        if (deFora) {
          const difusa = Math.max(0, normal[0] * LUZ[0] + normal[1] * LUZ[1] + normal[2] * LUZ[2]);
          // o brilho de metal polido: forte e estreito, perto de onde a luz bate de frente
          const espelho = Math.pow(Math.max(0, normal[0] * LUZ[0] * 0.5 + normal[1] * LUZ[1] * 0.5 + normal[2] * (LUZ[2] * 0.5 + 0.5)), 26);
          cheio = tinta(cor, (0.34 + 0.72 * difusa + 0.9 * espelho) * brilho);
        } else {
          // por dentro: escuro no fundo da garganta, clareando até a borda
          cheio = tinta(cor, (0.1 + 0.42 * (i / (perfil.length - 1))) * brilho);
        }
        itens.push({ z: (cantos[0][2] + cantos[1][2] + cantos[2][2] + cantos[3][2]) / 4, pintar() {
          ctx2.beginPath();
          cantos.forEach(([x, y], n) => (n ? ctx2.lineTo(x, y) : ctx2.moveTo(x, y)));
          ctx2.closePath();
          ctx2.fillStyle = cheio;
          ctx2.fill();
          // a mesma cor no contorno fecha as frestas entre um gomo e outro
          ctx2.lineWidth = 1.6; ctx2.strokeStyle = cheio; ctx2.stroke();
        } });
      }
    }
    // a borda virada da campana: um aro mais grosso e mais claro
    if (opcoes.aro) {
      const ultimo = aneis[aneis.length - 1];
      for (let j = 0; j < GOMOS; j += 1) linha(itens, [ultimo[j], ultimo[(j + 1) % GOMOS]], opcoes.aro, cor);
    }
  }

  /* ---------- A montagem do instrumento ------------------------ */
  let ctx2 = null;

  function montar(itens, s) {
    const P = (x, [y, z]) => [x, y, z];

    // seção da campana: os dois tubos, a volta de afinação lá atrás e o cone
    tubo(itens, P(33, TOPO), P(66, TOPO), 1.7, LATAO);
    tubo(itens, P(33, BASE), P(96, BASE), 1.6, LATAO);
    volta(itens, P(33, TOPO), P(33, BASE), [-1, 0, 0], 1.7, LATAO);
    revolucao(itens, PERFIL, TOPO, LATAO, { aro: 0.9, brilho: soprando ? 1.22 : 1 });
    // as luvas niqueladas onde a volta de afinação encaixa
    tubo(itens, P(33, TOPO), P(64, TOPO), 2.1, NIQUEL);
    tubo(itens, P(33, BASE), P(64, BASE), 2.1, NIQUEL);
    // travessas da seção da campana, e o contrapeso na da volta
    tubo(itens, P(36, TOPO), P(36, BASE), 0.9, LATAO);
    tubo(itens, P(61, TOPO), P(61, BASE), 1.1, LATAO);
    tubo(itens, [36, 14.5, 0], [36, 21, 0], 3.2, LATAO);
    // a curva suave que leva o tubo de baixo até o encaixe da vara
    linha(itens, [P(96, BASE), [104, -0.6, 2], [112, -2.4, 8], P(118, V_BAIXO)], 1.6, LATAO);
    // travessa que une a garganta da campana ao encaixe da vara
    tubo(itens, P(126, TOPO), P(126, V_BAIXO), 1, LATAO);

    // os encaixes niquelados da vara e a travessa entre eles
    tubo(itens, P(118, V_BAIXO), P(160, V_BAIXO), 2, NIQUEL);
    tubo(itens, P(137, V_CIMA), P(160, V_CIMA), 2, NIQUEL);
    tubo(itens, P(143, V_CIMA), P(143, V_BAIXO), 1.1, NIQUEL);
    // o bocal, no tubo de cima
    revolucao(itens, BOCAL, V_CIMA, NIQUEL, { gomos: 14 });

    // tubos internos da vara: cromados. Só o trecho descoberto é desenhado;
    // o resto está dentro da vara externa, e desenhar os dois dava listra.
    if (s > 1) {
      tubo(itens, P(160, V_CIMA), P(X_VARA[0] + s + 1, V_CIMA), 1.05, CROMO);
      tubo(itens, P(160, V_BAIXO), P(X_VARA[0] + s + 1, V_BAIXO), 1.05, CROMO);
    }

    // a vara externa: os dois tubos, a volta na ponta, a travessa da mão e a chave d'água
    tubo(itens, P(X_VARA[0] + s, V_CIMA), P(X_VARA[1] + s, V_CIMA), 1.35, LATAO);
    tubo(itens, P(X_VARA[0] + s, V_BAIXO), P(X_VARA[1] + s, V_BAIXO), 1.35, LATAO);
    volta(itens, P(X_VARA[1] + s, V_CIMA), P(X_VARA[1] + s, V_BAIXO), [1, 0, 0], 1.5, NIQUEL);
    tubo(itens, P(X_VARA[0] + s, V_CIMA), P(X_VARA[0] + s + 6, V_CIMA), 1.9, NIQUEL);
    tubo(itens, P(X_VARA[0] + s, V_BAIXO), P(X_VARA[0] + s + 6, V_BAIXO), 1.9, NIQUEL);
    tubo(itens, P(X_MAO + s, V_CIMA), P(X_MAO + s, V_BAIXO), 1.1, LATAO);
    tubo(itens, [X_VARA[1] + s + 6, V_BAIXO[0] - 2.5, V_BAIXO[1] - 2], [X_VARA[1] + s + 13, V_BAIXO[0] - 5, V_BAIXO[1] - 3], 0.7, NIQUEL);
  }

  /* ---------- Quadro ------------------------------------------ */
  const tela = document.createElement('canvas');
  tela.className = 'trombone__tela';
  tela.setAttribute('aria-hidden', 'true');
  vara.replaceChildren(tela);          // sai o desenho plano, entra o modelo
  ctx2 = tela.getContext('2d');

  const pontoDaMao = (p) => projetar([X_MAO + saida(p), V_MEIO[0], V_MEIO[1]]);

  function desenhar() {
    mirar();
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.clearRect(0, 0, L, A);

    // as sete posições, marcadas embaixo de onde a mão fica em cada uma
    ctx2.font = `${Math.max(10, Math.round(escala * 9))}px ui-monospace, monospace`;
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    const perto = Math.round(posicao);
    for (let n = 1; n <= 7; n += 1) {
      const [x, y] = projetar([X_MAO + saida(n), V_BAIXO[0] - 24, V_MEIO[1]]);
      const [tx, ty] = projetar([X_MAO + saida(n), V_BAIXO[0] - 9, V_MEIO[1]]);
      ctx2.strokeStyle = n === perto ? 'rgba(125,160,255,0.9)' : 'rgba(150,160,185,0.3)';
      ctx2.lineWidth = 1;
      ctx2.beginPath(); ctx2.moveTo(tx, ty); ctx2.lineTo(x, y - 8); ctx2.stroke();
      ctx2.fillStyle = n === perto ? '#9db8ff' : 'rgba(150,160,185,0.75)';
      ctx2.fillText(String(n), x, y);
    }

    const itens = [];
    montar(itens, saida(posicao));
    itens.sort((a, b) => a.z - b.z).forEach((item) => item.pintar());

    // a pega: o ponto azul na travessa, que é onde a mão segura
    const [mx, my] = pontoDaMao(posicao);
    ctx2.beginPath();
    ctx2.arc(mx, my, Math.max(6, escala * 5), 0, Math.PI * 2);
    ctx2.fillStyle = soprando ? '#ffd166' : '#3b6bff';
    ctx2.shadowColor = soprando ? '#ffd166' : '#3b6bff';
    ctx2.shadowBlur = 12;
    ctx2.fill();
    ctx2.shadowBlur = 0;
    ctx2.lineWidth = 2; ctx2.strokeStyle = 'rgba(255,255,255,0.9)'; ctx2.stroke();
  }

  function dimensionar() {
    const r = tela.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    L = r.width; A = r.height;
    tela.width = Math.round(L * dpr);
    tela.height = Math.round(A * dpr);
    enquadrar();
  }

  /* O enquadramento acompanha a vara: com ela recolhida o trombone
     ocupa a tela toda; conforme sai, a câmera recua e desliza junto
     pra ponta nunca ficar de fora. `foco` é o quanto de vara a câmera
     está considerando, e persegue a vara de verdade com um atraso. */
  let foco = 0;
  function enquadrar() {
    CENTRO[0] = (10 + 382 + foco) / 2;
    escala = Math.min(L / (372 + foco + 44), A / 178);
  }

  /* Só desenha quando algo mudou. Enquanto ninguém mexeu, o trombone
     fica girando devagar numa mesa giratória, que é o jeito de mostrar
     que ele tem volume; no primeiro toque ele para e passa a ser seu. */
  let quadro = 0, visivel = false, exibindo = !calmo.matches, ultimo = 0;

  const laco = (agora) => {
    quadro = 0;
    const dt = Math.min(0.05, (agora - ultimo) / 1000 || 0);
    ultimo = agora;
    if (exibindo) giro += dt * 0.45;
    const alvo = saida(posicao);
    foco += (alvo - foco) * Math.min(1, dt * 5);
    const ajustando = Math.abs(alvo - foco) > 0.3;
    if (!ajustando) foco = alvo;
    enquadrar();
    desenhar();
    if ((exibindo || ajustando) && visivel && !document.hidden) quadro = requestAnimationFrame(laco);
  };
  function pedirQuadro() {
    if (!quadro) { ultimo = performance.now(); quadro = requestAnimationFrame(laco); }
  }

  new IntersectionObserver((entradas) => {
    visivel = entradas.some((e) => e.isIntersecting);
    if (visivel) pedirQuadro();
  }).observe(tela);
  addEventListener('resize', () => { dimensionar(); pedirQuadro(); });
  document.addEventListener('visibilitychange', pedirQuadro);

  /* ---------- Leitura ------------------------------------------ */
  function mostrar() {
    const perto = Math.round(posicao);
    leituraPosicao.textContent = perto;
    leituraNota.textContent = nomeDaNota(frequencia());
    vara.setAttribute('aria-valuenow', perto);
    vara.setAttribute('aria-valuetext', `${perto}, ${leituraNota.textContent}`);
    pedirQuadro();
  }

  function mover(nova) {
    posicao = Math.min(7, Math.max(1, nova));
    mostrar();
    afinar();
  }

  /* ---------- Ponteiro -----------------------------------------
     Pegou na vara: sopra, e arrastar escorrega a nota. Pegou fora
     dela: gira o instrumento. Pra saber quanto a vara andou, o
     ponteiro é medido ao longo da linha da vara na tela, então
     funciona de qualquer ângulo.                                  */
  const local = (e) => { const r = tela.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  /** A régua da vara na tela, agora: pra que lado ela corre e quantos
      pixels vale cada unidade do modelo. Como a câmera recua enquanto a
      vara sai, a régua é tirada uma vez, no instante em que se pega. */
  function regua() {
    const a = pontoDaMao(1), b = pontoDaMao(7);
    const dx = b[0] - a[0], dy = b[1] - a[1], tamanho = Math.hypot(dx, dy);
    if (tamanho < 20) return null;                       // vara vista de ponta: não dá pra medir
    return { dx: dx / tamanho, dy: dy / tamanho, pxPorUnidade: tamanho / saida(7) };
  }

  /** O ponteiro está em cima da vara externa? */
  function naVara([px, py]) {
    const s = saida(posicao);
    const a = projetar([X_VARA[0] + s - 8, V_MEIO[0], V_MEIO[1]]), b = projetar([X_VARA[1] + s + 18, V_MEIO[0], V_MEIO[1]]);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.min(1, Math.max(0, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t)) < Math.max(26, escala * 26);
  }

  let modo = null, pega = null, ultimoX = 0, ultimoY = 0;

  vara.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    exibindo = false;                                   // a mesa giratória para no primeiro toque
    vara.setPointerCapture(e.pointerId);
    const p = local(e);
    const r = regua();
    if (r && naVara(p)) {
      modo = 'vara';
      pega = { ...r, x: p[0], y: p[1], saida: saida(posicao) };
      soprar();
    } else {
      modo = 'girar';
      ultimoX = e.clientX; ultimoY = e.clientY;
    }
    pedirQuadro();
  });
  vara.addEventListener('pointermove', (e) => {
    if (!vara.hasPointerCapture(e.pointerId)) {
      if (!modo) tela.style.cursor = naVara(local(e)) ? 'grab' : 'move';
      return;
    }
    if (modo === 'vara') {
      const [px, py] = local(e);
      const andou = ((px - pega.x) * pega.dx + (py - pega.y) * pega.dy) / pega.pxPorUnidade;
      mover(posicaoDe(pega.saida + andou));
    } else if (modo === 'girar') {
      giro += (e.clientX - ultimoX) * 0.009;
      // no toque, o arrasto pra cima e pra baixo fica com a rolagem da página
      if (e.pointerType === 'mouse') inclina = Math.min(1.2, Math.max(-1.2, inclina + (e.clientY - ultimoY) * 0.006));
      ultimoX = e.clientX; ultimoY = e.clientY;
      pedirQuadro();
    }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((tipo) =>
    vara.addEventListener(tipo, () => { modo = null; calar(); }));

  /* ---------- Teclado: espaço sopra, setas movem a vara ------- */
  vara.addEventListener('keydown', (e) => {
    exibindo = false;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) soprar(); return; }
    const passo = e.shiftKey ? 0.25 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mover(posicao + passo); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mover(posicao - passo); }
    else if (e.key >= '1' && e.key <= '7') mover(Number(e.key));
    else if (e.key === 'Home') { e.preventDefault(); mover(1); }
    else if (e.key === 'End') { e.preventDefault(); mover(7); }
    // Q e E giram, pra quem está só no teclado
    else if (e.key === 'q' || e.key === 'e') { giro += e.key === 'q' ? -0.2 : 0.2; pedirQuadro(); }
  });
  vara.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Enter') calar();
  });
  vara.addEventListener('blur', calar);

  // Trocou de aba ou saiu da página no meio da nota: cala.
  document.addEventListener('visibilitychange', () => { if (document.hidden) calar(); });

  /* ---------- Harmônicos ------------------------------------- */
  botoes.forEach((botao) => botao.addEventListener('click', () => {
    parcial = Number(botao.dataset.tromboneParcial);
    botoes.forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
    mostrar();
    afinar();
  }));

  // pra quem abre o console querendo olhar de um ângulo exato
  window.trombone = { olhar(g, i = inclina) { exibindo = false; giro = g; inclina = i; pedirQuadro(); } };

  dimensionar();
  mostrar();
})();
