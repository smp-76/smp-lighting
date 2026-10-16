#!/bin/sh
set -eu
review_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if command -v python3 >/dev/null 2>&1; then
  exec python3 "$review_root/review/serve.py"
fi
printf '%s\n' 'Для полной работы каталога нужен Python 3.' 'Открываю автономные демонстрации и снимки.'
open "$review_root/review/START-HERE.html"
