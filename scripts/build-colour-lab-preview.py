"""Export the actual CRI/CCT block as a self-contained review document."""
import base64
import mimetypes
import re
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
source = (root / "index.html").read_text()
section = re.search(r'<section\s+class="colour-lab"[\s\S]*?</section>', source).group()


def inline_image(match):
    path = root / match[1]
    mime = mimetypes.guess_type(path.name)[0]
    content = base64.b64encode(path.read_bytes()).decode()
    return f'src="data:{mime};base64,{content}"'


section = re.sub(r'src="(images/[^"]+)"', inline_image, section)
home = (root / "css/home.css").read_text()
css = home[:home.index(".home .home-hero {")]
css += (root / "css/site.css").read_text()
css += (root / "css/colour-lab.css").read_text()
script = (root / "js/colour-lab.js").read_text()
assert "</script" not in script.lower()
document = '''<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>SMP — CRI и цветовая температура</title><style>'''
document += css + '</style></head><body class="home"><main>'
document += section + "</main><script>" + script + "</script></body></html>\n"
target = root / "docs/preview-v2/colour-lab-interactive.html"
target.write_text(document)
print(f"Built {target.relative_to(root)}: {target.stat().st_size:,} bytes")

archive = target.with_suffix(".zip")
with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as package:
    package.write(target, target.name)
    package.writestr("START-HERE.txt", """SMP — CRI и цветовая температура

Распакуйте архив и откройте colour-lab-interactive.html в браузере.
Переключайте CRI / Цветовая температура и выбирайте одно из четырёх значений.
На компьютере и телефоне используются одинаковые сцена и параметры.
Установка, сервер и интернет для просмотра не нужны.

Это наглядная иллюстрация общего принципа, не фотометрическая симуляция.
""")
print(f"Built {archive.relative_to(root)}: {archive.stat().st_size:,} bytes")
