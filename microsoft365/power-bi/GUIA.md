# Power BI · relatórios automáticos no padrão JOPE / INOVA / SAÚDE

Nesta pasta:

| Arquivo | Para quê |
|---|---|
| `tema-jope.json` | Tema geral (relatório consolidado e capa) |
| `tema-inova.json` | Tema do relatório ou página da INOVA BH |
| `tema-saude.json` | Tema do relatório ou página da SAÚDE BH |
| `consultas-power-query.pq` | Consultas: status normalizado, tabela única de processos e previsão de conclusão |
| `medidas.dax` | Indicadores, risco, previsão e as medidas de **cor por unidade** |

## 1 · Aplicar o tema

Power BI Desktop › **Exibição › Temas › Procurar temas** e escolha o JSON.

O tema vale para o relatório inteiro, não para cada página. Por isso a recomendação é:
- **Relatório consolidado** com `tema-jope.json`. Nos visuais filtrados por unidade, use a medida **Cor da unidade** (passo 4), que troca a cor automaticamente quando o segmentador está em INOVA ou SAÚDE.
- Se vocês enviam **relatórios separados** para cada SPE, salve uma cópia do relatório com `tema-inova.json` e outra com `tema-saude.json`.

## 2 · Consultas

1. **Transformar dados › Nova fonte › Consulta nula**.
2. Crie as consultas **Site**, **fnStatus**, **fnLista**, **Processos** e **Terrenos**, colando cada bloco do arquivo `.pq` no **Editor avançado**.
3. Na primeira atualização, entre com a sua conta corporativa (**Conta organizacional**).

> O conector "Lista do SharePoint Online" na implementação 2.0 usa os **nomes de exibição** das colunas ("Situação", "Data de Início"…). Se alguma coluna vier com outro nome, ajuste no `fnLista`. Colunas de pesquisa, como **Terreno**, podem vir como registro; nesse caso, expanda o campo `Title`/`Value`.

## 3 · Medidas

Crie uma tabela vazia **Medidas** (Página Inicial › Inserir dados › OK) e adicione cada medida do arquivo `medidas.dax`.

## 4 · Cor por unidade dentro do relatório

Nos gráficos de barras, cartões e títulos: **Formatar › Cores › fx › Formatar estilo: Valor do campo › Campo: [Cor da unidade]**.
- Sem filtro, ou com as duas unidades: **roxo JOPE**.
- Segmentador em INOVA BH: **verde #0D5A55**.
- Segmentador em SAÚDE BH: **roxo #6E368C**.

Para as cores de status, use **[Cor do status]**. Para o nível de risco, use **[Cor do risco]**.

## 5 · Sugestão de páginas

1. **Visão geral:** cartões (Processos, Abertos, % Concluído, Protocolos vencidos), barras empilhadas por módulo e status, segmentador de unidade.
2. **Prazos:** tabela de processos com Limite de protocolo, Previsão de retorno e Conclusão prevista, com formatação condicional (vencido em vermelho, até 7 dias em âmbar).
3. **Risco:** tabela por terreno com Índice de risco, Nível de risco, Liberação prevista e Prazo de liberação, ordenada pelo risco.
4. **Tempo de ciclo:** Duração média (dias) por módulo, para comparar com as metas.

## 6 · Atualização automática e envio

1. Publique no **workspace** da equipe.
2. Em **Configurações do modelo semântico › Atualização agendada**, configure 7h e 13h.
3. Para receber o relatório por e-mail, use **Assinar relatório** no Power BI Service, com um envio para cada SPE e filtro aplicado.
4. No Teams, adicione o relatório como aba (veja `../teams/montagem-teams.md`).
