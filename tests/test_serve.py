import threading
import unittest
from urllib.request import urlopen
from unittest.mock import patch
import serve


class ServerTests(unittest.TestCase):
    def test_default_binding_and_explicit_loopback(self):
        args = serve.build_parser().parse_args([])
        self.assertEqual((args.host, args.port), ('0.0.0.0', 8000))
        self.assertEqual(serve.build_parser().parse_args(['--host', '127.0.0.1']).host, '127.0.0.1')

    def test_invalid_port_and_unpaired_certificates_are_rejected(self):
        for port in (-1, 65536):
            with self.assertRaises(ValueError):
                serve.create_server(port=port)
        with self.assertRaises(ValueError):
            serve.create_server(certfile='certificate.pem')

    def test_invalid_certificate_does_not_silently_fall_back_to_http(self):
        with patch.object(serve, 'ThreadingHTTPServer') as server_factory:
            with self.assertRaises(OSError):
                serve.create_server(certfile='missing-test-certificate.pem', keyfile='missing-test-key.pem')
            server_factory.assert_not_called()

    def test_static_http_and_module_mime(self):
        server = serve.create_server('127.0.0.1', 0)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            address = f'http://127.0.0.1:{server.server_address[1]}'
            with urlopen(address + '/', timeout=5) as response:
                self.assertEqual(response.status, 200)
                self.assertIn(b'physical-fold', response.read())
            with urlopen(address + '/device-posture.mjs', timeout=5) as response:
                self.assertEqual(response.headers.get_content_type(), 'text/javascript')
                self.assertEqual(response.headers['Cache-Control'], 'no-store')
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=5)


if __name__ == '__main__':
    unittest.main()
