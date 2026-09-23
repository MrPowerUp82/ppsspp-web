# Build do jogo

Você não precisa commitar o `.cso` neste repositório.

Durante o deploy, `.github/workflows/pages.yml` baixa automaticamente:

`arcana-survivors-v0.9.0-psp.cso`

Da release oficial:

`https://github.com/MrPowerUp82/wizard-coop-ports/releases/tag/v0.9.0`

O workflow confere o SHA-256 antes de incluir o arquivo no site:

`a1a3018d83d0214fa08c3225dde5121a6194c66dfdaa8da871e92645223b4081`

Depois o `.cso` é copiado para `game/` dentro do bundle do GitHub Pages, ficando na mesma origem do frontend.
