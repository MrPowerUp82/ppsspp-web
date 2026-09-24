# Arcana Survivors — PSP no navegador

Página de portfólio para executar a versão PSP de **Arcana Survivors** diretamente no navegador usando PPSSPP WebAssembly e GitHub Pages, sem VPS/backend permanente.

## Já configurado para a v0.9.2

Este template aponta para a release:

- Jogo: `Arcana Survivors`
- PSP: `arcana-survivors-v0.9.3-psp.cso`
- Release: `https://github.com/MrPowerUp82/wizard-coop-ports/releases/tag/v0.9.3`
- SHA-256: `815307332646d835533734aabdea96d89630eda396c184b8f5a25690da1f27fd`

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
baixa arcana-survivors-v0.9.3-psp.cso
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

## Testar localmente (Docker)

`local/` reproduz o workflow do GitHub Pages num container `emscripten/emsdk:5.0.7`, sem
precisar publicar para testar:

```bash
docker compose -f local/docker-compose.yml run --rm build
docker compose -f local/docker-compose.yml up serve
```

Depois abra `http://localhost:8080`. Os fontes do upstream, o build do Emscripten e o
`node_modules` ficam no volume Docker `arcana-psp-local_work`, então só o primeiro build é
demorado; os seguintes recompilam só o que mudou. O servidor manda os headers COOP/COEP
e `Cache-Control: no-store`, então basta recarregar a página depois de cada build.

Para começar do zero: `docker volume rm arcana-psp-local_work`.

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


## Crash no boot: `memory access out of bounds` (mimalloc)

Ao iniciar o jogo, o núcleo WASM caía com `RuntimeError: memory access out of bounds`
logo depois de carregar o ELF, tanto pelo botão **Jogar agora** quanto pelo menu do PPSSPP.
Com os nomes de função no `.wasm` (`--profiling-funcs`), o trace mostrou a causa:

```text
attempt_allocate <- mi_os_prim_alloc <- ... <- mi_malloc_aligned <- __mmap
  <- AllocateMemoryPages <- DrawEngineCommon() <- GPU_GLES() <- GPU_Init <- PSP_InitStart
```

O erro acontece dentro do alocador **mimalloc**, que a build release do `ppsspp-wasm`
liga com `-DWASM_MALLOC=mimalloc`, quando a thread do emulador inicializa a GPU. Não é um
problema do `.cso` nem do jeito de dar boot. `customization/patch_upstream.py` troca o
alocador para `dlmalloc` e mantém `--profiling-funcs` para que futuros crashes venham com nomes.

## Boot do jogo: `PPSSPP_BootGame`

`customization/patch_upstream.py` também:

1. Adiciona ao `ppsspp-wasm` (`UI/NativeApp.cpp`) duas funções exportadas:
   `PPSSPP_IsUIReady()` e `PPSSPP_BootGame()`. A segunda posta a mesma mensagem
   `REQUEST_GAME_BOOT` que o botão "Load" do menu.
2. Expõe `start()` como `window.portfolioStartEmulator`.

O `portfolio.js` sobe o emulador sem jogo, espera o menu, monta o `.cso` em `/games`,
grava o caminho em `/tmp/ppsspp-boot-request` e chama `Module._PPSSPP_BootGame()`.

O botão genérico **Start PPSSPP** do upstream fica escondido nesta página
(`customization/portfolio.css`). Para abrir o emulador ocioso pelo console:

```js
document.getElementById('idleStartBtn').click()
```
