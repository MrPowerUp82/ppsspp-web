"""Static server for the local Pages bundle.

Sends the cross-origin isolation headers PPSSPP's pthreads need (SharedArrayBuffer), so the
page works on the first load without waiting for the service worker, and disables caching
so every rebuild is picked up on reload.
"""
import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".wasm": "application/wasm",
        ".js": "text/javascript",
        ".webmanifest": "application/manifest+json",
    }

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    handler = functools.partial(Handler, directory=root)
    with http.server.ThreadingHTTPServer(("0.0.0.0", port), handler) as server:
        print(f"Serving {root} on http://localhost:{port}", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()
