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
        <body><h1>Congratulations! The HTTP Server is working {message} </h1></body></html>"
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


def run(server_class=TCPServer, handler_class=ServerHandler, addr="", port=8080):
    logging.info(f"Starting httpd server on {addr}:{port}")
    server_address = (addr, port)
    httpd = server_class(server_address, handler_class)
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
        default=8000,
        help="Specify the port on which the server listens",
    )
    args = parser.parse_args()
    run(addr=args.listen, port=args.port)
