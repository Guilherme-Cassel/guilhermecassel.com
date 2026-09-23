/* =============================================================
   guilhermecassel.com, todo o comportamento do site.
   Sem framework, sem build, sem dependência. Um arquivo, leitura
   de cima pra baixo, cada bloco fazendo uma coisa só.

   Regra que vale pro arquivo inteiro: o JS decide O QUE acontece,
   o CSS decide COMO aparece. Aqui dentro só trocamos classes e
   variáveis CSS; nenhuma animação é escrita em JavaScript.
   ============================================================= */
(() => {
  'use strict';

  const raiz = document.documentElement;
  const calmo = matchMedia('(prefers-reduced-motion: reduce)');
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  /* O e-mail fica quebrado em pedaços de propósito: robô de spam
     varre o HTML em busca de "coisa@coisa.com", e aqui não tem. */
  const EMAIL = ['guilherme.cassel', '2004', '@', 'gmail', '.com'].join('');

  let conteudo = null;   // o JSON do idioma atual
  let idioma = raiz.dataset.lang === 'pt' ? 'pt' : 'en';

  /* ===========================================================
     1. Conteúdo: busca o JSON e derrama o texto na página
     =========================================================== */

  /** Lê "projects.labels.problem" de dentro do objeto. */
  const pegar = (caminho) =>
    caminho.split('.').reduce((o, k) => (o == null ? undefined : o[k]), conteudo);

  async function carregarIdioma(novo) {
    const resposta = await fetch(`content/${novo}.json`, { cache: 'no-cache' });
    if (!resposta.ok) throw new Error(`content/${novo}.json: ${resposta.status}`);
    conteudo = await resposta.json();
    idioma = novo;
    localStorage.setItem('idioma', novo);
    raiz.dataset.lang = novo;
    raiz.lang = conteudo.meta.lang;
    document.title = conteudo.meta.title;
    $('meta[name="description"]')?.setAttribute('content', conteudo.meta.description);
    aplicar();
  }

  /** Aplica o conteúdo carregado em tudo que está marcado na página. */
  function aplicar() {
    // Texto simples: <span data-t="hero.lead">
    $$('[data-t]').forEach((el) => {
      const v = pegar(el.dataset.t);
      if (typeof v === 'string') el.textContent = v.replace('{year}', new Date().getFullYear());
    });

    // Texto alternativo de imagem: <img data-alt="music.photoAlt">
    // (o title junto é de propósito: é o texto que aparece no hover)
    $$('[data-alt]').forEach((el) => {
      const v = pegar(el.dataset.alt);
      if (typeof v === 'string') { el.alt = v; el.title = v; }
    });

    // Nome acessível dos botões que só têm ícone
    $$('[data-label]').forEach((el) => {
      const v = pegar(el.dataset.label);
      if (typeof v === 'string') el.setAttribute('aria-label', v);
    });

    // Links do topo/hero que vêm do JSON
    const link = (nome) => conteudo.contact.links.find((l) => l.name.toLowerCase() === nome)?.url || '';
    $('[data-link="linkedin"]')?.setAttribute('href', link('linkedin'));
    $('[data-link="github"]')?.setAttribute('href', link('github'));

    montarNavMobile();
    montarEstatisticas();
    montarParagrafos('[data-about-text]', conteudo.about.paragraphs);
    montarParagrafos('[data-music-text]', conteudo.music.paragraphs);
    montarLinhaDoTempo();
    montarProjetos();
    montarSideProjects();
    montarStack();
    montarContato();
    iniciarMaquinaDeEscrever(conteudo.hero.roles);
  }

  const criar = (tag, classe, texto) => {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto != null) el.textContent = texto;
    return el;
  };

  const chips = (itens) => {
    const row = criar('div', 'row');
    itens.forEach((i) => row.append(criar('span', 'badge', i)));
    return row;
  };

  function montarParagrafos(seletor, paragrafos) {
    const alvo = $(seletor);
    if (!alvo) return;
    alvo.replaceChildren(...paragrafos.map((p) => criar('p', null, p)));
  }

  function montarEstatisticas() {
    const alvo = $('[data-stats]');
    if (!alvo) return;
    alvo.replaceChildren(...conteudo.stats.map((s) => {
      const bloco = criar('div', 'stat');
      const valor = criar('p', 'stat__value');
      const numero = criar('span', null, '0');
      numero.dataset.count = String(calcularValor(s));
      valor.append(numero, document.createTextNode(s.suffix || ''));
      bloco.append(valor, criar('p', 'stat__label', s.label));
      return bloco;
    }));
    contarTodos();
  }

  /** Idade e tempo de casa se calculam sozinhos, sem número
      chumbado que envelhece sem ninguém perceber. */
  function calcularValor(stat) {
    if (stat.auto === 'age' || stat.auto === 'yearsSince') {
      const de = new Date(stat.from);
      const hoje = new Date();
      let anos = hoje.getFullYear() - de.getFullYear();
      const passouAniversario =
        hoje.getMonth() > de.getMonth() ||
        (hoje.getMonth() === de.getMonth() && hoje.getDate() >= de.getDate());
      if (!passouAniversario) anos -= 1;
      return anos;
    }
    return Number(stat.value) || 0;
  }

  function montarLinhaDoTempo() {
    const alvo = $('[data-timeline]');
    if (!alvo) return;
    alvo.replaceChildren(...conteudo.experience.items.map((item) => {
      const li = criar('li', item.current ? 'is-current' : '');
      li.append(criar('h3', null, item.role));
      li.append(criar('p', 'timeline__meta', `${item.org} · ${item.period}`));
      const ul = criar('ul', 'timeline__bullets');
      item.bullets.forEach((b) => ul.append(criar('li', null, b)));
      li.append(ul);
      return li;
    }));
  }

  function montarProjetos() {
    const alvo = $('[data-work]');
    if (!alvo) return;
    const rotulos = conteudo.projects.labels;
    alvo.replaceChildren(...conteudo.projects.work.map((p) => {
      const card = criar('article', 'card card--interactive work-card');
      const head = criar('div', 'work-card__head');
      head.append(criar('h3', null, p.name), criar('span', 'badge badge--live', p.tag));
      const dl = criar('dl');
      [['problem', p.problem], ['decision', p.decision], ['result', p.result]].forEach(([k, texto]) => {
        const bloco = criar('div');
        bloco.append(criar('dt', null, rotulos[k]), criar('dd', null, texto));
        dl.append(bloco);
      });
      card.append(head, dl, chips(p.stack));
      return card;
    }));
  }

  function montarSideProjects() {
    const alvo = $('[data-side]');
    if (!alvo) return;
    alvo.replaceChildren(...conteudo.projects.side.map((p) => {
      const card = criar('a', 'card card--interactive side-card');
      card.href = p.url; card.target = '_blank'; card.rel = 'noopener';
      card.append(criar('h4', null, p.name), criar('p', null, p.desc), chips(p.stack));
      return card;
    }));
  }

  function montarStack() {
    const alvo = $('[data-stack]');
    if (!alvo) return;
    alvo.replaceChildren(...conteudo.stack.groups.map((g) => {
      const bloco = criar('div', 'stack-group');
      bloco.append(criar('h3', null, g.name), chips(g.items));
      return bloco;
    }));
  }

  function montarContato() {
    const botao = $('[data-email]');
    if (botao) {
      botao.href = `mailto:${EMAIL}?subject=${encodeURIComponent(conteudo.contact.emailSubject)}`;
    }
    const alvo = $('[data-contact-links]');
    if (!alvo) return;
    // Link com url vazia no JSON simplesmente não aparece.
    alvo.replaceChildren(...conteudo.contact.links.filter((l) => l.url).map((l) => {
      const a = criar('a', 'link', l.name);
      a.href = l.url; a.target = '_blank'; a.rel = 'noopener';
      return a;
    }));
  }

  function montarNavMobile() {
    const origem = $('.nav');
    const alvo = $('[data-mobile-nav]');
    if (!origem || !alvo) return;
    alvo.replaceChildren(...$$('a', origem).map((a) => {
      const copia = a.cloneNode(true);
      copia.removeAttribute('class');
      return copia;
    }));
  }

  /* ===========================================================
     2. Máquina de escrever do subtítulo
     =========================================================== */
  let timerEscrita = null;

  function iniciarMaquinaDeEscrever(frases) {
    const alvo = $('[data-typewriter]');
    if (!alvo || !frases?.length) return;
    clearTimeout(timerEscrita);

    // Quem pediu menos movimento recebe a frase pronta, sem teatro.
    if (calmo.matches) { alvo.textContent = frases[0]; return; }

    let i = 0, pos = 0, apagando = false;
    const passo = () => {
      const frase = frases[i];
      pos += apagando ? -1 : 1;
      alvo.textContent = frase.slice(0, pos);

      let espera = apagando ? 28 : 55;
      if (!apagando && pos === frase.length) { apagando = true; espera = 2200; }
      else if (apagando && pos === 0) { apagando = false; i = (i + 1) % frases.length; espera = 320; }
      timerEscrita = setTimeout(passo, espera);
    };
    alvo.textContent = '';
    timerEscrita = setTimeout(passo, 400);
  }

  /* ===========================================================
     3. Contadores: sobem uma vez, quando entram na tela
     =========================================================== */
  let observadorContagem = null;

  function contarTodos() {
    observadorContagem?.disconnect();
    observadorContagem = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        animarContador(e.target);
        observadorContagem.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => observadorContagem.observe(el));
  }

  function animarContador(el) {
    const alvo = Number(el.dataset.count);
    const duracao = calmo.matches ? 0 : 900;
    const inicio = performance.now();
    const passo = (agora) => {
      const t = duracao ? Math.min(1, (agora - inicio) / duracao) : 1;
      const suave = 1 - Math.pow(1 - t, 3);            // ease-out cúbica
      el.textContent = Math.round(alvo * suave).toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US');
      if (t < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  /* ===========================================================
     4. Topo: some ao descer, volta ao subir + seção atual
     =========================================================== */
  const topbar = $('[data-topbar]');
  let ultimoY = window.scrollY;

  const aoRolar = () => {
    const y = window.scrollY;
    const descendo = y > ultimoY;
    // só esconde depois de passar do topo, pra não piscar no início
    topbar?.classList.toggle('is-hidden', descendo && y > 220 && !menuAberto());
    ultimoY = y;

    // variável usada pelo CSS pra mover a mancha de luz do fundo
    const total = document.body.scrollHeight - innerHeight;
    raiz.style.setProperty('--scroll', total > 0 ? (y / total).toFixed(4) : '0');
  };
  addEventListener('scroll', aoRolar, { passive: true });

  /* Marca no menu a seção em que o leitor está. A faixa de leitura é
     a fatia do meio da tela: -45% em cima, -50% embaixo. */
  const espiao = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      $$('.nav a').forEach((a) =>
        a.classList.toggle('is-current', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  $$('main > section[id]').forEach((secao) => espiao.observe(secao));

  /* ===========================================================
     5. Menu do celular
     =========================================================== */
  const botaoMenu = $('[data-nav-toggle]');
  const menuMobile = $('[data-mobile-nav]');
  const menuAberto = () => botaoMenu?.getAttribute('aria-expanded') === 'true';

  botaoMenu?.addEventListener('click', () => {
    const abrir = !menuAberto();
    botaoMenu.setAttribute('aria-expanded', String(abrir));
    menuMobile.hidden = !abrir;
  });
  menuMobile?.addEventListener('click', (e) => {
    if (e.target.tagName !== 'A') return;
    botaoMenu.setAttribute('aria-expanded', 'false');
    menuMobile.hidden = true;
  });

  /* ===========================================================
     6. Tema e idioma
     =========================================================== */
  $('[data-theme-toggle]')?.addEventListener('click', (e) => {
    const botao = e.currentTarget;
    // sem atributo no <html> significa o padrão do site, que é escuro
    const atual = raiz.dataset.theme || 'dark';
    botao.classList.add('is-switching');
    setTimeout(() => botao.classList.remove('is-switching'), 260);
    const proximo = atual === 'dark' ? 'light' : 'dark';
    raiz.dataset.theme = proximo;
    localStorage.setItem('tema', proximo);
  });

  $('[data-lang-toggle]')?.addEventListener('click', () => {
    carregarIdioma(idioma === 'pt' ? 'en' : 'pt').catch(console.error);
  });

  /* ===========================================================
     7. Botões magnéticos: o botão puxa de leve na direção do mouse
     =========================================================== */
  const magnetizar = (btn) => {
    const forca = 0.25, limite = 9;
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
  };
  $$('.btn--magnetic').forEach(magnetizar);

  /* ===========================================================
     8. Cursor customizado
     Só existe em ponteiro fino (ver o @media no site.css). O JS
     só escreve a posição; quem desenha e anima é o CSS.
     =========================================================== */
  const cursor = $('[data-cursor]');
  if (cursor && matchMedia('(pointer: fine)').matches && !calmo.matches) {
    // Avisa o CSS que pode esconder a seta do sistema. Só aqui dentro,
    // depois de ter certeza de que existe cursor nosso pra substituir.
    raiz.classList.add('has-cursor');

    let x = 0, y = 0, agendado = false;
    addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      cursor.classList.add('is-active');
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        cursor.style.transform = `translate(${x}px, ${y}px)`;
        agendado = false;
      });
    }, { passive: true });

    addEventListener('pointerleave', () => cursor.classList.remove('is-active'));

    // Abre em cima de qualquer coisa clicável, sem precisar listar uma a uma
    document.addEventListener('pointerover', (e) => {
      const clicavel = e.target.closest('a, button, input, [role="button"]');
      const noNome = e.target.closest('[data-tickle]');
      cursor.classList.toggle('is-over', Boolean(clicavel) && !noNome);
      // em cima do nome o cursor vira uma peninha de cócegas
      cursor.classList.toggle('is-pena', Boolean(noNome));
    });
  }

  /* ===========================================================
     9. Cócegas no nome (sim, isso foi um requisito)
     =========================================================== */
  const nome = $('[data-tickle]');
  nome?.addEventListener('click', () => {
    nome.classList.remove('is-tickled');
    void nome.offsetWidth;                  // reinicia a animação
    nome.classList.add('is-tickled');

    if (calmo.matches) return;
    const frases = conteudo?.hero?.tickleMessages || [];
    if (!frases.length) return;

    const balao = criar('span', 'giggle', frases[Math.floor(Math.random() * frases.length)]);
    const r = nome.getBoundingClientRect();
    balao.style.left = `${r.left + r.width * (0.25 + Math.random() * 0.5)}px`;
    balao.style.top = `${r.top + scrollY - 6}px`;
    document.body.append(balao);
    setTimeout(() => balao.remove(), 1500);
  });

  /* ===========================================================
     10. O nome chega empurrado por um extensor duplo

     A ordem é a mesma do jogo:
       1. o pistão da FRENTE estende  -> o nome anda 1 bloco
       2. o de TRÁS estende           -> empurra o da frente, que
          já está estendido, mais 1 bloco: 2 no total
       3. o de trás recolhe           -> por ser grudento, traz o
          da frente junto
       4. o da frente recolhe         -> o nome FICA onde está

     O passo 4 é o problema clássico do extensor duplo, aquele que
     os tutoriais resolvem com um repetidor de 2 ticks: na volta o
     que foi empurrado é abandonado. Aqui isso não é defeito, é o
     objetivo. A máquina vai embora e o nome fica no lugar de
     sempre, como se nunca tivesse havido pistão nenhum.

     Régua: x = 0 é a posição final do nome, e cada passo é um
     bloco inteiro. Nada de pixel solto.
     =========================================================== */
  function entregarONome() {
    const palco = $('[data-palco]');
    const nomeEl = $('[data-nome]');
    if (!palco || !nomeEl || calmo.matches) return;   // sem teatro se pediram calma

    const v = (el, prop, valor) => el.style.setProperty(prop, String(valor));
    const px = (el, prop, valor) => v(el, prop, `${Math.round(valor)}px`);

    const pistao = () => {
      const p = criar('div', 'pistao');
      p.append(
        criar('span', 'pistao__corpo'),
        criar('span', 'pistao__braco'),
        criar('span', 'pistao__cabeca'),
      );
      p.setAttribute('aria-hidden', 'true');
      return p;
    };

    const tras = pistao();
    const frente = pistao();
    palco.prepend(tras, frente);

    /* Medir antes de mexer. O vão entre a borda da janela e o nome
       muda com a largura da tela, então a máquina é posicionada em
       pixels de verdade, não em palpite. */
    const cel = frente.offsetWidth;
    const cabeca = cel * 0.26;
    const vao = nomeEl.getBoundingClientRect().left - palco.getBoundingClientRect().left;

    /* Corpo de trás em 0, o da frente em uma casa. O braço da frente
       preenche o que sobrar até encostar no nome. Se não couber nem
       isso, a máquina inteira desliza pra fora da janela o tanto que
       precisar: em tela estreita aparece só o braço e a cabeça, que
       é exatamente o que se veria se ela estivesse fora do quadro. */
    const bracoInicial = vao - 2 * cel - cabeca - 2 * cel;
    const recuo = Math.min(0, bracoInicial);
    const braco0 = Math.max(0, bracoInicial);
    const entrada = -(vao + 4 * cel);            // ponto de partida, fora de cena

    [tras, frente].forEach((p) => {
      px(p, '--ent', entrada); px(p, '--braco', 0);
      v(p, '--passo', '760ms');       // a chegada tem o mesmo tempo da saída
      v(p, '--curva', 'cubic-bezier(0.25, 0.6, 0.35, 1)');   // entra e freia
    });
    px(tras, '--px', recuo);
    px(frente, '--px', cel + recuo);
    px(nomeEl, '--ent', entrada);
    px(nomeEl, '--px', -2 * cel);
    v(nomeEl, '--passo', '760ms');
    v(nomeEl, '--curva', 'cubic-bezier(0.25, 0.6, 0.35, 1)');

    const roteiro = [
      // a máquina e o nome entram juntos, como uma peça só
      [0,    () => { [tras, frente, nomeEl].forEach((e) => px(e, '--ent', 0)); }],
      // acabou a chegada: daqui pra frente cada passo é seco, de pistão
      [800,  () => {
        [nomeEl, tras, frente].forEach((e) => {
          v(e, '--passo', '170ms');
          e.style.removeProperty('--curva');
        });
      }],
      // 1. o da frente estende: o nome anda uma casa
      [1000, () => { px(frente, '--braco', braco0 + cel); px(nomeEl, '--px', -cel); }],
      // 2. o de trás estende e empurra o da frente: mais uma casa
      [1360, () => { px(tras, '--braco', cel); px(frente, '--px', 2 * cel + recuo); px(nomeEl, '--px', 0); }],
      /* 3 e 4 são a máquina indo embora, e não mais um empurrão:
         ganham um tempo maior porque, em tela larga, o corpo já está
         fora do quadro e o braço recolhendo é a última coisa que se
         vê. No tempo curto de um passo, isso virava corte seco. */
      [2020, () => {
        [tras, frente].forEach((e) => v(e, '--passo', '320ms'));
        px(tras, '--braco', 0); px(frente, '--px', cel + recuo);
      }],
      // 4. o da frente recolhe e larga o nome onde ele é pra ficar
      [2400, () => {
        v(frente, '--passo', '440ms');
        // curva pareja nas duas pontas: o braço sai de cena sem tranco
        v(frente, '--curva', 'cubic-bezier(0.45, 0, 0.55, 1)');
        px(frente, '--braco', braco0);
      }],
      [2920, () => {
        /* A saída é longa: são uns 600px até sumir da janela, e no
           tempo curto de um passo de pistão isso vira corte seco. */
        [tras, frente].forEach((e) => {
          v(e, '--passo', '760ms');
          v(e, '--curva', 'cubic-bezier(0.55, 0, 0.85, 0.35)');   // arranca devagar e acelera
          px(e, '--ent', entrada);
        });
      }],
      [3800, () => { tras.remove(); frente.remove(); }],   // já fora de vista
    ];

    /* Ler uma propriedade calculada obriga o navegador a assumir o
       estado inicial agora. Sem isso ele junta o "está lá fora" com
       o "vem pra cá" no mesmo cálculo de estilo, não vê mudança
       nenhuma e entrega a máquina já posicionada, sem animar. */
    getComputedStyle(tras).transform;

    requestAnimationFrame(() => {
      roteiro.forEach(([atraso, acao]) => setTimeout(acao, atraso));
    });
  }

  /* ===========================================================
     11. O joguinho: "tenta correr mais que ela"

     Um corredor infinito onde o obstáculo é o de sempre, mas o
     vilão é o tempo: a coisa que vem atrás acelera junto com a sua
     pontuação e se aproxima em curva exponencial. Como o alvo dela
     é uma distância mínima, e não a sua posição exata, ela SEMPRE
     alcança. Não existe vitória: existe quanto tempo você segura.

     Canvas 2D e um laço de rAF. Sem engine, sem sprite, sem som.
     Toda a matemática vive numa altura lógica fixa de 280, e o
     resto é escala, então o jogo é o mesmo em qualquer tela.
     =========================================================== */
  function prepararJogo() {
    const palco = $('[data-jogo-palco]');
    const tela = $('[data-jogo-canvas]');
    if (!palco || !tela) return;

    const ctx = tela.getContext('2d', { alpha: true });
    const aviso = $('[data-jogo-aviso]');
    const mensagem = $('[data-jogo-mensagem]');
    const placarPontos = $('[data-jogo-pontos]');
    const placarRecorde = $('[data-jogo-recorde]');

    /* ---------- Som ------------------------------------------
       Nenhum arquivo de áudio: cada efeito é um oscilador criado
       na hora e jogado fora em seguida. O contexto só nasce no
       primeiro clique, que é o que o navegador exige, e o volume
       é baixo de propósito: isto aqui é um portfólio.           */
    const som = (() => {
      const CHAVE = 'jogo-som';
      let ctx = null;
      let ligado = localStorage.getItem(CHAVE) !== 'nao';

      const acordar = () => {
        if (!ligado) return null;
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return null;
        if (!ctx) ctx = new Audio();
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      };

      /** Um tom que desliza de uma frequência pra outra e some. */
      const tom = (de, para, dur, tipo = 'square', vol = 0.05, atraso = 0) => {
        const c = acordar();
        if (!c) return;
        const t = c.currentTime + atraso;
        const osc = c.createOscillator();
        const ganho = c.createGain();
        osc.type = tipo;
        osc.frequency.setValueAtTime(de, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, para), t + dur);
        ganho.gain.setValueAtTime(vol, t);
        ganho.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(ganho).connect(c.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      };

      /** Chiado curto, pra batida ter corpo além do tom grave. */
      const chiado = (dur, vol = 0.09) => {
        const c = acordar();
        if (!c) return;
        const amostras = Math.floor(c.sampleRate * dur);
        const buffer = c.createBuffer(1, amostras, c.sampleRate);
        const dados = buffer.getChannelData(0);
        for (let i = 0; i < amostras; i += 1) {
          dados[i] = (Math.random() * 2 - 1) * (1 - i / amostras);   // some sozinho
        }
        const fonte = c.createBufferSource();
        const ganho = c.createGain();
        fonte.buffer = buffer;
        ganho.gain.value = vol;
        fonte.connect(ganho).connect(c.destination);
        fonte.start();
      };

      return {
        get ligado() { return ligado; },
        alternar() {
          ligado = !ligado;
          localStorage.setItem(CHAVE, ligado ? 'sim' : 'nao');
          if (ligado) tom(660, 880, 0.08, 'sine', 0.05);
          return ligado;
        },
        bater() { tom(420, 700, 0.09, 'square', 0.045); },
        ponto() { tom(880, 880, 0.06, 'sine', 0.05); tom(1320, 1320, 0.09, 'sine', 0.045, 0.06); },
        tique(ultimo) {
          if (ultimo) tom(990, 990, 0.16, 'sine', 0.06);
          else tom(620, 620, 0.07, 'sine', 0.045);
        },
        batida() { tom(200, 60, 0.28, 'sawtooth', 0.07); chiado(0.2); },
        pego() {
          tom(320, 70, 0.55, 'triangle', 0.07);
          tom(160, 40, 0.6, 'sawtooth', 0.05, 0.04);
        },
      };
    })();

    const botaoSom = $('[data-jogo-som]');
    botaoSom?.setAttribute('aria-pressed', String(som.ligado));
    botaoSom?.addEventListener('click', () => {
      botaoSom.setAttribute('aria-pressed', String(som.alternar()));
      tela.focus({ preventScroll: true });
    });

    const ALTURA = 280;                 // altura lógica; largura varia
    const CHAO = 14;
    let L = 640;                        // largura lógica, recalculada no resize
    let escala = 1;

    /* As cores saem dos tokens do site, então o jogo acompanha o
       tema claro/escuro sem ter cor nenhuma escrita aqui dentro. */
    let cor = {};
    const lerCores = () => {
      const s = getComputedStyle(document.documentElement);
      const t = (nome) => s.getPropertyValue(nome).trim();
      cor = {
        marca: t('--blue-600'), marcaClara: t('--blue-400'),
        texto: t('--text'), fraco: t('--text-muted'),
        cano: t('--border-strong'), canoTopo: t('--border'),
        fundo: t('--bg-sunken'), ia: t('--ink-900'), perigo: t('--accent-warm'),
      };
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
    };

    /* ---------- Estado ---------------------------------------- */
    const RECORDE = 'recorde-jogo';
    const VEZ_IA = 'jogo-ia';
    let aveY, aveV, canos, pontos, iaX, rodando, morto, ultimo, quadro;
    let contagem, iaTipo;
    let recorde = Number(localStorage.getItem(RECORDE) || 0);
    let vezIA = Number(localStorage.getItem(VEZ_IA) || 0);

    const AVE_X = 108, AVE_R = 13;
    const CANO_L = 48;

    /* ---------- Os botões da dificuldade ----------------------
       Tudo que decide se o jogo é fácil ou impossível está aqui,
       em unidades lógicas (a tela tem 280 de altura). Mexer num
       número só já muda o jogo inteiro; não precisa caçar nada
       no meio do código.                                        */
    const AJUSTE = {
      gravidade: 1050,   // quanto puxa pra baixo. Menor = mais flutuante
      pulo: 300,         // força de cada batida de asa
      vao: 146,          // altura do buraco entre os canos, no começo
      vaoMin: 108,       // e o menor que ele pode ficar
      vaoAperta: 1.2,    // quanto o buraco fecha por ponto
      vel: 118,          // velocidade do mundo, no começo
      velSobe: 2.4,      // quanto ela cresce por ponto
      espaco: 285,       // distância de um cano pro outro
      espacoMin: 215,
      espacoAperta: 1.8,
      vantagemIA: 0.15,  // a IA anda 15% mais rápido que você
    };

    const vaoDe = (p) => Math.max(AJUSTE.vaoMin, AJUSTE.vao - p * AJUSTE.vaoAperta);
    const velDe = (p) => AJUSTE.vel + p * AJUSTE.velSobe;
    const distDe = (p) => Math.max(AJUSTE.espacoMin, AJUSTE.espaco - p * AJUSTE.espacoAperta);

    function reiniciar() {
      // um empurrãozinho pra cima no começo: sem isso a queda
      // livre mata em menos de meio segundo, antes de dar tempo de ler
      aveY = ALTURA / 2; aveV = -140; pontos = 0; morto = false;
      contagem = 2.25;                    // 3, 2, 1 a 0,75s cada
      // a cada partida troca de perseguidor, e a vez fica guardada
      iaTipo = vezIA % 2 === 0 ? 'claude' : 'codex';
      vezIA += 1;
      localStorage.setItem(VEZ_IA, String(vezIA));
      // começa o mais longe que a tela permitir, pra perseguição durar
      iaX = -Math.max(130, L * 0.45);
      canos = [];
      let x = L + 130;
      for (let i = 0; i < 4; i += 1) { canos.push(novoCano(x)); x += distDe(0); }
      atualizarPlacar();
    }

    const novoCano = (x) => ({
      x,
      topo: 40 + Math.random() * (ALTURA - CHAO - 80 - vaoDe(pontos || 0)),
      passou: false,
    });

    const atualizarPlacar = () => {
      if (placarPontos) placarPontos.textContent = pontos;
      if (placarRecorde) placarRecorde.textContent = recorde;
    };

    /* ---------- Desenho --------------------------------------- */
    const quadrado = (x, y, w, h, raio, cor1) => {
      ctx.fillStyle = cor1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, raio);
      ctx.fill();
    };

    /* Os dois perseguidores, desenhados em vetor no próprio canvas.
       Claude: o raio de sol de onze pontas. Codex: o nó da OpenAI,
       três anéis girados 60 graus, que é o formato da marca. */
    function desenharIA(x, y) {
      const t = 36;
      const pulso = 0.5 + 0.5 * Math.sin(performance.now() / 300);
      const claro = iaTipo === 'claude';
      const tinta = claro ? '#d97757' : '#ffffff';

      ctx.save();
      ctx.shadowColor = tinta;
      ctx.shadowBlur = 8 + pulso * 16;
      quadrado(x, y - t / 2, t, t, 9, claro ? '#f4f1ea' : '#0d0d0d');
      ctx.restore();

      ctx.save();
      ctx.translate(x + t / 2, y);
      ctx.strokeStyle = tinta;
      ctx.lineCap = 'round';

      if (claro) {
        ctx.lineWidth = t * 0.075;
        for (let i = 0; i < 11; i += 1) {
          const a = (i / 11) * Math.PI * 2;
          const dentro = t * 0.06;
          const fora = t * (i % 2 ? 0.3 : 0.36);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * dentro, Math.sin(a) * dentro);
          ctx.lineTo(Math.cos(a) * fora, Math.sin(a) * fora);
          ctx.stroke();
        }
      } else {
        ctx.lineWidth = t * 0.07;
        for (let i = 0; i < 3; i += 1) {
          ctx.save();
          ctx.rotate((i * Math.PI) / 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, t * 0.15, t * 0.33, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
    }

    function desenhar() {
      ctx.clearRect(0, 0, L, ALTURA);

      // chão
      quadrado(0, ALTURA - CHAO, L, CHAO, 0, cor.canoTopo);

      // canos
      canos.forEach((c) => {
        const vao = vaoDe(pontos);
        const boca = 12;                       // a boca larga de cano de verdade
        quadrado(c.x, 0, CANO_L, c.topo - boca, 4, cor.cano);
        quadrado(c.x - 4, c.topo - boca, CANO_L + 8, boca, 4, cor.canoTopo);
        const baixoY = c.topo + vao;
        quadrado(c.x - 4, baixoY, CANO_L + 8, boca, 4, cor.canoTopo);
        quadrado(c.x, baixoY + boca, CANO_L, ALTURA - CHAO - baixoY - boca, 4, cor.cano);
      });

      desenharIA(iaX, aveY);

      // o jogador: o monograma
      ctx.save();
      ctx.translate(AVE_X, aveY);
      ctx.rotate(Math.max(-0.5, Math.min(0.7, aveV / 620)));
      quadrado(-AVE_R, -AVE_R, AVE_R * 2, AVE_R * 2, 7, cor.marca);
      ctx.fillStyle = '#fff';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GC', 0, 5);
      ctx.restore();
      ctx.textAlign = 'left';

      // 3, 2, 1: o número cresce e some dentro do próprio segundo
      if (contagem > 0) {
        const fatia = contagem / 0.75;
        const numero = Math.ceil(fatia);
        const resto = fatia - Math.floor(fatia) || 1;
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.85 * resto;
        ctx.translate(L / 2, ALTURA / 2);
        ctx.scale(1.35 - 0.35 * resto, 1.35 - 0.35 * resto);
        ctx.fillStyle = cor.marca;
        ctx.font = `800 ${Math.round(ALTURA * 0.32)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(String(numero), 0, 0);
        ctx.restore();
        ctx.textAlign = 'left';
      }
    }

    /* ---------- Física ---------------------------------------- */
    function passo(dt) {
      // 3, 2, 1: nada se move enquanto a contagem não zera
      if (contagem > 0) {
        const antes = Math.ceil(contagem / 0.75);
        contagem = Math.max(0, contagem - dt);
        const agora = Math.ceil(contagem / 0.75);
        if (agora !== antes) som.tique(agora === 0);
        return;
      }

      aveV += AJUSTE.gravidade * dt;
      aveY += aveV * dt;

      const v = velDe(pontos);
      canos.forEach((c) => { c.x -= v * dt; });

      if (canos[0].x + CANO_L < -10) {
        canos.shift();
        canos.push(novoCano(canos[canos.length - 1].x + distDe(pontos)));
      }

      /* A IA anda 15% mais rápido que você, e só isso. Como a sua
         velocidade sobe junto com a pontuação, a dela sobe também:
         a diferença é sempre a mesma fração. Devagar, constante e
         inevitável, que é exatamente a piada. */
      iaX += v * AJUSTE.vantagemIA * dt;

      canos.forEach((c) => {
        if (!c.passou && c.x + CANO_L < AVE_X - AVE_R) {
          c.passou = true; pontos += 1; atualizarPlacar(); som.ponto();
        }
        const vao = vaoDe(pontos);
        const dentroX = AVE_X + AVE_R > c.x && AVE_X - AVE_R < c.x + CANO_L;
        if (dentroX && (aveY - AVE_R < c.topo || aveY + AVE_R > c.topo + vao)) fim('overCrash');
      });

      if (aveY + AVE_R > ALTURA - CHAO) fim('overCrash');
      // o teto não mata, só segura: bater no céu é frustração à toa
      if (aveY - AVE_R < 0) { aveY = AVE_R; aveV = Math.max(0, aveV); }
      if (iaX + 30 > AVE_X - AVE_R) fim('overCaught');
    }

    function fim(chave) {
      if (morto) return;
      morto = true; rodando = false;
      if (chave === 'overCaught') som.pego(); else som.batida();
      cancelAnimationFrame(quadro);
      if (pontos > recorde) {
        recorde = pontos;
        localStorage.setItem(RECORDE, String(recorde));
        atualizarPlacar();
      }
      /* Bater sozinho tem várias respostas, e o jogo sorteia uma.
         Ser alcançado tem uma só, que é a piada do site inteiro. */
      const fala = conteudo?.game?.[chave];
      if (mensagem) {
        mensagem.textContent = Array.isArray(fala)
          ? fala[Math.floor(Math.random() * fala.length)]
          : (fala || '');
      }
      aviso?.removeAttribute('hidden');
    }

    function laco(agora) {
      if (!rodando) return;
      const dt = Math.min(0.032, (agora - ultimo) / 1000 || 0);
      ultimo = agora;
      passo(dt);
      desenhar();
      quadro = requestAnimationFrame(laco);
    }

    const tocar = () => {
      rodando = true; ultimo = performance.now();
      quadro = requestAnimationFrame(laco);
    };

    const bater = () => {
      if (morto || !rodando || contagem > 0) return;
      aveV = -AJUSTE.pulo;
      som.bater();
    };

    /* ---------- Entradas -------------------------------------- */
    tela.addEventListener('pointerdown', (e) => { e.preventDefault(); bater(); });
    tela.addEventListener('keydown', (e) => {
      if (e.key !== ' ' && e.key !== 'ArrowUp') return;
      e.preventDefault();        // senão a barra de espaço rola a página
      bater();
    });

    $('[data-jogo-reiniciar]')?.addEventListener('click', () => {
      aviso?.setAttribute('hidden', '');
      lerCores(); dimensionar(); reiniciar(); tocar();
      tela.focus({ preventScroll: true });
    });

    $('[data-jogo-abrir]')?.addEventListener('click', (e) => {
      const botao = e.currentTarget;
      abrirPalco();
      // o botão sai de cena: daqui pra frente quem manda é a tela
      botao.closest('.jogo__acao')?.classList.add('esta-fora');
      // Só começa depois que a persiana terminou de descer. O centrar
      // também espera: durante a descida a altura ainda está crescendo,
      // e centralizar no meio do caminho erra o alvo.
      setTimeout(() => {
        $('.jogo__tela', palco).scrollIntoView({
          behavior: calmo.matches ? 'auto' : 'smooth',
          block: 'center',
        });
        lerCores(); dimensionar(); reiniciar(); tocar();
        tela.focus({ preventScroll: true });
      }, calmo.matches ? 0 : 520);
    });

    function abrirPalco() {
      const alvo = $('.jogo__tela', palco);
      palco.style.height = `${Math.round(alvo.getBoundingClientRect().width * (alvo.offsetHeight / alvo.offsetWidth || 7 / 16))}px`;
      palco.classList.add('esta-aberto');
    }

    /* Enquanto a tela estiver fechada a altura é zero; quando abre,
       ela precisa acompanhar a largura da janela. */
    addEventListener('resize', () => {
      if (!palco.classList.contains('esta-aberto')) return;
      palco.style.height = '';
      const alvo = $('.jogo__tela', palco);
      palco.style.height = `${Math.round(alvo.getBoundingClientRect().height)}px`;
      dimensionar();
    });

    /* Fora da tela, o jogo para: ninguém quer um rAF rodando à toa
       enquanto a pessoa lê a seção de experiência. */
    new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        /* Só pausa quando a tela some de vez, e nunca durante a
           contagem: o próprio scroll de abertura passa por um
           instante 'fora da tela', e isso pausava o jogo sozinho. */
        if (e.isIntersecting || !rodando || contagem > 0) return;
        rodando = false;
        cancelAnimationFrame(quadro);
        if (mensagem) mensagem.textContent = conteudo?.game?.paused || '';
        aviso?.removeAttribute('hidden');
      });
    }, { threshold: 0 }).observe(palco);

    atualizarPlacar();
  }

  /* ===========================================================
     12. Partida
     =========================================================== */
  carregarIdioma(idioma)
    // só depois do texto na tela, e só nesta primeira vez: trocar de
    // idioma redesenha o conteúdo, mas não traz a máquina de volta
    .then(() => { entregarONome(); prepararJogo(); })
    .catch((erro) => {
      console.error('Não consegui carregar o conteúdo:', erro);
      document.body.classList.add('sem-conteudo');
    });

  console.log(
    '%cGuilherme Cassel%c\nHTML, CSS e JS na mão. Sem framework, sem build, sem dependência.\n' +
    'Se você chegou até aqui, provavelmente a gente ia se dar bem: ' + EMAIL,
    'font-size:18px;font-weight:700;color:#2563eb', 'font-size:12px;color:#6b7689'
  );
})();
