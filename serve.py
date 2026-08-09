#!/usr/bin/env python3
"""Serveur local de dev qui désactive le cache navigateur, pour éviter
de voir une ancienne version d'un fichier après une modification."""

import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

if __name__ == "__main__":
    port = 8000
    http.server.test(HandlerClass=NoCacheHandler, port=port)
