#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if /usr/bin/curl --silent --fail --max-time 1 http://127.0.0.1:8001/index.html >/dev/null; then
  /usr/bin/open http://127.0.0.1:8001/
  exit 0
fi
/usr/bin/open http://127.0.0.1:8001/
python3 -m http.server 8001 --bind 127.0.0.1
