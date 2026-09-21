# Arcana Survivors — PSP no navegador

Página de portfólio para executar a versão PSP de **Arcana Survivors** diretamente no navegador usando PPSSPP WebAssembly e GitHub Pages, sem VPS/backend permanente.

## Já configurado para a v0.6.0

Este template aponta para a release:

- Jogo: `Arcana Survivors`
- PSP: `arcana-survivors-v0.6.0-psp.cso`
- Release: `https://github.com/MrPowerUp82/wizard-coop-ports/releases/tag/v0.6.0`
- SHA-256: `a1a3018d83d0214fa08c3225dde5121a6194c66dfdaa8da871e92645223b4081`

O `.cso` **não precisa ser commitado** neste repositório. O GitHub Actions baixa o arquivo da release, confere o SHA-256 e o coloca dentro do bundle publicado no GitHub Pages.

Isso tem duas vantagens:

1. o repositório do portfólio fica pequeno;
2. o navegador carrega o `.cso` pela mesma origem do site, evitando depender de CORS do GitHub Releases durante o gameplay.

## Publicar

Crie um repositório para a página e envie o conteúdo desta pasta para a branch `main`:

```bash
git init
git add .
git commit -m "Arcana Survivors PSP browser portfolio"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

No GitHub, configure:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

O workflow fará o restante:

```text
checkout
  ↓
baixa PPSSPP Web/WASM
  ↓
baixa arcana-survivors-v0.6.0-psp.cso
  ↓
confere SHA-256
  ↓
compila PPSSPP para WebAssembly
  ↓
monta a página de portfólio
  ↓
publica no GitHub Pages
```

## Experiência do visitante

Na primeira visita, a pessoa clica em **Preparar jogo**. O `.cso` é baixado do próprio site e salvo no armazenamento privado do navegador (OPFS). Depois o botão muda para **Jogar agora**.

Em visitas seguintes, enquanto o armazenamento do site não tiver sido apagado, o jogo já poderá aparecer como pronto.

## Alterar a versão do jogo

Ao publicar uma nova versão, altere quatro pontos.

Em `.github/workflows/pages.yml`:

```yaml
env:
  GAME_FILE: arcana-survivors-vX.Y.Z-psp.cso
  GAME_URL: https://github.com/MrPowerUp82/wizard-coop-ports/releases/download/vX.Y.Z/arcana-survivors-vX.Y.Z-psp.cso
  GAME_SHA256: COLOQUE_O_SHA256_AQUI
```

E em `customization/portfolio-config.js`:

```js
fileName: "arcana-survivors-vX.Y.Z-psp.cso",
gameUrl: "game/arcana-survivors-vX.Y.Z-psp.cso",
```

## Personalização

Os textos principais ficam em:

```text
customization/portfolio-config.js
```

A aparência fica em:

```text
customization/portfolio.css
```

## Créditos e licença

A build usa `root-hunter/ppsspp-web`, `root-hunter/ppsspp-wasm` e PPSSPP. Os avisos legais do projeto upstream são preservados. Consulte `LICENSE-NOTICE.md`.


## Correção para travamento em “Starting PPSSPP…”

Esta versão desativa o caminho rápido de montagem via `WORKERFS` no boot do jogo.
Em algumas builds do Emscripten, uma falha em `FS.mount(WORKERFS, ...)` chama `abort()`;
mesmo que o JavaScript capture a exceção e tente cair para MEMFS, o runtime WASM já fica abortado.
Como o Arcana Survivors é pequeno, o jogo é carregado diretamente em `MEMFS`, evitando esse estado fatal.

Depois de atualizar o repositório, execute novamente o workflow do GitHub Pages.
Se o navegador ainda estiver usando a build antiga, remova o Service Worker/cache do site e recarregue.
