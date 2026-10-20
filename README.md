# Brasil em Números

**Quanto o Brasil poderia economizar com juros menores? Calcule você mesmo.**

Ferramenta pública de educação econômica, independente e apartidária. O visitante escolhe uma redução hipotética da Selic e vê:

1. a economia anual estimada no custo dos juros da dívida pública;
2. a equivalência dessa economia com o Bolsa Família: quantas famílias poderiam receber o benefício médio durante 12 meses.

Os números observados (juros pagos, dívida bruta, Selic, Bolsa Família), os gráficos históricos e a metodologia ficam nas seções de aprofundamento.

> Simulação, não previsão. O cálculo usa a sensibilidade da dívida líquida à Selic publicada pelo Banco Central. Não é economia imediata nem dinheiro automaticamente disponível para programas sociais.

## Como funciona o cálculo

```
economia anual         = redução da Selic (p.p.) × sensibilidade BCB (R$ por 1 p.p. mantido 12 meses)
famílias por 12 meses  = economia ÷ (benefício médio × 12)
meses de Bolsa Família = economia ÷ (famílias atendidas × benefício médio)
```

A sensibilidade vem da seção 3, "Elasticidades da DLSP e da DBGG", da nota mensal *Estatísticas Fiscais* do Banco Central. Valor em uso:

| Referência | Publicação | Redução de 1 p.p. na Selic (12 meses) |
|---|---|---|
| agosto/2026 | 30/09/2026 | −R$ 71,5 bi na DLSP (−0,54 p.p. do PIB) |

## Estrutura

```
index.html               página única (PWA)
assets/econ.js           fórmulas puras, sem dados embutidos
assets/app.js            interface
assets/styles.css        estilos (claro e escuro)
data/snapshot.json       último dado validado de cada indicador, com fonte e referência
scripts/update_data.py   atualiza as séries do BCB (SGS) mantendo o último dado válido se a API falhar
scripts/build_preview.py gera dist/preview.html em arquivo único, para revisão
tests/econ.test.js       testes das fórmulas (node --test tests/*.test.js)
.github/workflows/       publicação no Pages e atualização automática dos dados
```

## Publicar no GitHub Pages

1. Crie um repositório e envie estes arquivos para a branch `main`.
2. Em **Settings → Pages**, escolha **Source: GitHub Actions**.
3. O workflow `pages.yml` roda os testes e publica a cada push.
4. O workflow `update-data.yml` atualiza as séries do Banco Central em dias úteis e faz commit quando há dado novo.

## Atualização manual mensal

Dois indicadores dependem de conferência humana, porque não há API adequada:

- **Sensibilidade à Selic**: a tabela da nota do BCB é publicada como imagem no PDF. Após cada nota (fim do mês), atualize `sens_selic_1pp_bi` em `data/snapshot.json` com valor, `ref` e `publicado`.
- **Bolsa Família**: famílias atendidas e benefício médio da folha mais recente divulgada pelo MDS (`bf_familias_mi`, `bf_beneficio_medio`).

## Fontes

| Indicador | Fonte |
|---|---|
| Selic meta | BCB SGS 432 |
| Selic efetiva mensal | BCB SGS 4189 |
| Resultado nominal e primário, 12 meses, % PIB | BCB SGS 5727 e 5793 |
| PIB 12 meses | BCB SGS 4382 |
| Dívida Bruta do Governo Geral | BCB SGS 13761 e 13762 |
| Sensibilidade à Selic | BCB, nota Estatísticas Fiscais, seção 3 |
| Bolsa Família | MDS, folha mensal |

## Licença

Código sob licença MIT. Dados públicos das fontes indicadas.
