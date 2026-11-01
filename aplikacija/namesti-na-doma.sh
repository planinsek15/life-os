#!/usr/bin/env bash
# Zgradi aplikacijo in jo naloži na domači strežnik (ssh alias "doma").
# Strežnik in podatki: /opt/lifeos (program), /var/lib/lifeos (data.json + zgodovina).
set -euo pipefail
cd "$(dirname "$0")"
npm run build
tar -C dist -czf - . | ssh doma 'set -e
  rm -rf ~/nalozi/www && mkdir -p ~/nalozi/www && tar -C ~/nalozi/www -xzf -
  sudo rm -rf /opt/lifeos/www.nov && sudo cp -r ~/nalozi/www /opt/lifeos/www.nov
  sudo chmod -R a+rX /opt/lifeos/www.nov
  sudo rm -rf /opt/lifeos/www.staro && sudo mv /opt/lifeos/www /opt/lifeos/www.staro
  sudo mv /opt/lifeos/www.nov /opt/lifeos/www && sudo rm -rf /opt/lifeos/www.staro'
echo "Naloženo: http://192.168.1.10:8090  (tablica: /tablica, od drugod: https://doma.TVOJ-TAILNET.ts.net:8443)"
