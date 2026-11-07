# Fluxo 3 · Aviso no Teams quando um processo muda de situação

Quando alguém altera a **Situação** de um processo (por exemplo, de "Em análise" para "Aprovado"), o fluxo publica uma mensagem no canal da SPE do terreno.

**Pré-requisito:** o **controle de versão** precisa estar ligado na lista. Ele já vem ligado por padrão nas listas do SharePoint (Configurações da lista › Configurações de controle de versão).

> **Como criar:** **+ Criar › Fluxo da nuvem automatizado**. Gatilho **SharePoint › Quando um item é criado ou modificado**, lista **Alvarás**.
> Crie o primeiro fluxo, teste, e depois use **Salvar como** para cada lista importante (GELIN, GEAVA, CINDACTA, Patrimônios Culturais, GELIOC, Parcelamento do Solo), trocando a lista e a sigla.

| # | Ação | Configuração |
|---|---|---|
| 1 | SharePoint › Obter alterações de um item ou arquivo (somente propriedades) | Lista igual à do gatilho · Id `triggerOutputs()?['body/ID']` · **Desde:** `triggerOutputs()?['body/{TriggerWindowStartToken}']` (o "Token de Início da Janela de Acionamento" que o gatilho fornece) |
| 2 | Condição | `body('Obter_alterações')?['ColumnHasChanged']?['cd_situacao']` **é igual a** `true` |
| 3 | (Sim) SharePoint › Obter item | Lista **Terrenos** · Id `triggerOutputs()?['body/cd_terreno/Id']` |
| 4 | (Sim) Compor `Canal` | `if(contains(toUpper(coalesce(body('Obter_item')?['cd_concessionaria_r01']?['Value'], '')), 'INOVA'), 'INOVA BH', 'SAÚDE BH')` |
| 5 | (Sim) Microsoft Teams › Postar mensagem em um chat ou canal | Postar como **Bot de fluxo** · Canal: use uma condição sobre `outputs('Canal')` para escolher o canal *INOVA BH* ou *SAÚDE BH* · Mensagem abaixo |

Mensagem (no editor, clique em `</>` para colar HTML):

```html
<p><b>Alvará</b> · <b>@{triggerOutputs()?['body/cd_terreno/Value']}</b></p>
<p>Situação agora: <b>@{triggerOutputs()?['body/cd_situacao/Value']}</b><br>
Protocolo: @{triggerOutputs()?['body/Title']}<br>
Alterado por: @{triggerOutputs()?['body/Editor/DisplayName']}</p>
```

> Quer saber também quem precisa agir? Acrescente, no ramo Sim, **Planner › Criar uma tarefa** quando a nova situação for "Aguardando documentação" ou "Pendente".
