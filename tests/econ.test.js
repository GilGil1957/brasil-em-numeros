const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../assets/econ.js");

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("juros = nominal − primário, convertido para R$ pelo PIB 12m", () => {
  // ago/2026: NFSP nominal 9,48% e primário 0,62% do PIB; PIB 12m R$ 13.340.676,3 mi
  const j = E.jurosDeNfsp(9.48, 0.62, 13340676.3);
  assert.equal(j.pctPib, 8.86);
  near(j.reais / 1e9, 1182.0, 0.5); // BCB divulga R$ 1.182,2 bi (diferença de arredondamento do %)
});

test("superávit primário (valor negativo) soma-se aos juros", () => {
  assert.equal(E.jurosDeNfsp(4.57, -1.25, 1).pctPib, 5.82);
});

test("médias mensal e diária", () => {
  const m = E.medias(365e9);
  assert.equal(m.dia, 1e9);
  near(m.mes, 30.4167e9, 1e6);
});

test("modo oficial é linear e simétrico", () => {
  assert.equal(E.impactoOficial(0, 68.9e9), 0);
  near(E.impactoOficial(0.1, 68.9e9), 6.89e9, 1);
  near(E.impactoOficial(-2, 68.9e9), -137.8e9, 1);
});

test("modo ilustrativo com base implícita e 100% de transmissão reproduz o oficial", () => {
  const base = E.baseImplicita(68.9e9);
  near(E.impactoIlustrativo(1, base, 1), E.impactoOficial(1, 68.9e9), 1);
  near(E.impactoIlustrativo(1, base, 0.5), 34.45e9, 1);
});

test("equivalências com o Bolsa Família", () => {
  const eq = E.equivalencias(1182.2e9, 678.18, 157.0e9);
  near(eq.vezesBF, 7.53, 0.01);
  near(eq.beneficiosMensais / 1e9, 1.743, 0.001);
  near(eq.familiasPorAno / 1e6, 145.27, 0.05);
});

test("passo de 0,1 p.p. sem ruído de ponto flutuante", () => {
  assert.equal(E.passo01(13.75 - 13.65), 0.1);
  assert.equal(E.passo01(0.1 + 0.2), 0.3);
});

test("frescor do dado", () => {
  const ref = new Date("2026-09-30"), hoje = new Date("2026-10-20");
  assert.equal(E.frescor(ref, 30, hoje).status, "em dia");
  assert.equal(E.frescor(new Date("2026-06-01"), 30, hoje).status, "desatualizado");
});

test("sensibilidade BCB ago/2026: 1 p.p. = R$ 71,5 bi; 0,1 p.p. = R$ 7,15 bi", () => {
  near(Math.abs(E.impactoOficial(-1, 71.5e9)), 71.5e9, 1);
  near(Math.abs(E.impactoOficial(-0.1, 71.5e9)), 7.15e9, 1);
});

test("famílias por 12 meses com −1 p.p. e benefício médio de set/2026", () => {
  const eq = E.equivalencias(71.5e9, 678.18, 19.29e6 * 678.18 * 12);
  near(eq.familiasPorAno / 1e6, 8.786, 0.005);   // 71,5 bi ÷ (678,18 × 12)
  near(eq.mesesDeBF, 5.47, 0.01);
});

test("o snapshot traz a sensibilidade com período de referência", () => {
  const s = require("../data/snapshot.json").indicadores.sens_selic_1pp_bi;
  assert.equal(s.valor, 71.5); assert.equal(s.ref, "2026-08"); assert.equal(s.publicado, "2026-09-30");
});
