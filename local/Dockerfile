# Same toolchain as .github/workflows/pages.yml.
FROM emscripten/emsdk:5.0.7

RUN apt-get update \
 && apt-get install -y --no-install-recommends ninja-build ca-certificates python3 curl \
 && rm -rf /var/lib/apt/lists/*
