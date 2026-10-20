// econ.js — cálculos econômicos puros (sem I/O, sem números oficiais embutidos).
// Todas as funções recebem os dados como parâmetros; os valores vêm do módulo de dados.

const Econ = (() => {
  const DIAS_ANO = 365;

  /** Juros nominais 12m em R$ a partir das séries de NFSP (% PIB) e do PIB 12m (R$ milhões).
   *  Identidade oficial do BCB: resultado nominal = resultado primário + juros nominais.
   *  Convenção NFSP: valores positivos = necessidade (déficit). */
  function jurosDeNfsp(nominalPctPib, primarioPctPib, pib12mMilhoes) {
    const jurosPct = nominalPctPib - primarioPctPib;
    return { pctPib: round(jurosPct, 2), reais: (jurosPct / 100) * pib12mMilhoes * 1e6 };
  }

  /** Média mensal e diária de um valor acumulado em 12 meses. */
  function medias(valorAnual) {
    return { mes: valorAnual / 12, dia: valorAnual / DIAS_ANO };
  }

  /** Modo oficial: sensibilidade publicada pelo BCB (R$ por 1 p.p. de Selic mantido 12 meses).
   *  Aproximação linear, válida para variações moderadas. */
  function impactoOficial(deltaPP, sensReaisPor1pp) {
    return deltaPP * sensReaisPor1pp;
  }

  /** Modo ilustrativo: base exposta à Selic × variação × fração transmitida em 12 meses. */
  function impactoIlustrativo(deltaPP, baseExpostaReais, transmissao) {
    return (deltaPP / 100) * baseExpostaReais * transmissao;
  }

  /** Base exposta implícita na sensibilidade oficial (R$ que reprecificam 1:1 com a Selic). */
  function baseImplicita(sensReaisPor1pp) {
    return sensReaisPor1pp * 100;
  }

  /** Equivalências financeiras com o Bolsa Família. */
  function equivalencias(valorAnual, beneficioMedioMensal, despesaBFAnual) {
    return {
      vezesBF: valorAnual / despesaBFAnual,
      beneficiosMensais: valorAnual / beneficioMedioMensal,
      familiasPorAno: valorAnual / (beneficioMedioMensal * 12),
      mesesDeBF: valorAnual / (despesaBFAnual / 12),
    };
  }

  /** Despesa mensal estimada do programa (famílias × benefício médio). */
  function despesaMensalBF(familias, beneficioMedio) {
    return familias * beneficioMedio;
  }

  /** Arredonda variação de taxa ao passo de 0,1 p.p., evitando ruído de ponto flutuante. */
  function passo01(x) {
    return Math.round(x * 10) / 10;
  }

  /** Classifica o frescor de um dado conforme sua periodicidade de publicação. */
  function frescor(dataReferencia, periodicidadeDias, hoje) {
    const dias = Math.floor((hoje - dataReferencia) / 86400000);
    const limite = periodicidadeDias * 2; // publicação defasada é normal; 2 ciclos sem novidade = desatualizado
    return { dias, status: dias <= limite ? "em dia" : "desatualizado" };
  }

  function round(x, casas) {
    const f = 10 ** casas;
    return Math.round(x * f) / f;
  }

  return { jurosDeNfsp, medias, impactoOficial, impactoIlustrativo, baseImplicita,
           equivalencias, despesaMensalBF, passo01, frescor, round };
})();

if (typeof module !== "undefined") module.exports = Econ;
