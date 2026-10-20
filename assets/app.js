/* Brasil em Números — interface.
   Depende de: Econ (assets/econ.js), Chart (opcional) e do snapshot de dados
   (inline em <script id="snapshot"> ou em data/snapshot.json). */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  /* ---------- dados ---------- */
  async function loadSnapshot() {
    const inline = document.getElementById("snapshot");
    if (inline && inline.textContent.trim().startsWith("{")) return { snap: JSON.parse(inline.textContent), origem: "cópia validada" };
    try {
      const r = await fetch("data/snapshot.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      return { snap: await r.json(), origem: "data/snapshot.json" };
    } catch (e) {
      try { const c = localStorage.getItem("ben-snapshot"); if (c) return { snap: JSON.parse(c), origem: "cópia local (fonte indisponível)", stale: true }; } catch (_) {}
      throw e;
    }
  }
  let loaded;
  try { loaded = await loadSnapshot(); }
  catch (e) { $("#fatal").hidden = false; return; }
  const { snap } = loaded;
  try { localStorage.setItem("ben-snapshot", JSON.stringify(snap)); } catch (_) {}
  const ind = (k) => snap.indicadores[k];
  const g = (k) => ind(k).valor;
  function serie(k) {
    const s = snap.series[k]; const [y, m] = s.inicio.split("-").map(Number);
    return s.valores.map((v, i) => { const d = new Date(y, m - 1 + i, 1); return { label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(". de ", "/").replace(".", ""), v }; });
  }

  /* ---------- formatação ---------- */
  const nf = (v, d = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = {
    brl(v, d = 1) { const a = Math.abs(v), s = v < 0 ? "−" : "";
      if (a >= 1e12) return s + "R$ " + nf(a / 1e12, 2) + " tri";
      if (a >= 1e9) return s + "R$ " + nf(a / 1e9, d) + " bi";
      if (a >= 1e6) return s + "R$ " + nf(a / 1e6, d) + " mi";
      return s + a.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); },
    pessoas(v) { if (v >= 1e6) return nf(v / 1e6, 1) + " milhões"; if (v >= 1e3) return nf(v / 1e3, 0) + " mil"; return nf(v); },
    pct: (v, d = 2) => nf(v, d) + "%",
    ref(r) {
      if (/^\d{4}-\d{2}$/.test(r)) { const [y, m] = r.split("-"); return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(". de ", "/").replace(" de ", "/").replace(".", ""); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(r)) { const [y, m, d] = r.split("-"); return `${d}/${m}/${y}`; }
      return r; }
  };

  /* ---------- valores ---------- */
  const juros = Econ.jurosDeNfsp(g("nfsp_nominal_12m_pct"), g("nfsp_primario_12m_pct"), g("pib_12m_mi"));
  const V = {
    selic: g("selic_meta"), sens: g("sens_selic_1pp_bi") * 1e9, sensRef: ind("sens_selic_1pp_bi").ref,
    juros: juros.reais, jurosPct: juros.pctPib, dbggRs: g("dbgg_rs_mi") * 1e6, dbggPct: g("dbgg_pct"),
    familias: g("bf_familias_mi") * 1e6, medio: g("bf_beneficio_medio"), medioReaj: g("bf_beneficio_medio_pos_reajuste"),
    ploa: g("bf_orcamento_2026_bi") * 1e9
  };
  const MAX_CUT = Math.min(5, Math.floor(V.selic) - 2);

  /* ---------- estado ---------- */
  const state = { cut: 1.0, reaj: false };
  const m = /^#r(\d+(?:\.\d)?)$/.exec(location.hash) || /[?&]r=(\d+(?:\.\d)?)/.exec(location.search);
  if (m) state.cut = Math.min(MAX_CUT, Math.max(0, Econ.passo01(Number(m[1]))));

  function calc() {
    const cut = Econ.passo01(state.cut);
    const economia = Math.abs(Econ.impactoOficial(-cut, V.sens));
    const medio = state.reaj ? V.medioReaj : V.medio;
    const bfAno = Econ.despesaMensalBF(V.familias, medio) * 12;
    const eq = Econ.equivalencias(economia, medio, bfAno);
    return { cut, economia, medias: Econ.medias(economia), medio, bfAno, eq, nova: Econ.round(V.selic - cut, 2) };
  }

  /* ---------- simulador (primeira dobra) ---------- */
  const slider = $("#cut");
  slider.max = MAX_CUT; slider.value = state.cut;
  $("#tickMax").textContent = "−" + nf(MAX_CUT, 0) + " p.p.";
  const CHIPS = [0.5, 1, 2, 3].filter((c) => c <= MAX_CUT);
  $("#chips").innerHTML = CHIPS.map((c) => `<button type="button" data-c="${c}" aria-pressed="false" aria-label="Reduzir ${nf(c, 1)} ponto percentual">−${nf(c, 1)}</button>`).join("");

  function renderSim() {
    const r = calc();
    slider.value = r.cut;
    slider.style.setProperty("--fill", (r.cut / MAX_CUT) * 100 + "%");
    slider.setAttribute("aria-valuetext", `Redução de ${nf(r.cut, 1)} ponto percentual, Selic de ${nf(r.nova, 2)}%`);
    $("#cutVal").textContent = "−" + nf(r.cut, 1) + " p.p.";
    $("#fromTo").innerHTML = `Selic de <b>${fmt.pct(V.selic)}</b> para <b>${fmt.pct(r.nova)}</b> ao ano`;
    document.querySelectorAll("#chips button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.c) === r.cut)));

    const bi = r.economia / 1e9;
    $("#resVal").innerHTML = `R$ ${nf(bi, 1)}<small>bilhões</small>`;
    $("#resSub").innerHTML = `por ano, se mantida por 12 meses · <b>${fmt.brl(r.medias.mes, 2)}</b> por mês · <b>${fmt.brl(r.medias.dia, 0)}</b> por dia`;

    $("#eqBig").innerHTML = `<span>${fmt.pessoas(r.eq.familiasPorAno)}</span> de famílias`;
    $("#eqLead").textContent = `poderiam receber o benefício médio do Bolsa Família (${fmt.brl(r.medio)} por mês) durante 12 meses.`;
    const share = Math.min(100, (r.eq.familiasPorAno / V.familias) * 100);
    $("#meterFill").style.width = share + "%";
    $("#meter").setAttribute("aria-label", `${nf(share, 0)}% das famílias atendidas hoje`);
    $("#meterL").textContent = `${nf(r.eq.familiasPorAno / V.familias * 100, 0)}% das famílias atendidas hoje`;
    $("#meterR").textContent = `${nf(V.familias / 1e6, 1)} mi atendidas`;
    $("#eqAlt").innerHTML = `Equivale a <b>${nf(r.eq.mesesDeBF, 1)} meses</b> de todo o programa, ou <b>${fmt.pessoas(r.eq.beneficiosMensais)}</b> de benefícios mensais.`;
    $("#reajToggle").textContent = state.reaj ? "Usar folha de set/2026 (oficial)" : "Usar benefício pós-reajuste (estimativa)";
    $("#medioTag").textContent = state.reaj ? "Benefício médio estimado após reajuste de out/2026" : `Benefício médio oficial da folha de ${fmt.ref(ind("bf_beneficio_medio").ref)}, MDS`;
    if (charts.cVs) drawVs();
  }
  slider.addEventListener("input", () => { state.cut = Number(slider.value); renderSim(); });
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; state.cut = Number(b.dataset.c); renderSim(); });
  $("#reajToggle").addEventListener("click", () => { state.reaj = !state.reaj; renderSim(); });

  $("#sensLine").textContent = `Sensibilidade BCB: R$ ${nf(V.sens / 1e9, 1)} bi por 1 p.p. de Selic mantido por 12 meses · ref. ${fmt.ref(V.sensRef)} · publicada em ${fmt.ref(ind("sens_selic_1pp_bi").publicado)}`;

  /* ---------- compartilhar ---------- */
  function shareText() {
    const r = calc();
    const url = location.origin + location.pathname + "#r" + r.cut.toFixed(1);
    return { url, text:
`Quanto o Brasil poderia economizar com juros menores?
Se a Selic caísse ${nf(r.cut, 1)} p.p. (de ${fmt.pct(V.selic)} para ${fmt.pct(r.nova)}) e ficasse assim por 12 meses, o custo dos juros da dívida cairia cerca de R$ ${nf(r.economia / 1e9, 1)} bilhões no ano.
Isso equivale ao benefício médio do Bolsa Família para ${fmt.pessoas(r.eq.familiasPorAno)} de famílias durante 12 meses.
Simulação baseada na sensibilidade publicada pelo Banco Central (ref. ${fmt.ref(V.sensRef)}). Não é previsão nem dinheiro disponível de imediato.
Calcule você mesmo: ${url}` };
  }
  $("#btnShare").addEventListener("click", async () => {
    const { text, url } = shareText();
    if (navigator.share) { try { await navigator.share({ title: "Brasil em Números", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(text); toast("Texto copiado. Cole no WhatsApp ou onde quiser."); return; } catch (_) {}
    const box = $("#shareBox"); box.hidden = false; box.value = text; box.focus(); box.select(); toast("Selecione e copie o texto");
  });
  function toast(msg) { const t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

  /* ---------- tema ---------- */
  try { const t = localStorage.getItem("ben-tema"); if (t) document.documentElement.dataset.theme = t; } catch (_) {}
  $("#btnTheme").addEventListener("click", () => {
    const r = document.documentElement;
    const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    r.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("ben-tema", r.dataset.theme); } catch (_) {}
    drawCharts();
  });

  /* ---------- números de hoje ---------- */
  const HOJE = new Date(snap.validado_em + "T12:00:00");
  function meta(k, extra = "") {
    const d = ind(k);
    const fr = d.publicado ? Econ.frescor(new Date(d.publicado + "T12:00:00"), d.periodicidade_dias || 31, HOJE) : null;
    const st = fr ? `<span class="tag ${fr.status === "em dia" ? "ok" : "old"}">${fr.status}</span>` : "";
    return `<div class="meta">${extra}${st}<span>${d.fonte}</span><span>Ref. ${fmt.ref(d.ref)}</span></div>`;
  }
  const card = (t, v, cls, sub, k, extra) => `<article class="card"><h3>${t}</h3><div class="val ${cls}">${v}</div><p class="sub">${sub}</p>${meta(k, extra)}</article>`;
  const bfMes = Econ.despesaMensalBF(V.familias, V.medio);
  const jm = Econ.medias(V.juros);
  $("#cards").innerHTML = [
    card("Juros nominais em 12 meses", fmt.brl(V.juros), "cost", `<b>${fmt.pct(V.jurosPct)}</b> do PIB · <b>${fmt.brl(jm.mes)}</b> por mês · <b>${fmt.brl(jm.dia, 2)}</b> por dia`, "nfsp_nominal_12m_pct"),
    card("Dívida Bruta do Governo Geral", fmt.brl(V.dbggRs), "", `<b>${fmt.pct(V.dbggPct)}</b> do PIB`, "dbgg_rs_mi"),
    card("Selic meta", fmt.pct(V.selic) + " a.a.", "", `Próxima reunião do Copom: ${fmt.ref(ind("selic_meta").proxima_reuniao)}`, "selic_meta"),
    card("Bolsa Família no mês", fmt.brl(bfMes, 2), "save", `<b>${nf(V.familias / 1e6, 2)} mi</b> de famílias × benefício médio de <b>${fmt.brl(V.medio)}</b>`, "bf_familias_mi", `<span class="tag est">calculado</span>`),
    card("Bolsa Família no ano", fmt.brl(bfMes * 12), "save", `Mês × 12. Dotação na PLOA 2026: <b>${fmt.brl(V.ploa)}</b>`, "bf_familias_mi", `<span class="tag est">estimativa anualizada</span>`),
    card("Juros ÷ Bolsa Família", nf(V.juros / (bfMes * 12), 1) + "×", "cost", "Juros de 12 meses comparados ao Bolsa Família anualizado. Equivalência financeira.", "nfsp_nominal_12m_pct")
  ].join("");
  const rows = [0.1, 0.5, 1, 2, 3].map((p) => {
    const v = Math.abs(Econ.impactoOficial(-p, V.sens)); const e = Econ.equivalencias(v, V.medio, bfMes * 12);
    return `<tr><td>−${nf(p, 1)} p.p.</td><td>${fmt.brl(v, 2)}</td><td>${fmt.pessoas(e.familiasPorAno)}</td><td>${nf(e.mesesDeBF, 1)}</td></tr>`;
  }).join("");
  $("#tblRed").innerHTML = `<thead><tr><th>Redução da Selic</th><th>Economia anual</th><th>Famílias por 12 meses</th><th>Meses de Bolsa Família</th></tr></thead><tbody>${rows}</tbody>`;

  $("#status").textContent = `Dados validados em ${fmt.ref(snap.validado_em)} · origem: ${loaded.origem}${loaded.stale ? " (desatualizado)" : ""}`;

  /* ---------- gráficos ---------- */
  const charts = {};
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  function opts(yFmt) {
    const ink = css("--muted"), grid = css("--line");
    return { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + yFmt(c.parsed.y) } } },
      scales: { x: { ticks: { color: ink, maxRotation: 0, autoSkip: true, maxTicksLimit: 6, font: { family: "IBM Plex Mono", size: 10 } }, grid: { display: false } },
                y: { ticks: { color: ink, font: { family: "IBM Plex Mono", size: 10 }, callback: (v) => yFmt(v) }, grid: { color: grid } } } };
  }
  function line(id, s, color, yFmt) {
    charts[id]?.destroy();
    charts[id] = new Chart(document.getElementById(id), { type: "line",
      data: { labels: s.map((p) => p.label), datasets: [{ data: s.map((p) => p.v), borderColor: color, backgroundColor: color + "22", fill: true, borderWidth: 2, tension: .2,
        pointRadius: s.map((_, i) => (i === s.length - 1 ? 4 : 0)), pointBackgroundColor: color }] }, options: opts(yFmt) });
  }
  function drawVs() {
    const r = calc(); charts.cVs?.destroy();
    const o = opts((v) => "R$ " + nf(v, 0) + " bi"); o.indexAxis = "y";
    const x = o.scales.x; o.scales.x = o.scales.y; o.scales.y = { ...x, ticks: { ...x.ticks, font: { family: "IBM Plex Sans", size: 12 } } };
    o.plugins.tooltip.callbacks = { label: (c) => " R$ " + nf(c.parsed.x, 1) + " bi" };
    charts.cVs = new Chart(document.getElementById("cVs"), { type: "bar",
      data: { labels: ["Juros (12 meses)", "Bolsa Família (ano)", `Economia simulada (−${nf(r.cut, 1)} p.p.)`],
        datasets: [{ data: [V.juros / 1e9, r.bfAno / 1e9, r.economia / 1e9], backgroundColor: [css("--cost"), css("--save"), css("--accent")], borderRadius: 6, barThickness: 30 }] }, options: o });
  }
  function drawCharts() {
    if (typeof Chart === "undefined") { document.querySelectorAll(".chart-box").forEach((b) => (b.innerHTML = '<p class="sub">Gráfico indisponível: a biblioteca de gráficos não carregou.</p>')); return; }
    const nom = serie("nfsp_nominal_pct"), pri = serie("nfsp_primario_pct");
    line("cJuros", nom.map((p, i) => ({ ...p, v: Econ.round(p.v - pri[i].v, 2) })), css("--cost"), (v) => nf(v, 1) + "%");
    line("cSelic", serie("selic_efetiva"), css("--accent"), (v) => nf(v, 1) + "%");
    line("cDbgg", serie("dbgg_pct"), css("--ink"), (v) => nf(v, 0) + "%");
    drawVs();
  }
  drawCharts();
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", drawCharts);

  renderSim();
})();
