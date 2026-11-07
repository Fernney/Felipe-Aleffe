# Fluxo 1 · Resumo diário de alertas (e-mail por SPE + Teams + Planner)

Este fluxo substitui o envio que hoje o app faz quando alguém o abre. Ele roda sozinho em todo dia útil, às 7h.

1. Lê as listas do SharePoint.
2. Monta os alertas.
3. Envia um e-mail para **projetos@speinova.com.br** (paleta INOVA) e outro para **projetos@spesaude.com.br** (paleta SAÚDE).
4. Publica um resumo no canal do Teams.
5. Cria uma tarefa no Planner para cada alerta de prioridade alta.
6. Registra o envio na lista **Envio de Alertas**.

**Conectores usados** (todos padrão, incluídos no Microsoft 365): SharePoint, Office 365 Outlook, Microsoft Teams e Planner.

> **Como criar:** Power Automate › **+ Criar › Fluxo da nuvem agendado**. Nome: *Diligenciamento · Resumo diário*. Comece em amanhã, 07:00, **repetir a cada 1 dia**.
> Os nomes das ações abaixo (`Hoje`, `Sel_Parc`…) são os que você deve dar a cada ação (clique em "…" › **Renomear**). As expressões dependem desses nomes.
>
> Em todas as ações **Obter itens** do SharePoint:
> - **Endereço do site:** `https://transpes.sharepoint.com/sites/CentraldeDiligenciamento_R00`
> - **Contagem superior:** `5000`
> - **Configurações › Paginação:** ligada, com limite `5000`

---

## Parte A · Preparação

| # | Ação | Nome | Configuração |
|---|---|---|---|
| 1 | Recorrência | — | Frequência **Dia**, intervalo 1, fuso **(UTC-03:00) Brasília**, às 7h. Em "Nestes dias", marque de segunda a sexta (para isso, troque a frequência para **Semana**). |
| 2 | Compor | `Hoje` | `formatDateTime(convertFromUtc(utcNow(), 'E. South America Standard Time'), 'yyyy-MM-dd')` |
| 3 | Compor | `D7` | `formatDateTime(addDays(outputs('Hoje'), 7), 'yyyy-MM-dd')` |
| 4 | Compor | `D30` | `formatDateTime(addDays(outputs('Hoje'), 30), 'yyyy-MM-dd')` |
| 5 | Compor | `D60` | `formatDateTime(addDays(outputs('Hoje'), 60), 'yyyy-MM-dd')` |
| 6 | Compor | `D90` | `formatDateTime(addDays(outputs('Hoje'), 90), 'yyyy-MM-dd')` |
| 7 | SharePoint › Obter itens | `Terrenos` | Lista **Terrenos** |
| 8 | Filtrar matriz | `Terrenos_INOVA` | De: `body('Terrenos')?['value']` · condição (modo avançado): `@contains(toUpper(coalesce(item()?['cd_concessionaria_r01']?['Value'], '')), 'INOVA')` |
| 9 | Selecionar | `IDs_INOVA` | De: `body('Terrenos_INOVA')` · Mapear (modo texto): `item()?['ID']` |

## Parte B · Uma regra de alerta por bloco

Cada regra tem duas ações: **Obter itens** (com filtro) e **Selecionar** (no formato padrão do alerta). Em todo **Selecionar**, use o modo **chave/valor** com estas 7 chaves:

| Chave | Significado |
|---|---|
| `Tipo` | texto do tipo de alerta |
| `TerrenoId` | ID do terreno (ou `null`) |
| `Terreno` | nome do terreno |
| `Modulo` | sigla do módulo |
| `Data` | data do prazo (`yyyy-MM-dd`) |
| `Alta` | `true` / `false` |
| `Detalhe` | texto explicativo |

### B1 · Diretrizes de parcelamento vencendo (90 dias)

- **Obter itens** `Get_Parc`, lista *Parcelamento do Solo*, Consulta de Filtro:
  `cd_datadevencimentodasdiretrizes le '@{outputs('D90')}' and cd_situacao ne 'Aprovado'`
- **Selecionar** `Sel_Parc`, De `body('Get_Parc')?['value']`:

| Chave | Valor (expressão) |
|---|---|
| Tipo | `Diretrizes de parcelamento` (texto) |
| TerrenoId | `item()?['cd_terreno']?['Id']` |
| Terreno | `item()?['cd_terreno']?['Value']` |
| Modulo | `Parcelamento` (texto) |
| Data | `formatDateTime(item()?['cd_datadevencimentodasdiretrizes'], 'yyyy-MM-dd')` |
| Alta | `less(formatDateTime(item()?['cd_datadevencimentodasdiretrizes'], 'yyyy-MM-dd'), outputs('Hoje'))` |
| Detalhe | `concat(if(less(formatDateTime(item()?['cd_datadevencimentodasdiretrizes'],'yyyy-MM-dd'), outputs('Hoje')), 'Vencidas em ', 'Vencem em '), formatDateTime(item()?['cd_datadevencimentodasdiretrizes'], 'dd/MM/yyyy'), ' · ', item()?['Title'])` |

### B2 · Data limite de protocolo (30 dias), uma vez para cada lista

Faça um par **Obter itens + Selecionar** para cada linha da tabela abaixo:

| Lista | Nomes das ações | Sigla (Modulo) |
|---|---|---|
| Patrimônios Culturais | `Get_DIPC` / `Sel_DIPC` | DIPC |
| Processos CINDACTA | `Get_CIND` / `Sel_CIND` | CINDACTA |
| Processos GELIN | `Get_GELIN` / `Sel_GELIN` | GELIN |
| Processos GEAVA | `Get_GEAVA` / `Sel_GEAVA` | GEAVA |
| GELIOC | `Get_AMTT` / `Sel_AMTT` | AMTT |
| Alvarás | `Get_ALV` / `Sel_ALV` | Alvará |
| Outros Processos | `Get_OUT` / `Sel_OUT` | Outros |

- **Consulta de Filtro** (igual em todas):
  `cd_datalimitedeprotocolo le '@{outputs('D30')}' and cd_situacao ne 'Aprovado' and cd_situacao ne 'Dispensado' and cd_situacao ne 'Em análise'`
- **Selecionar:** troque `Get_DIPC` pelo nome da ação de cada lista.

| Chave | Valor (expressão) |
|---|---|
| Tipo | `Data limite de protocolo` |
| TerrenoId | `item()?['cd_terreno']?['Id']` |
| Terreno | `item()?['cd_terreno']?['Value']` |
| Modulo | sigla da tabela acima (texto) |
| Data | `formatDateTime(item()?['cd_datalimitedeprotocolo'], 'yyyy-MM-dd')` |
| Alta | `less(formatDateTime(item()?['cd_datalimitedeprotocolo'], 'yyyy-MM-dd'), outputs('Hoje'))` |
| Detalhe | `concat('Limite ', formatDateTime(item()?['cd_datalimitedeprotocolo'], 'dd/MM/yyyy'), ' · ', item()?['Title'])` |

### B3 · Termo de compromisso ambiental (60 dias, sem recibo definitivo)

- **Obter itens** `Get_AMB`, lista *Ambientais*, filtro:
  `cd_prazolimitepcumprimentodoterm le '@{outputs('D60')}' and cd_recibodefinitivorealizado eq null`
- **Selecionar** `Sel_AMB`:
  - Tipo: `Termo de compromisso`
  - TerrenoId: `null`
  - Terreno: `item()?['Title']`
  - Modulo: `Ambiental`
  - Data: `formatDateTime(item()?['cd_prazolimitepcumprimentodoterm'], 'yyyy-MM-dd')`
  - Alta: `less(formatDateTime(item()?['cd_prazolimitepcumprimentodoterm'], 'yyyy-MM-dd'), outputs('Hoje'))`
  - Detalhe: `concat('Prazo ', formatDateTime(item()?['cd_prazolimitepcumprimentodoterm'], 'dd/MM/yyyy'), ' · parecer ', coalesce(item()?['cd_parecertecnico'], '—'))`

### B4 · Condicionantes vencidas ou vencendo em 7 dias

- **Obter itens** `Get_COND`, lista *Ambiental-Condicionantes*, filtro:
  `cd_prazo le '@{outputs('D7')}' and cd_status ne 'Cumprida'`
- **Selecionar** `Sel_COND`:
  - Tipo: `if(less(formatDateTime(item()?['cd_prazo'],'yyyy-MM-dd'), outputs('Hoje')), 'Condicionante vencida', 'Condicionante a vencer')`
  - TerrenoId: `null`
  - Terreno: `coalesce(item()?['cd_ambiental']?['Value'], 'Processo ambiental')`
  - Modulo: `Ambiental`
  - Data: `formatDateTime(item()?['cd_prazo'], 'yyyy-MM-dd')`
  - Alta: `less(formatDateTime(item()?['cd_prazo'], 'yyyy-MM-dd'), outputs('Hoje'))`
  - Detalhe: `concat('Item ', coalesce(item()?['cd_item'], '?'), ' · ', item()?['Title'])`

### B5 · Relatórios de monitoramento atrasados ou vencendo em 7 dias

- **Obter itens** `Get_REL`, lista *Acompanhamentos de Relatórios*, filtro:
  `cd_datarealdorelatoriodemon eq null and cd_dataprevistadorelatoriodemon le '@{outputs('D7')}'`
- **Selecionar** `Sel_REL`:
  - Tipo: `if(less(formatDateTime(item()?['cd_dataprevistadorelatoriodemon'],'yyyy-MM-dd'), outputs('Hoje')), 'Relatório atrasado', 'Relatório a vencer')`
  - TerrenoId: `null`
  - Terreno: `coalesce(item()?['cd_ambiental']?['Value'], 'Processo ambiental')`
  - Modulo: `Ambiental`
  - Data: `formatDateTime(item()?['cd_dataprevistadorelatoriodemon'], 'yyyy-MM-dd')`
  - Alta: `less(formatDateTime(item()?['cd_dataprevistadorelatoriodemon'], 'yyyy-MM-dd'), outputs('Hoje'))`
  - Detalhe: `item()?['Title']`

### B6 · Obra concluída sem comunicado de término

- **Obter itens** `Get_BAIXA`, lista *Baixas de Construção*, filtro:
  `cd_datadetermino le '@{outputs('Hoje')}' and cd_datadecomunicadodeterminodeob eq null`
- **Selecionar** `Sel_BAIXA`:
  - Tipo: `Comunicado de término pendente`
  - TerrenoId: `null`
  - Terreno: `item()?['Title']`
  - Modulo: `Baixa`
  - Data: `formatDateTime(item()?['cd_datadetermino'], 'yyyy-MM-dd')`
  - Alta: `greater(div(sub(ticks(outputs('Hoje')), ticks(item()?['cd_datadetermino'])), 864000000000), 30)`
  - Detalhe: `concat('Obra concluída em ', formatDateTime(item()?['cd_datadetermino'], 'dd/MM/yyyy'), ' · sem comunicado')`

> Alertas de Ambiental e Baixa não têm a coluna de terreno direto na lista. Por isso vão para **as duas SPEs**, como o app original já fazia com o que ficava "INDEFINIDO".

## Parte C · Juntar, separar por SPE e enviar

| # | Ação | Nome | Configuração |
|---|---|---|---|
| C1 | Compor | `Todos` | `sort(union(body('Sel_Parc'), body('Sel_DIPC'), body('Sel_CIND'), body('Sel_GELIN'), body('Sel_GEAVA'), body('Sel_AMTT'), body('Sel_ALV'), body('Sel_OUT'), body('Sel_AMB'), body('Sel_COND'), body('Sel_REL'), body('Sel_BAIXA')), 'Data')` |
| C2 | Filtrar matriz | `Alertas_INOVA` | De `outputs('Todos')` · avançado: `@or(equals(item()?['TerrenoId'], null), contains(body('IDs_INOVA'), item()?['TerrenoId']))` |
| C3 | Filtrar matriz | `Alertas_SAUDE` | De `outputs('Todos')` · avançado: `@or(equals(item()?['TerrenoId'], null), not(contains(body('IDs_INOVA'), item()?['TerrenoId'])))` |

Para **cada SPE**, crie um **Escopo** (`Envio_INOVA` e `Envio_SAUDE`) com as ações abaixo. No escopo da Saúde, troque `INOVA` por `SAUDE` nos nomes e use as cores da Saúde.

| # | Ação | Nome | Configuração |
|---|---|---|---|
| 1 | Condição | — | `length(body('Alertas_INOVA'))` **é maior que** `0`. As ações seguintes ficam no ramo **Sim**. |
| 2 | Criar tabela HTML | `Tabela_INOVA` | De `body('Alertas_INOVA')`, colunas **Personalizadas**: **Prioridade** = `if(item()?['Alta'], 'ALTA', 'Atenção')` · **Terreno** = `item()?['Terreno']` · **Módulo** = `item()?['Modulo']` · **Pendência** = `concat(item()?['Tipo'], ' — ', item()?['Detalhe'])` · **Data** = `formatDateTime(item()?['Data'], 'dd/MM/yyyy')` |
| 3 | Compor | `Html_INOVA` | Conteúdo do arquivo [`email-alertas.html`](email-alertas.html), com `{{COR}}`, `{{COR2}}`, `{{SPE}}`, `{{TOTAL}}`, `{{ALTAS}}` e `{{TABELA}}` trocados pelas expressões da tabela abaixo |
| 4 | Office 365 Outlook › Enviar um email (V2) | — | Para `projetos@speinova.com.br` · Assunto `[Diligenciamento] @{length(body('Alertas_INOVA'))} alerta(s) · SPE INOVA BH` · Corpo: `outputs('Html_INOVA')`. Clique em `</>` para colar como HTML. |

Valores para trocar no modelo de e-mail:

| Marcador | INOVA | SAÚDE |
|---|---|---|
| `{{COR}}` | `#0D5A55` | `#6E368C` |
| `{{COR2}}` | `#95C11F` | `#4C2C84` |
| `{{SPE}}` | `SPE INOVA BH` | `SPE Saúde Primária BH` |
| `{{TOTAL}}` | `@{length(body('Alertas_INOVA'))}` | `@{length(body('Alertas_SAUDE'))}` |
| `{{ALTAS}}` | `@{length(filter… )}` (veja abaixo) | idem com `Alertas_SAUDE` |
| `{{TABELA}}` | `@{body('Tabela_INOVA')}` | `@{body('Tabela_SAUDE')}` |

Para `{{ALTAS}}`, crie antes um **Filtrar matriz** `Altas_INOVA` (De `body('Alertas_INOVA')`, condição `@equals(item()?['Alta'], true)`) e use `@{length(body('Altas_INOVA'))}`.

## Parte D · Aviso no Teams

Depois dos dois escopos, adicione **Microsoft Teams › Postar cartão em um chat ou canal**:
- **Postar como:** Bot de fluxo
- **Postar em:** Canal
- **Equipe / Canal:** *Central de Diligenciamento › Geral* (veja `../teams/montagem-teams.md`)
- **Cartão adaptável:** conteúdo de [`cartao-teams.json`](cartao-teams.json). Troque as expressões `@{...}` se você tiver usado outros nomes nas ações.

## Parte E · Tarefas no Planner para alertas de prioridade alta

1. **Planner › Listar tarefas**, nome `Tarefas`. Grupo: *Central de Diligenciamento*. Plano: *Diligenciamento*.
2. **Selecionar** `Titulos`. De `body('Tarefas')?['value']`, Mapear (modo texto): `item()?['title']`.
3. **Filtrar matriz** `Altas`. De `outputs('Todos')`, condição `@equals(item()?['Alta'], true)`.
4. **Aplicar a cada** um sobre `body('Altas')`:
   1. **Compor** `TituloTarefa`: `concat('[', items('Aplicar_a_cada')?['Modulo'], '] ', items('Aplicar_a_cada')?['Tipo'], ' · ', items('Aplicar_a_cada')?['Terreno'])`
   2. **Condição:** `contains(body('Titulos'), outputs('TituloTarefa'))` **é igual a** `false`
   3. No ramo **Sim**, use **Planner › Criar uma tarefa**:
      - Título: `outputs('TituloTarefa')`
      - Data de conclusão: `items('Aplicar_a_cada')?['Data']`
      - Bucket: `if(contains(body('IDs_INOVA'), items('Aplicar_a_cada')?['TerrenoId']), '<ID do bucket INOVA BH>', '<ID do bucket SAÚDE BH>')`

      Para descobrir os IDs dos buckets, rode o fluxo uma vez com **Listar buckets** e copie do histórico de execução.

O título serve de chave: uma tarefa já criada, aberta ou concluída, não é criada de novo.

## Parte F · Registrar o envio

Por último, **SharePoint › Criar item** na lista **Envio de Alertas**:
- **Nome:** `concat('Envio automático ', formatDateTime(convertFromUtc(utcNow(),'E. South America Standard Time'),'dd/MM/yyyy HH:mm'))`
- **Data do Envio:** `outputs('Hoje')`
- **Enviado por:** `Power Automate`
- **Origem:** `Automático`
- **Quantidade:** `length(outputs('Todos'))`

---

### Depois de ligar o fluxo

1. **Teste:** use **Testar › Manualmente** e confira os dois e-mails, o cartão no Teams e as tarefas no Planner.
2. **Desligue o envio do app:** veja `../canvas-app/02-filtro-menu-e-telas.md`, seção 2.6. Sem isso, os e-mails chegam em dobro.
3. **Proprietário:** em **Detalhes › Proprietários**, adicione mais uma pessoa da equipe. Assim o fluxo não para se você estiver de férias ou sair da empresa.

### Regras que ficam só no app

"Processo parado", "Fluxograma não respondido", "Processo a abrir" e "Conflito com o fluxograma" dependem de cruzar várias listas. Elas continuam sendo calculadas no app e aparecem no sino de notificações, mas não entram no e-mail automático.
