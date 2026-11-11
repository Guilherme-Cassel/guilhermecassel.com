# guilhermecassel.com

Site pessoal / portfólio de Guilherme Cassel, desenvolvedor .NET e músico.

HTML, CSS e JavaScript escritos na mão. **Sem framework, sem dependência.**
Não tem `npm install`, não tem bundle: o que está no repositório é exatamente
o que o navegador recebe.

O único passo de geração é o `build.mjs`, que roda na sua máquina e grava o
texto dos JSON dentro do HTML, uma página por idioma:

```bash
node build.mjs
```

Ele lê `src/index.html` (a estrutura) e `content/*.json` (o texto) e gera
`index.html` (inglês), `pt/index.html` (português) e `sitemap.xml`. Os três
vão pro repositório; o Cloudflare Pages só serve o que está commitado.
**Mudou o JSON ou o `src/index.html`? Roda o build antes do commit.**

## Rodar local

```bash
npx --yes serve . -l 4321
```

E abrir <http://localhost:4321>. Precisa de um servidor (mesmo esse) porque o
texto do site é carregado de arquivos JSON, e abrir o `index.html` com dois
cliques não funciona por causa da política de origem do navegador.

## Onde mexer em quê

```
src/index.html          a estrutura da página. Não tem texto aqui dentro.
build.mjs               junta estrutura + texto e gera as páginas abaixo
index.html              GERADO: a página em inglês. Não editar.
pt/index.html           GERADO: a página em português. Não editar.
sitemap.xml             GERADO.
robots.txt              aponta o sitemap pros buscadores
404.html                página de erro.
content/en.json         TODO o texto em inglês  ← é aqui que se edita o site
content/pt.json         TODO o texto em português
assets/css/tokens.css   as decisões visuais: cor, raio, sombra, tipo, tempo
assets/css/system.css   base e componentes reutilizáveis
assets/css/site.css     o que só existe nesta página
assets/js/site.js       todo o comportamento, comentado de ponta a ponta
assets/js/previa.js     a janelinha do topo onde o jogo se joga sozinho
assets/js/trombone.js   o trombone tocável (baixado só perto da seção de música)
assets/js/senha.js      a demonstração do friendly-password-generator
assets/js/segredos.js   o d20 do rodapé e o código Konami do modo difícil
assets/js/demos.js      as demonstrações dentro dos cards de projeto (etiqueta,
                        assinatura, planilhas, rede); um projeto ganha uma
                        pondo "demo" nele em content/*.json
assets/img/             fotos já otimizadas (webp + jpg de reserva)
design-system/          Cadência: o guia visual vivo, abre no navegador
.github/workflows/      a esteira que publica no Cloudflare Pages
_headers                cabeçalhos HTTP lidos pelo Cloudflare Pages
```

**Para mudar uma frase do site, edite o JSON, rode `node build.mjs` e
commite.** Editar só o JSON pela interface do GitHub ainda funciona pra quem
abre o site no navegador (o `site.js` relê o JSON), mas o texto gravado no
HTML, que é o que buscador e preview de link enxergam, só muda com o build.
As duas línguas têm
exatamente as mesmas chaves: criou chave nova num arquivo, cria no outro.

A regra que mantém o visual coerente: se um valor não existe em `tokens.css`,
a pergunta não é "qual número eu escrevo aqui?", é "isso merece virar um
token?". Trocar o azul do site inteiro é editar uma linha.

## O que o site faz

- **Bilíngue**: inglês em `/`, português em `/pt/`, cada um com seu endereço, `hreflang` e texto no HTML. O botão `PT`/`EN` no topo é um link entre os dois.
- **Tema escuro e claro**: nasce escuro, e a escolha de quem clicar no botão fica lembrada no navegador.
- **Idade e tempo de experiência se calculam sozinhos** a partir das datas em `content/*.json`. Nenhum número envelhece esquecido.
- **O nome chega empurrado** por um extensor duplo de pistões a cada carregamento da página, com a mesma sequência do Minecraft: o da frente estende, o de trás empurra o da frente, os dois recolhem e o nome fica. As texturas são SVG desenhado à mão, não arquivo do jogo.
- **Efeitos**: cursor customizado (vira uma peninha em cima do nome), contadores, menu que some ao descer, troca de tema animada, máquina de escrever no subtítulo, botões magnéticos, manchas de luz desfocadas no fundo.
- **Acessibilidade**: HTML semântico, navegação por teclado com anel de foco desenhado, link de pular para o conteúdo, e `prefers-reduced-motion` desligando o movimento todo de uma vez.
- **Sem som, sem autoplay, sem banner de cookie.**

## Publicar

O Cloudflare Pages serve o repositório como está. Duas opções:

O repositório está conectado ao Cloudflare Pages, que publica sozinho a cada
push na `master`. Build command vazio, output directory `/`. O `_headers` e o
`404.html` são lidos pelo Pages sem configurar nada.

## Analytics

Não tem nenhum rastreador no site. Para ligar o Cloudflare Web Analytics, que
não usa cookie e por isso dispensa banner de consentimento: painel da
Cloudflare › Web Analytics › adicionar o site, e colar o token na última linha
do `index.html`, antes do `</body>`:

```html
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon='{"token": "SEU_TOKEN"}'></script>
```

## Por que o `src/index.html` parece vazio

Porque ele é só estrutura. Nenhum texto mora nele: cada elemento diz de onde
vem o conteúdo pelo atributo `data-t`. O `build.mjs` preenche a partir do JSON
de cada idioma na hora de gerar as páginas, e o `assets/js/site.js` faz o
mesmo no navegador. O `<script>` no `<head>` é inline e sem `defer` de
propósito, porque precisa aplicar tema e idioma antes da primeira pintura;
qualquer outra coisa ali dentro faria a página piscar.

## Créditos das escolhas

O visual segue o design system **Cadência** (`design-system/index.html`), que
documenta cada decisão de cor, forma, tipografia e movimento, e serve de
referência para qualquer coisa nova que entrar no site.
