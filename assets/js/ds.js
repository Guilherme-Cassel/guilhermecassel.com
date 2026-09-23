/* =============================================================
   Cadência, comportamento. ~80 linhas, sem dependência nenhuma.
   Tudo aqui só escreve variáveis CSS ou classes; quem desenha é o CSS.
   ============================================================= */
(() => {
  'use strict';

  /* ---- Tema: o tema salvo já foi aplicado no <head>, antes da
          primeira pintura. Aqui só tratamos o clique. ------------- */
  const root = document.documentElement;

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    // sem atributo no <html> significa o padrão do site, que é escuro
    const atual = root.dataset.theme || 'dark';
    const proximo = atual === 'dark' ? 'light' : 'dark';
    root.dataset.theme = proximo;
    localStorage.setItem('tema', proximo);
  });

  /* ---- Holofote: posição do mouse vira --px/--py no card ------- */
  document.querySelectorAll('.card--spotlight').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--px', `${e.clientX - r.left}px`);
      card.style.setProperty('--py', `${e.clientY - r.top}px`);
    });
  });

  const calmo = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- Botão magnético: só desloca, nunca escapa do alvo ------- */
  document.querySelectorAll('.btn--magnetic').forEach((btn) => {
    const forca = 0.28, limite = 10;
    btn.addEventListener('pointermove', (e) => {
      if (calmo.matches) return;
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * forca;
      const dy = (e.clientY - (r.top + r.height / 2)) * forca;
      btn.style.setProperty('--mx', `${Math.max(-limite, Math.min(limite, dx))}px`);
      btn.style.setProperty('--my', `${Math.max(-limite, Math.min(limite, dy))}px`);
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });

  /* ---- Revelação ao rolar: observa, marca e para de observar --- */
  const io = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada, i) => {
      if (!entrada.isIntersecting) return;
      entrada.target.style.setProperty('--delay', `${i * 60}ms`);
      entrada.target.classList.add('is-visible');
      io.unobserve(entrada.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  /* Ao carregar já rolado (F5 no meio da página), tudo que ficou acima
     ou já está na tela aparece na hora; só o que está abaixo é observado.
     Sem isso, o conteúdo acima da dobra nunca recebe a classe e some. */
  document.querySelectorAll('.reveal').forEach((el) => {
    if (el.getBoundingClientRect().bottom < 0) el.classList.add('is-visible');
    else io.observe(el);
  });

  /* ---- Contador: sobe uma vez, quando entra na tela ------------ */
  const contadores = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      const el = entrada.target;
      const alvo = Number(el.dataset.count);
      const dur = calmo.matches ? 0 : 900;
      const inicio = performance.now();
      const passo = (agora) => {
        const t = dur ? Math.min(1, (agora - inicio) / dur) : 1;
        const suave = 1 - Math.pow(1 - t, 3);          // ease-out cúbica
        el.textContent = Math.round(alvo * suave).toLocaleString('pt-BR');
        if (t < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      contadores.unobserve(el);
    });
  }, { threshold: 0.6 });

  document.querySelectorAll('[data-count]').forEach((el) => contadores.observe(el));

  /* ---- Estado de carregando, só para demonstrar o 6º estado ---- */
  document.querySelector('[data-demo-loading]')?.addEventListener('click', (e) => {
    const b = e.currentTarget;
    b.dataset.loading = 'true';
    setTimeout(() => { b.dataset.loading = 'false'; }, 1600);
  });
})();
