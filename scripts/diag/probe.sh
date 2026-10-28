#!/usr/bin/env bash
# Diagnostic de production (lecture seule) : état de l’application et de la base, temps de réponse des pages clés. Relance : 2026-10-28T07:05:41
set +e
out=data/diag/production.txt
mkdir -p data/diag
{
  echo "Relevé : $(date -u '+%Y-%m-%d %H:%M:%S') UTC"
  for path in /api/sante / /annuaire/mosquees-priere /adresses/masdjid-al-bashir-al-ibrahimi /recherche?q=mosquee "/demarches"; do
    code=$(curl -s -o /tmp/body -w '%{http_code} %{time_total}s' --max-time 40 "https://www.mydalil.com$path")
    echo "== $path → $code"
    if [ "$path" = /api/sante ]; then head -c 600 /tmp/body; echo; fi
    grep -o '[0-9  ]* résultats\?' /tmp/body | head -2
    grep -o 'La sélection se prépare' /tmp/body | head -1
    grep -o '"digest":"[^"]*"' /tmp/body | head -2
  done
} > "$out" 2>&1
cat "$out"
