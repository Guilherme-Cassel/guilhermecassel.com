/* =============================================================
   Os segredos do site. Baixado por último, quando o navegador
   está à toa, porque nada aqui é necessário pra ler a página.

     1. O d20 do rodapé: rola e leva pra uma seção. 20 e 1 são
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

  function rolar() {
    if (rolando) return;
    rolando = true;
    const resultado = 1 + Math.floor(Math.random() * 20);
    dado.classList.add('esta-rolando');

    // os números passam correndo antes de parar, como dado na mesa
    const voltas = calmo.matches ? 0 : 9;
    let volta = 0;
    const girar = () => {
      if (volta < voltas) {
        avisar(`d20 · ${1 + Math.floor(Math.random() * 20)}`, 0);
        volta += 1;
        setTimeout(girar, 55 + volta * 12);
        return;
      }
      dado.classList.remove('esta-rolando');
      rolando = false;
      parar(resultado);
    };
    girar();
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
