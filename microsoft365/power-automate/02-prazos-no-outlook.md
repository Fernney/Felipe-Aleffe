# Fluxo 2 · Prazos no calendário do Outlook

Coloca no calendário os prazos dos próximos 60 dias, com lembrete 2 dias antes: limite de protocolo, previsão de retorno, vencimento das diretrizes e termo ambiental. Assim eles aparecem no Outlook, no celular e no Teams.

**Antes de criar o fluxo:** no Outlook, crie um calendário chamado **Prazos Diligenciamento** (Calendário › Adicionar calendário › Criar calendário em branco). Depois, compartilhe-o com a equipe (botão direito › Compartilhamento e permissões).

> **Como criar:** Power Automate › **+ Criar › Fluxo da nuvem agendado**. Nome: *Diligenciamento · Prazos no Outlook*. Todo dia às 6h30, fuso Brasília.

## Passos

| # | Ação | Nome | Configuração |
|---|---|---|---|
| 1 | Compor | `Hoje` | `formatDateTime(convertFromUtc(utcNow(), 'E. South America Standard Time'), 'yyyy-MM-dd')` |
| 2 | Compor | `D60` | `formatDateTime(addDays(outputs('Hoje'), 60), 'yyyy-MM-dd')` |
| 3 | Office 365 Outlook › Obter eventos do calendário (V4) | `Eventos` | Calendário: **Prazos Diligenciamento** · Consulta de filtro: `start/dateTime ge '@{outputs('Hoje')}T00:00:00'` · Contagem superior: 999 |
| 4 | Selecionar | `Assuntos` | De `body('Eventos')?['value']` · Mapear (texto): `item()?['subject']` |

Depois, faça um par **Obter itens + Selecionar** para cada lista da tabela. Todos os **Selecionar** geram as chaves `Titulo` e `Data`.

| Lista | Filtro (Obter itens) | Titulo | Data |
|---|---|---|---|
| Parcelamento do Solo | `cd_datadevencimentodasdiretrizes ge '@{outputs('Hoje')}' and cd_datadevencimentodasdiretrizes le '@{outputs('D60')}'` | `concat('Diretrizes vencem · ', item()?['cd_terreno']?['Value'])` | `formatDateTime(item()?['cd_datadevencimentodasdiretrizes'],'yyyy-MM-dd')` |
| Alvarás (repita para GELIN, GEAVA, CINDACTA, Patrimônios Culturais, GELIOC e Outros Processos) | `cd_datalimitedeprotocolo ge '@{outputs('Hoje')}' and cd_datalimitedeprotocolo le '@{outputs('D60')}' and cd_situacao ne 'Aprovado'` | `concat('Limite de protocolo · ', <SIGLA>, ' · ', item()?['cd_terreno']?['Value'])` | `formatDateTime(item()?['cd_datalimitedeprotocolo'],'yyyy-MM-dd')` |
| Mesmas listas de licenciamento | `cd_previsaoderetorno ge '@{outputs('Hoje')}' and cd_previsaoderetorno le '@{outputs('D60')}' and cd_situacao ne 'Aprovado'` | `concat('Previsão de retorno · ', <SIGLA>, ' · ', item()?['cd_terreno']?['Value'])` | `formatDateTime(item()?['cd_previsaoderetorno'],'yyyy-MM-dd')` |
| Ambientais | `cd_prazolimitepcumprimentodoterm ge '@{outputs('Hoje')}' and cd_prazolimitepcumprimentodoterm le '@{outputs('D60')}' and cd_recibodefinitivorealizado eq null` | `concat('Termo de compromisso · ', item()?['Title'])` | `formatDateTime(item()?['cd_prazolimitepcumprimentodoterm'],'yyyy-MM-dd')` |

> Para não criar dezenas de ações, comece só pelas listas mais usadas (Parcelamento, Alvarás, GELIN e Ambientais) e acrescente as outras depois.

Por fim:

| # | Ação | Configuração |
|---|---|---|
| 5 | Compor `Prazos` | `union(body('Sel_1'), body('Sel_2'), …)`, com todos os Selecionar |
| 6 | Aplicar a cada um sobre `outputs('Prazos')` | — |
| 6.1 | Condição | `contains(body('Assuntos'), items('Aplicar_a_cada')?['Titulo'])` **é igual a** `false` |
| 6.2 | (Sim) Office 365 Outlook › Criar evento (V4) | Calendário **Prazos Diligenciamento** · Assunto `items('Aplicar_a_cada')?['Titulo']` · Início `concat(items('Aplicar_a_cada')?['Data'], 'T09:00:00')` · Término `concat(items('Aplicar_a_cada')?['Data'], 'T09:30:00')` · Fuso **(UTC-03:00) Brasília** · Lembrete `2880` (minutos = 2 dias) · Mostrar como `Livre` · Corpo: `Gerado pela Central de Diligenciamento. Atualize o processo no app.` |

O **assunto** serve de chave: um prazo que já está no calendário não é duplicado. Se a data de um prazo mudar no SharePoint, um evento novo é criado na data nova, e o antigo continua no calendário até você apagá-lo.
