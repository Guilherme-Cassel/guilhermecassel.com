/* =============================================================
   Demonstração do friendly-password-generator.

   É o mesmo padrão do aplicativo em C# (PasswordGenerator.cs e
   Randomizer.cs), reescrito em JavaScript:

       [3 símbolos ou dígitos] Palavra [3 símbolos ou dígitos] Palavra ...

   Duas diferenças honestas em relação ao original:
     - o aplicativo sorteia de um dicionário de 320 mil palavras; aqui
       vai uma lista curta, pra não fazer ninguém baixar 4 MB
     - o sorteio usa crypto.getRandomValues, que é o gerador seguro
       do navegador

   Nada sai do navegador: a senha é gerada e fica aqui.
   ============================================================= */
(() => {
  'use strict';

  const raiz = document.querySelector('[data-senha]');
  if (!raiz) return;

  const saida = raiz.querySelector('[data-senha-saida]');
  const gerar = raiz.querySelector('[data-senha-gerar]');
  const copiar = raiz.querySelector('[data-senha-copiar]');
  const controle = raiz.querySelector('[data-senha-palavras]');
  const contagem = raiz.querySelector('[data-senha-n]');

  const SIMBOLOS = '!@#$%&*';

  // Palavras comuns, sem acento, fáceis de ditar por telefone.
  const PALAVRAS = (
    'abelha abraco acordo agulha alface amigo ancora anel antena arame areia armario arroz arvore asfalto ' +
    'aurora aveia azeite bacia balde banana banco bandeira barco barril batata bigode biscoito bolacha bolso ' +
    'bondade botao brasa brisa buzina cabide cabra cachorro cadeira caderno cafe caixa calca camelo caminho ' +
    'camisa campo caneca caneta canoa capim carro carta casaco casca castelo cavalo cebola cenoura cereja ' +
    'chave chuva cidade cinema cinto circo coelho cofre coluna copo coral corda coruja cozinha cravo ' +
    'cristal curva dado danca dedo degrau dente deserto doce dragao escada escola escova esfera espelho ' +
    'esquilo estrada estrela fabrica faca farinha farol feijao ferro festa figo filme fita floresta fogao ' +
    'folha fonte forno fruta fumaca galho galinha garfo garrafa gato gaveta gelo girafa globo goiaba ' +
    'grama grilo guitarra hotel igreja ilha inverno janela jardim jornal lagarto lago lampada laranja ' +
    'lapis leite lenha limao linha livro lobo lua luva macaco madeira mala manga manteiga mapa martelo ' +
    'meia melao mesa milho moeda montanha morango motor muro navio neve ninho nuvem oceano oficina ' +
    'onda orelha ostra ovelha padaria palco panela papel parafuso parede pato pedra peixe pena pente ' +
    'pera pijama pilha pimenta pincel pipoca piscina planeta pneu poeira ponte porta prato queijo quintal ' +
    'radio raiz rampa raposa rede relogio repolho rio roda rolha roupa sabao sacola sapato sapo semente ' +
    'serra sino sofa sopa tambor tapete teclado tecido telha tesoura tigela tijolo tinta tomate torre ' +
    'trator trem trigo trilho trombone tubo uva vaca vagao varanda vela vento vidro viola vulcao xicara zebra'
  ).split(' ');

  /** Inteiro de 0 a max-1, sem viés, vindo do gerador seguro. */
  function sortear(max) {
    const limite = Math.floor(0x100000000 / max) * max;
    const caixa = new Uint32Array(1);
    do { crypto.getRandomValues(caixa); } while (caixa[0] >= limite);
    return caixa[0] % max;
  }

  /** Três posições, cada uma símbolo ou dígito: o RandomPattern do C#. */
  const miolo = () => Array.from({ length: 3 }, () =>
    (sortear(2) === 0
      ? { tipo: 'simbolo', texto: SIMBOLOS[sortear(SIMBOLOS.length)] }
      : { tipo: 'numero', texto: String(sortear(10)) }));

  const palavra = () => {
    const p = PALAVRAS[sortear(PALAVRAS.length)];
    return { tipo: 'palavra', texto: p[0].toUpperCase() + p.slice(1) };   // PascalCase
  };

  function novaSenha(quantas) {
    const partes = [];
    for (let i = 0; i < quantas; i += 1) partes.push(...miolo(), palavra());
    partes.push(...miolo());
    return partes;
  }

  let atual = '';

  function mostrar() {
    const partes = novaSenha(Number(controle.value));
    atual = partes.map((p) => p.texto).join('');
    // cada pedaço ganha a própria cor, pra dar pra ler o padrão
    saida.replaceChildren(...partes.map((p) => {
      const span = document.createElement('span');
      span.className = `senha__${p.tipo}`;
      span.textContent = p.texto;
      return span;
    }));
    copiar.disabled = false;
  }

  gerar.addEventListener('click', mostrar);

  controle.addEventListener('input', () => {
    contagem.textContent = controle.value;
    if (atual) mostrar();
  });

  copiar.addEventListener('click', async () => {
    if (!atual) return;
    const rotulo = copiar.querySelector('span');
    const original = rotulo.textContent;
    try {
      await navigator.clipboard.writeText(atual);
      rotulo.textContent = window.gcTexto?.('password.copied') || original;
    } catch {
      // sem permissão de área de transferência: seleciona pra copiar na mão
      getSelection().selectAllChildren(saida);
    }
    setTimeout(() => { rotulo.textContent = original; }, 1600);
  });

  // já chega com uma senha na tela: caixa vazia parece coisa quebrada
  mostrar();
})();
