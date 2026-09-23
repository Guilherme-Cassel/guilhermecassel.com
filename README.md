# guilhermecassel.com

Site pessoal / portfólio de Guilherme Cassel, desenvolvedor .NET e músico.

HTML, CSS e JavaScript escritos na mão. **Sem framework, sem build, sem
dependência.** Não tem `npm install`, não tem bundle: o que está no repositório
é exatamente o que o navegador recebe.

## Rodar local

```bash
npx --yes serve . -l 4321
```

E abrir <http://localhost:4321>. Precisa de um servidor (mesmo esse) porque o
texto do site é carregado de arquivos JSON, e abrir o `index.html` com dois
cliques não funciona por causa da política de origem do navegador.

## Onde mexer em quê

```
index.html              a estrutura da página. Não tem texto aqui dentro.
404.html                página de erro.
content/en.json         TODO o texto em inglês  ← é aqui que se edita o site
content/pt.json         TODO o texto em português
assets/css/tokens.css   as decisões visuais: cor, raio, sombra, tipo, tempo
assets/css/system.css   base e componentes reutilizáveis
assets/css/site.css     o que só existe nesta página
assets/js/site.js       todo o comportamento, comentado de ponta a ponta
assets/img/             fotos já otimizadas (webp + jpg de reserva)
design-system/          Cadência: o guia visual vivo, abre no navegador
.github/workflows/      a esteira que publica no Cloudflare Pages
_headers                cabeçalhos HTTP lidos pelo Cloudflare Pages
```

**Para mudar uma frase do site, edite o JSON; dá pra fazer direto pela
interface do GitHub, commitar, e em segundos está no ar.** As duas línguas têm
exatamente as mesmas chaves: criou chave nova num arquivo, cria no outro.

A regra que mantém o visual coerente: se um valor não existe em `tokens.css`,
a pergunta não é "qual número eu escrevo aqui?", é "isso merece virar um
token?". Trocar o azul do site inteiro é editar uma linha.

## O que o site faz

- **Bilíngue**: começa em inglês, botão `PT`/`EN` no topo, escolha lembrada no navegador.
- **Tema escuro e claro**: nasce escuro, e a escolha de quem clicar no botão fica lembrada no navegador.
- **Idade e tempo de experiência se calculam sozinhos** a partir das datas em `content/*.json`. Nenhum número envelhece esquecido.
- **O nome chega empurrado** por um extensor duplo de pistões a cada carregamento da página, com a mesma sequência do Minecraft: o da frente estende, o de trás empurra o da frente, os dois recolhem e o nome fica. As texturas são SVG desenhado à mão, não arquivo do jogo.
- **Efeitos**: cursor customizado (vira uma peninha em cima do nome), contadores, menu que some ao descer, troca de tema animada, máquina de escrever no subtítulo, botões magnéticos, manchas de luz desfocadas no fundo.
- **Acessibilidade**: HTML semântico, navegação por teclado com anel de foco desenhado, link de pular para o conteúdo, e `prefers-reduced-motion` desligando o movimento todo de uma vez.
- **Sem som, sem autoplay, sem banner de cookie.**

## Publicar

O Cloudflare Pages serve o repositório como está. Duas opções:

1. **Conectar o repositório** no painel do Cloudflare Pages, que publica sozinho a cada push, sem configurar nada. Build command vazio, output directory `/`.
2. **Pelo GitHub Actions**: o `.github/workflows/deploy.yml` já está pronto; basta criar os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no repositório.

Analytics: o trecho do Cloudflare Web Analytics está no fim do `index.html`,
comentado, esperando o token.

## Créditos das escolhas

O visual segue o design system **Cadência** (`design-system/index.html`), que
documenta cada decisão de cor, forma, tipografia e movimento, e serve de
referência para qualquer coisa nova que entrar no site.
