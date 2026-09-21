window.PORTFOLIO_GAME = {
  title: "Arcana Survivors",
  subtitle: "Versão nativa em C++ para PSP, jogável diretamente no navegador com PPSSPP + WebAssembly.",
  developer: "MrPowerUp82",
  tech: "PSP • C++20 • SDL2 • PPSSPP • WebAssembly",

  projectUrl: "https://github.com/MrPowerUp82/wizard-coop-ports",

  // O GitHub Actions baixa este arquivo da release v0.6.0 e o publica
  // junto do site para o navegador carregá-lo pela mesma origem.
  fileName: "arcana-survivors-v0.6.0-psp.cso",
  gameUrl: "game/arcana-survivors-v0.6.0-psp.cso",

  // Teste de compatibilidade: força o CPU Interpreter apenas quando
  // Arcana Survivors é iniciado pelo botão do portfólio. O modo normal
  // do emulador continua usando as configurações padrão do PPSSPP.
  forceInterpreter: true,

  // Mantém o download sob ação explícita do visitante.
  autoPrepare: false,
};
