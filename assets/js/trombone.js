/* =============================================================
   O trombone tocável da seção de música.

   Só é baixado quando a seção chega perto da tela (quem decide é o
   site.js). Nenhum arquivo de áudio: o som é um oscilador dente de
   serra passando por um filtro, que é mais ou menos o que um metal
   faz com o ar.

   Como um trombone de verdade funciona, e como isto aqui imita:
     - a vara tem 7 posições; cada uma abaixa a nota meio tom
     - o lábio escolhe o harmônico (aqui, os quatro botões)
     - entre uma posição e outra a nota escorrega: é o glissando,
       a única coisa que só o trombone faz na banda

   Só faz som enquanto você segura. Soltou, calou.
   ============================================================= */
(() => {
  'use strict';

  const raiz = document.querySelector('[data-trombone]');
  const vara = raiz?.querySelector('[data-trombone-vara]');
  if (!raiz || !vara) return;

  const svg = vara.querySelector('svg');
  const leituraPosicao = raiz.querySelector('[data-trombone-posicao]');
  const leituraNota = raiz.querySelector('[data-trombone-nota]');
  const botoes = [...raiz.querySelectorAll('[data-trombone-parcial]')];

  /* Tudo no desenho é medido em unidades do viewBox (660 de largura).
     A pega da vara está em x=448 na 1ª posição e anda 28 por posição. */
  const LARGURA = 660, PEGA_X = 448, PASSO = 28;

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

  /* ---------- Tela ------------------------------------------ */
  function mostrar() {
    // o CSS é quem move a vara; aqui só dizemos quanto
    vara.style.setProperty('--vara', ((posicao - 1) * PASSO).toFixed(1));
    const perto = Math.round(posicao);
    leituraPosicao.textContent = perto;
    leituraNota.textContent = nomeDaNota(frequencia());
    vara.setAttribute('aria-valuenow', perto);
    vara.setAttribute('aria-valuetext', `${perto}, ${leituraNota.textContent}`);
  }

  function mover(nova) {
    posicao = Math.min(7, Math.max(1, nova));
    mostrar();
    afinar();
  }

  /* ---------- Ponteiro: segurar toca, arrastar escorrega ------ */
  const posicaoDoPonteiro = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * LARGURA;
    return 1 + (x - PEGA_X) / PASSO;
  };

  vara.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    vara.setPointerCapture(e.pointerId);
    mover(posicaoDoPonteiro(e));
    soprar();
  });
  vara.addEventListener('pointermove', (e) => {
    if (vara.hasPointerCapture(e.pointerId)) mover(posicaoDoPonteiro(e));
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((tipo) =>
    vara.addEventListener(tipo, calar));

  /* ---------- Teclado: espaço sopra, setas movem a vara ------- */
  vara.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) soprar(); return; }
    const passo = e.shiftKey ? 0.25 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); mover(posicao + passo); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); mover(posicao - passo); }
    else if (e.key >= '1' && e.key <= '7') mover(Number(e.key));
    else if (e.key === 'Home') { e.preventDefault(); mover(1); }
    else if (e.key === 'End') { e.preventDefault(); mover(7); }
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

  mostrar();
})();
