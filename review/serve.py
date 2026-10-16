"""Local client review server. Standard library only; serves this package on loopback."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

parser = argparse.ArgumentParser(description="Локальный просмотр сайта SMP")
parser.add_argument("--no-browser", action="store_true", help="Не открывать браузер автоматически")
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
handler = partial(SimpleHTTPRequestHandler, directory=str(root))
with ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
    url = f"http://127.0.0.1:{server.server_port}/"
    print(url, flush=True)
    print("Сайт SMP для согласования. Оставьте это окно открытым во время просмотра.", flush=True)
    print("Чтобы завершить просмотр, нажмите Ctrl+C или закройте окно.", flush=True)
    if not args.no_browser:
        threading.Timer(.3, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
