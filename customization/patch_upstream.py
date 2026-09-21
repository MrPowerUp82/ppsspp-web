from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path


def require_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Upstream mudou: não encontrei o trecho esperado em {label}: {old[:80]!r}")
    return text.replace(old, new, 1)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("uso: patch_upstream.py <upstream-dir> <custom-dir>")

    upstream = Path(sys.argv[1]).resolve()
    custom = Path(sys.argv[2]).resolve()
    cdir = custom / "customization"
    app = upstream / "wasm-page"
    public = app / "public"

    # Preserve upstream legal/docs links inside the published static site.
    for name in ("LICENSE.TXT", "README.md"):
        src = upstream / name
        if src.exists():
            shutil.copy2(src, public / name)

    # Assets authored by this template.
    shutil.copy2(cdir / "portfolio-config.js", public / "portfolio-config.js")
    shutil.copy2(cdir / "portfolio.js", public / "portfolio.js")

    # Copy any supported PSP build downloaded/provided in custom/game.
    supported_game_exts = {".cso", ".iso", ".pbp", ".elf", ".prx", ".chd"}
    source_game_dir = custom / "game"
    game_dir = public / "game"
    included_games = []
    if source_game_dir.exists():
        for local_game in sorted(source_game_dir.iterdir()):
            if local_game.is_file() and local_game.suffix.lower() in supported_game_exts:
                game_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(local_game, game_dir / local_game.name)
                included_games.append(local_game.name)
                print(f"Included local game: {local_game}")
    if not included_games:
        print("No supported PSP build found in game/; portfolio-config.js must point to a reachable gameUrl.")

    # Add the portfolio JS to the Angular host page and localize metadata.
    index_path = app / "src" / "index.html"
    index = index_path.read_text(encoding="utf-8")
    index = index.replace('<html lang="en">', '<html lang="pt-BR">')
    index = index.replace('<title>PPSSPP Web</title>', '<title>Arcana Survivors — Jogar no navegador</title>')
    index = index.replace('<meta name="theme-color" content="#00d4aa">', '<meta name="theme-color" content="#111427">')
    index = require_replace(
        index,
        '  <app-root></app-root>\n',
        '  <app-root></app-root>\n  <script src="portfolio-config.js"></script>\n  <script src="portfolio.js" defer></script>\n',
        "src/index.html",
    )
    index_path.write_text(index, encoding="utf-8")

    # Keep every DOM hook the upstream runtime expects, but replace only the landing content.
    html_path = app / "src" / "app" / "app.html"
    html = html_path.read_text(encoding="utf-8")
    html = require_replace(html, '<span>PPSSPP Web</span>', '<span id="portfolioBrand">Arcana Survivors</span>', "app.html")
    html = require_replace(html, '<div class="idle-kicker">Ready to play</div>', '<div class="idle-kicker">Port nativo para PSP</div>', "app.html")
    html = require_replace(html, '<h1 class="idle-title">Your PSP is waiting.</h1>', '<h1 class="idle-title" id="portfolioTitle">Arcana Survivors</h1>', "app.html")
    html = require_replace(
        html,
        '<p class="idle-subtitle" id="idleSubtitle">Open a PSP game file or pick one from the library to start PPSSPP in the browser.</p>',
        '<p class="idle-subtitle" id="portfolioSubtitle">Versão nativa em C++ para PSP, executada diretamente no navegador.</p>\n'
        '            <div id="portfolioMeta">\n'
        '              <span class="portfolio-pill">por <strong id="portfolioDeveloper" style="margin-left:4px">Seu Nome</strong></span>\n'
        '              <span class="portfolio-pill" id="portfolioTech">PSP • PPSSPP • WebAssembly</span>\n'
        '            </div>',
        "app.html",
    )
    html = require_replace(
        html,
        '<button id="idleStartBtn" class="primary" type="button"><i data-lucide="play"></i><span> Start PPSSPP</span></button>',
        '<button id="portfolioPlayBtn" class="primary" type="button"><i data-lucide="play"></i><span>Preparar jogo</span></button>\n'
        '              <button id="idleStartBtn" class="primary" type="button"><i data-lucide="play"></i><span> Start PPSSPP</span></button>',
        "app.html",
    )
    html = require_replace(
        html,
        '<a class="btn idle-repo-link" href="https://github.com/root-hunter/ppsspp-web" target="_blank" rel="noopener" title="Open PPSSPP Web repository">\n                <i data-lucide="git-fork"></i><span> GitHub Repo</span>\n              </a>',
        '<a class="btn idle-repo-link" id="portfolioProjectLink" href="#" target="_blank" rel="noopener">\n                <i data-lucide="git-fork"></i><span> Código do projeto</span>\n              </a>\n'
        '              <div id="portfolioGameStatus">Preparando a interface…</div>',
        "app.html",
    )
    html = require_replace(
        html,
        '<a class="idle-powered" href="https://github.com/root-hunter" target="_blank" rel="noopener" title="Powered by root-hunter">',
        '<div class="portfolio-credit">Emulação via PPSSPP WebAssembly • créditos preservados no painel About</div>\n'
        '        <a class="idle-powered" href="https://github.com/root-hunter" target="_blank" rel="noopener" title="Powered by root-hunter">',
        "app.html",
    )
    html_path.write_text(html, encoding="utf-8")

    # Layer custom CSS after upstream styles.
    styles_path = app / "src" / "styles.css"
    styles = styles_path.read_text(encoding="utf-8")
    marker = "/* --- PSP PORTFOLIO CUSTOMIZATION --- */"
    if marker not in styles:
        styles += "\n\n" + marker + "\n" + (cdir / "portfolio.css").read_text(encoding="utf-8") + "\n"
    styles_path.write_text(styles, encoding="utf-8")

    # Expose tiny public hooks instead of forking the 4k+ line runtime.
    runtime_path = public / "ppsspp-runtime.js"
    runtime = runtime_path.read_text(encoding="utf-8")
    hook = "window.playOrMountStoredGame = playOrMountStoredGame;"
    injected = (
        "window.portfolioDownloadGame = addGameURLToLibrary;\n"
        "window.portfolioGameExists = async function(name) {\n"
        "  try { await opfsGetGameFile(name); return true; } catch (_) { return false; }\n"
        "};\n"
        + hook
    )
    runtime = require_replace(runtime, hook, injected, "public/ppsspp-runtime.js")
    runtime_path.write_text(runtime, encoding="utf-8")

    # Brand the installable PWA, while retaining upstream icons and technical shell.
    manifest_path = public / "manifest.webmanifest"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest.update({
        "name": "Arcana Survivors",
        "short_name": "Arcana",
        "description": "Arcana Survivors para PSP executado no navegador com PPSSPP e WebAssembly",
        "background_color": "#060711",
        "theme_color": "#111427",
    })
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("Portfolio customization applied successfully.")


if __name__ == "__main__":
    main()
