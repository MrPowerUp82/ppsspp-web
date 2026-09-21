(() => {
  const cfg = window.PORTFOLIO_GAME || {};
  const q = (selector) => document.querySelector(selector);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function absoluteGameUrl() {
    return new URL(cfg.gameUrl || "game/EBOOT.PBP", location.href).href;
  }

  function setText(selector, value) {
    const el = q(selector);
    if (el && value) el.textContent = value;
  }

  function setState(button, state, detail = "") {
    button.dataset.state = state;
    button.disabled = state === "checking" || state === "preparing" || state === "starting";

    const label = button.querySelector("span") || button;
    const labels = {
      checking: "Verificando jogo…",
      prepare: "Preparar jogo",
      preparing: "Baixando jogo…",
      starting: "Iniciando…",
      ready: "Jogar agora",
      error: "Tentar novamente",
    };
    label.textContent = labels[state] || "Jogar agora";

    const status = q("#portfolioGameStatus");
    if (status) {
      status.textContent = detail || ({
        checking: "Verificando se o build já está salvo neste navegador.",
        prepare: "O jogo será baixado uma vez e salvo localmente no navegador.",
        preparing: "Preparando o build do PSP. Arquivos maiores podem levar alguns instantes.",
        starting: "Iniciando o emulador e carregando o jogo…",
        ready: "Pronto. Clique em Jogar agora.",
        error: "Não foi possível preparar o jogo.",
      }[state] || "");
      status.dataset.state = state;
    }
  }

  async function waitForElement(selector, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const el = q(selector);
      if (el) return el;
      await sleep(50);
    }
    return null;
  }

  async function waitForRuntimeApi() {
    for (let i = 0; i < 1200; i++) {
      if (
        typeof window.portfolioGameExists === "function" &&
        typeof window.portfolioDownloadGame === "function" &&
        typeof window.portfolioStartEmulator === "function" &&
        typeof window.playOrMountStoredGame === "function"
      ) return true;
      await sleep(50);
    }
    return false;
  }

  async function gameExists() {
    try {
      return await window.portfolioGameExists(cfg.fileName || "EBOOT.PBP");
    } catch (_) {
      return false;
    }
  }

  async function prepare(button) {
    setState(button, "preparing");
    try {
      await window.portfolioDownloadGame(absoluteGameUrl());
      if (!(await gameExists())) throw new Error("O download terminou, mas o jogo não apareceu no armazenamento local.");

      setState(button, "ready");
      return true;
    } catch (error) {
      console.error(error);
      setState(button, "error", error?.message || String(error));
      return false;
    }
  }

  // Booting with the game as a command-line argument crashes the WASM core
  // ("memory access out of bounds"), so the emulator is started with no game and the
  // game is booted through the same UI path as the menu's "Load" button
  // (PPSSPP_IsUIReady / PPSSPP_BootGame, added to the core by patch_upstream.py).
  const VIRTUAL_GAME_DIR = "/games";
  const BOOT_REQUEST_FILE = "/tmp/ppsspp-boot-request";

  async function waitForEmulatorUi(timeoutMs = 60000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const mod = window.Module;
      if (window.FS && typeof mod?._PPSSPP_IsUIReady === "function" && mod._PPSSPP_IsUIReady()) return true;
      await sleep(50);
    }
    return false;
  }

  async function launch(button) {
    button.dataset.retry = "";
    setState(button, "starting");
    const fileName = cfg.fileName || "EBOOT.PBP";
    const gamePath = `${VIRTUAL_GAME_DIR}/${fileName}`;
    try {
      await window.portfolioStartEmulator();
      if (!(await waitForEmulatorUi())) throw new Error("O emulador não terminou de iniciar.");

      // Idle mode does not mount the stored game; put it in the emulator's /games directory.
      await window.playOrMountStoredGame(fileName);
      if (!window.FS.analyzePath(gamePath).exists) throw new Error("Não foi possível montar o jogo no emulador.");

      const mod = window.Module;
      if (typeof mod._PPSSPP_BootGame !== "function") {
        throw new Error("Esta build do emulador não tem PPSSPP_BootGame. Escolha o jogo no menu do PPSSPP.");
      }
      window.FS.writeFile(BOOT_REQUEST_FILE, gamePath);
      if (!mod._PPSSPP_BootGame()) throw new Error("O emulador não aceitou o pedido de boot do jogo.");
    } catch (error) {
      console.error(error);
      button.dataset.retry = "launch";
      setState(button, "error", error?.message || String(error));
    }
  }

  async function bootPortfolio() {
    document.documentElement.lang = "pt-BR";
    if (cfg.title) document.title = `${cfg.title} — Jogar no navegador`;

    const button = await waitForElement("#portfolioPlayBtn");
    if (!button) {
      console.error("Portfolio UI did not render.");
      return;
    }

    // Angular has rendered the landing page at this point.
    setText("#portfolioBrand", cfg.title || "Meu Jogo para PSP");
    setText("#portfolioTitle", cfg.title || "Meu Jogo para PSP");
    setText("#portfolioSubtitle", cfg.subtitle);
    setText("#portfolioDeveloper", cfg.developer);
    setText("#portfolioTech", cfg.tech);

    const renderedProjectLink = q("#portfolioProjectLink");
    if (renderedProjectLink && cfg.projectUrl) renderedProjectLink.href = cfg.projectUrl;

    setState(button, "checking");
    const runtimeReady = await waitForRuntimeApi();
    if (!runtimeReady) {
      setState(button, "error", "A interface do emulador não terminou de carregar.");
      return;
    }

    setState(button, (await gameExists()) ? "ready" : "prepare");

    button.addEventListener("click", async () => {
      if (button.dataset.state === "ready" || button.dataset.retry === "launch") {
        await launch(button);
        return;
      }
      await prepare(button);
    });

    if (cfg.autoPrepare && button.dataset.state === "prepare") {
      void prepare(button);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPortfolio, { once: true });
  } else {
    void bootPortfolio();
  }
})();
