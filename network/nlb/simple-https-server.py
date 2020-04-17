from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import TCPServer
import sys
import logging
import socket
import argparse
import ssl


class ServerHandler(BaseHTTPRequestHandler):
    def _set_response(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()

    def _html(self, message):
        content = f"<html><head><title>Python is awesome!</title></head>\
        <body><h1>Congratulations! The HTTPS Server for TLS is working {message} </h1></body></html>"
        return content.encode("utf8")  # NOTE: must return a bytes object!

    def do_GET(self):
        logging.info("GET request,\nPath: %s\nHeaders:\n%s\n",
                     str(self.path), str(self.headers))
        host_name = socket.gethostname()
        host_ip = socket.gethostbyname(host_name)
        self._set_response()
        self.wfile.write(self._html(
            host_name + " : " + host_ip + "reqeust: " + self.path))

    def do_HEAD(self):
        self._set_response()

    def do_POST(self):
        self._set_response()
        try:
            content_len = int(self.headers.get('Content-Length'))
        except:
            content_len = int(self.headers.getheader('Content-Length'))

        post_body = self.rfile.read(content_len)
        logging.info("POST request,\nPath: %s\nHeaders:\n%s\n\nBody:\n%s\n",
                     str(self.path), str(self.headers), post_body.decode('utf-8'))
        self.wfile.write(self._html(post_body))

    def do_PUT(self):
        self.do_POST()


def runtls(server_class=TCPServer, handler_class=ServerHandler, addr="", port=8443):
    logging.info(f"Starting httpd TLS server on {addr}:{port}")
    server_address = (addr, port)
    httpd = server_class(server_address, handler_class)
    # PROTOCOL_TLS_SERVER， PROTOCOL_TLS， PROTOCOL_TLS_CLIENT
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain('/path/to/public.crt', '/path/to/private.key')
    # bindsocket = socket.socket(socket.AF_INET, socket.SOCK_STREAM, 0)
    # bindsocket.bind(server_address)
    # bindsocket.listen(5)
    # ssock = context.wrap_socket(bindsocket, server_side=True)
    # request = ssock.read()
    # logging.info(request)
    httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    parser = argparse.ArgumentParser(description="Run a simple HTTP server")
    parser.add_argument(
        "-l",
        "--listen",
        default="localhost",
        help="Specify the IP address on which the server listens",
    )
    parser.add_argument(
        "-p",
        "--port",
        type=int,
        default=8443,
        help="Specify the port on which the server listens",
    )
    args = parser.parse_args()
    runtls(addr=args.listen, port=args.port)
