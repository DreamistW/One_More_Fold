"""LAN static server with optional HTTPS; standard library, no dependencies."""
import argparse
import errno
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import socket
import ssl

STATIC_DIRECTORY = Path(__file__).resolve().parent / 'dist'

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

def build_parser():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', default='0.0.0.0', help='Bind address (default: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8000, help='First port to try (default: 8000)')
    parser.add_argument('--certfile', type=Path, help='HTTPS certificate chain in PEM format')
    parser.add_argument('--keyfile', type=Path, help='HTTPS private key in PEM format')
    return parser


def create_server(host='0.0.0.0', port=8000, certfile=None, keyfile=None):
    if not 0 <= port <= 65535:
        raise ValueError('Port must be between 0 and 65535.')
    if bool(certfile) != bool(keyfile):
        raise ValueError('--certfile and --keyfile must be provided together.')
    tls = None
    if certfile:
        tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        tls.load_cert_chain(certfile=str(certfile), keyfile=str(keyfile))
    handler = partial(Handler, directory=str(STATIC_DIRECTORY))
    ports = [0] if port == 0 else range(port, min(port + 100, 65536))
    for candidate in ports:
        try:
            server = ThreadingHTTPServer((host, candidate), handler)
            break
        except OSError as exc:
            if exc.errno not in (errno.EADDRINUSE, 10048):
                raise
    else:
        raise OSError('No free port in the requested range.')
    if tls:
        try:
            server.socket = tls.wrap_socket(server.socket, server_side=True)
        except Exception:
            server.server_close()
            raise
    return server


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        server = create_server(args.host, args.port, args.certfile, args.keyfile)
    except (OSError, ValueError) as exc:
        parser.error(str(exc))
    port = server.server_address[1]
    scheme = 'https' if args.certfile else 'http'
    print(f'Listening: {args.host}:{port}', flush=True)
    local_host = '127.0.0.1' if args.host == '0.0.0.0' else args.host
    print(f'Local: {scheme}://{local_host}:{port}', flush=True)
    if args.host == '0.0.0.0':
        try:
            addresses = sorted(set(socket.gethostbyname_ex(socket.gethostname())[2]))
        except OSError:
            addresses = []
        for address in addresses:
            if not address.startswith(('127.', '169.254.')):
                print(f'Network: {scheme}://{address}:{port}', flush=True)
    if not args.certfile:
        print('Physical fold control on a phone requires HTTPS; LAN HTTP supports button/Enter controls.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
