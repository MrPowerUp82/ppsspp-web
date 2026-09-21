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
    button.disabled = state === "checking" || state === "preparing";

    const label = button.querySelector("span") || button;
    const labels = {
      checking: "Verificando jogo…",
      prepare: "Preparar jogo",
      preparing: "Baixando jogo…",
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
      if (button.dataset.state === "ready") {
        // Diagnostic/stability option for this portfolio game only.
        // The generic "Start PPSSPP" path remains untouched.
        window.__PORTFOLIO_FORCE_INTERPRETER = cfg.forceInterpreter === true;
        window.playOrMountStoredGame(cfg.fileName || "EBOOT.PBP");
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
