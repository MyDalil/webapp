#!/usr/bin/env bash
# Diagnostic de production (lecture seule) : état de l’application et de la base, rapport du build (Vercel Blob).
set +e
out=data/diag/production.txt
mkdir -p data/diag
{
  echo "Relevé : $(date -u '+%Y-%m-%d %H:%M:%S') UTC"
  : > /tmp/home
  for u in / /annonces /villes/alger /vie-musulmane /services /praticiens /annuaire /explorer /que-faire-ce-week-end /adresses/djamaa-el-kebir-d-alger; do curl -s --max-time 30 "https://www.mydalil.com$u" >> /tmp/home; done
  blob=$(grep -oE 'https://[a-zA-Z0-9]+\.public\.blob\.vercel-storage\.com' /tmp/home | head -1)
  echo "Stockage photos : ${blob:-introuvable}"
  if [ -n "$blob" ]; then echo "== Rapport du build :"; curl -s --max-time 20 "$blob/diag/base.txt"; echo; fi
  code=$(curl -s -o /tmp/body -w '%{http_code}' --max-time 40 "https://www.mydalil.com/api/sante"); echo "== /api/sante → $code"; head -c 300 /tmp/body; echo
} > "$out" 2>&1
cat "$out"
