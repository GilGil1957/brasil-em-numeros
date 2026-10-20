#!/usr/bin/env python3
"""Atualiza data/snapshot.json a partir da API SGS do Banco Central.

Roda no GitHub Actions (agendado). Regras:
- só substitui um valor se a API responder com dado válido;
- se uma série falhar, mantém o último dado validado (e o app sinaliza como desatualizado);
- a sensibilidade à Selic e os dados do Bolsa Família NÃO são automáticos: são conferidos
  manualmente na nota do BCB e na folha do MDS (ver README).
"""
import json, sys, urllib.request, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SNAP = ROOT / "data" / "snapshot.json"
API = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados?formato=json&dataInicial=01/01/2016"

PONTUAIS = {  # chave do snapshot -> código SGS
    "dbgg_pct": 13762, "dbgg_rs_mi": 13761, "nfsp_nominal_12m_pct": 5727,
    "nfsp_primario_12m_pct": 5793, "pib_12m_mi": 4382,
}
SERIES = {"dbgg_pct": 13762, "nfsp_nominal_pct": 5727, "nfsp_primario_pct": 5793, "selic_efetiva": 4189}

def sgs(code):
    with urllib.request.urlopen(API.format(code=code), timeout=60) as r:
        rows = json.load(r)
    out = [(datetime.datetime.strptime(x["data"], "%d/%m/%Y").date(), float(x["valor"])) for x in rows]
    if not out:
        raise ValueError("série vazia")
    return out

def main():
    snap = json.loads(SNAP.read_text())
    falhas, hoje = [], datetime.date.today().isoformat()
    cache = {}
    def get(code):
        if code not in cache:
            cache[code] = sgs(code)
        return cache[code]

    for key, code in PONTUAIS.items():
        try:
            d, v = get(code)[-1]
            ind = snap["indicadores"][key]
            if ind["ref"] != d.strftime("%Y-%m"):
                ind["publicado"] = hoje
            ind.update(valor=v, ref=d.strftime("%Y-%m"))
        except Exception as e:
            falhas.append(f"{key}: {e}")

    try:
        rows = sgs(432)  # Selic meta diária: guarda a data em que o valor atual começou
        v = rows[-1][1]; inicio = rows[-1][0]
        for d, x in reversed(rows):
            if x != v: break
            inicio = d
        sel = snap["indicadores"]["selic_meta"]
        sel.update(valor=v, ref=inicio.isoformat())
    except Exception as e:
        falhas.append(f"selic_meta: {e}")

    for key, code in SERIES.items():
        try:
            rows = [r for r in get(code) if r[0] >= datetime.date(2016, 1, 1)]
            snap["series"][key].update(inicio="2016-01", valores=[x for _, x in rows])
        except Exception as e:
            falhas.append(f"série {key}: {e}")

    snap["validado_em"] = hoje
    SNAP.write_text(json.dumps(snap, ensure_ascii=False, indent=1) + "\n")
    if falhas:
        print("Mantido o último dado validado para:", *falhas, sep="\n  ")
    print("snapshot atualizado em", hoje)

if __name__ == "__main__":
    sys.exit(main())
