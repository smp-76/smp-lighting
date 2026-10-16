"""Build an offline hero review file from the actual page, styles and controller."""
import base64
import mimetypes
import re
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / "index.html").read_text()
header = re.search(r'<header class="smp-header"[\s\S]*?</header>', source).group()
hero = re.search(r'<section class="home-hero"[\s\S]*?</section>', source).group()


def data_url(path):
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode()


def inline_image(match):
    return 'src="' + data_url(root / match[1]) + '"'


markup = re.sub(r'src="(images/[^"]+)"', inline_image, header + hero)


def navigation(match):
    href = match[1]
    if href.startswith("mailto:"):
        return match[0]
    if href.startswith("#"):
        href = "/" + href
    return 'href="https://smp-76.ru/' + href.lstrip("/") + '" target="_blank" rel="noopener"'


markup = re.sub(r'href="([^"]+)"', navigation, markup)
markup = markup.replace("</header>", '</header><main id="main-content">', 1) + "</main>"

# Preserve the actual stylesheet order, including shared header and SVG rules.
css = (root / "css/home.css").read_text() + "\n" + (root / "css/site.css").read_text()


def inline_background(match):
    return 'url("' + data_url((root / "css" / match[2]).resolve()) + '")'


css = re.sub(r"url\((['\"]?)([^)'\"]+)\1\)", inline_background, css)
controller = (root / "js/light-scene.js").read_text().replace("export function ", "function ", 1)
scripts = (root / "js/site.js").read_text() + "\n" + controller
scripts += '\nstartLightScene(document.querySelector(".light-stage"));'
assert "</script" not in scripts.lower()

document = '''<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>SMP — интерактивный просмотр hero FHB</title><style>'''
document += css + '''
.preview-note{padding:24px max(20px,calc((100% - 1328px)/2));color:#c5d3e8;background:#0d1e35;font:14px/1.7 Arial,sans-serif}.preview-note p{margin:0 0 8px}.preview-note strong{color:#fff}
</style></head><body class="home">'''
document += markup + '''
<aside class="preview-note"><p><strong>Интерактивная проверка hero.</strong> Двигайте мышь по всему блоку: участок склада под курсором освещается, светильник доворачивается, луч идёт от его оптики к выбранному месту.</p>
<p>На мобильном экране и при настройке «Уменьшение движения» сцена статична. Здесь показан только hero; ссылки открывают рабочий сайт в новой вкладке.</p></aside><script>'''
document += scripts + "</script></body></html>\n"
target = root / "docs/preview-v2/smp-hero-interactive.html"
target.write_text(document)
print(f"Built {target.relative_to(root)}: {target.stat().st_size:,} bytes; no external runtime assets")

archive = target.with_suffix(".zip")
instructions = """Интерактивный hero SMP

Откройте smp-hero-interactive.html в браузере двойным щелчком.
На компьютере разверните окно и двигайте мышь по всему hero.
Склад проявляется под курсором; луч идёт к нему от оптики светильника.
На узком экране и при настройке уменьшения движения сцена статична.
Сервер, подключение к интернету и установка программ для просмотра не нужны.
Ссылки открывают рабочий сайт в новой вкладке.
"""
with zipfile.ZipFile(archive, "w") as bundle:
    for name, content in [(target.name, document), ("README.txt", instructions)]:
        item = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
        item.compress_type = zipfile.ZIP_DEFLATED
        item.external_attr = 0o644 << 16
        bundle.writestr(item, content.encode("utf-8"))
print(f"Built {archive.relative_to(root)}: {archive.stat().st_size:,} bytes")
