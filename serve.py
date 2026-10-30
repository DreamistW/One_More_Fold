"""Loopback-only static preview; standard library, no dependencies."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import errno

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

directory = Path(__file__).resolve().parent / 'dist'
handler = partial(Handler, directory=str(directory))
for port in range(8000, 8100):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), handler)
        break
    except OSError as exc:
        if exc.errno not in (errno.EADDRINUSE, 10048):
            raise
else:
    raise SystemExit('Ports 8000-8099 are all in use.')
print(f'Local: http://127.0.0.1:{port}', flush=True)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
