# Build do jogo

Você não precisa commitar o `.cso` neste repositório.

Durante o deploy, `.github/workflows/pages.yml` baixa automaticamente:

`arcana-survivors-v0.9.3-psp.cso`

Da release oficial:

`https://github.com/MrPowerUp82/wizard-coop-ports/releases/tag/v0.9.3`

O workflow confere o SHA-256 antes de incluir o arquivo no site:

`815307332646d835533734aabdea96d89630eda396c184b8f5a25690da1f27fd`

Depois o `.cso` é copiado para `game/` dentro do bundle do GitHub Pages, ficando na mesma origem do frontend.
