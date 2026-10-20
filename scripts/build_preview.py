#!/usr/bin/env python3
"""Gera dist/preview.html: o site em um único arquivo (CSS, JS e dados embutidos), para revisão."""
import json, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
html = (R / "index.html").read_text()
body = html.split("<body>", 1)[1].rsplit("</body>", 1)[0]
head = html.split("<head>", 1)[1].split("</head>", 1)[0]
title = head[head.index("<title>"):head.index("</title>") + 8]
fonts = [l for l in head.splitlines() if "fonts.g" in l]
css = (R / "assets/styles.css").read_text()
econ = (R / "assets/econ.js").read_text().replace('if (typeof module !== "undefined") module.exports = Econ;', "")
app = (R / "assets/app.js").read_text()
snap = json.dumps(json.loads((R / "data/snapshot.json").read_text()), ensure_ascii=False, separators=(",", ":"))
body = body.replace("<!--INLINE-STYLES-->", "<style>\n" + css + "\n</style>")
body = body.replace("<!--INLINE-DATA-->", f'<script type="application/json" id="snapshot">{snap}</script>')
body = body.replace('<script src="assets/econ.js"></script>', "<script>\n" + econ + "\n</script>")
body = body.replace('<script src="assets/app.js"></script>', "<script>\n" + app + "\n</script>")
cut = body.index('<script>\n  if ("serviceWorker"'); body = body[:cut] + body[body.index("</script>", cut) + 9:]
out = title + '\n<meta name="claude:viewport-fit-sides" content="cover">\n' + "\n".join(fonts) + "\n" + body
(R / "dist").mkdir(exist_ok=True); (R / "dist/preview.html").write_text(out)
print("dist/preview.html", len(out), "bytes")
