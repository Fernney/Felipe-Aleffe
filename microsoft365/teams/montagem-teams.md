# Teams · a Central de Diligenciamento num só lugar

O Teams vira a "casa" do sistema: o app, os relatórios, as tarefas, o calendário de prazos e o assistente ficam juntos, e cada SPE tem o seu canal.

## 1 · Equipe e canais

1. Teams › **Equipes › + › Criar equipe › Do zero › Privada**. Nome: **Central de Diligenciamento**.
2. Crie os canais:
   - **Geral:** resumo diário de alertas (Fluxo 1)
   - **INOVA BH:** mudanças de situação dos terrenos INOVA (Fluxo 3)
   - **SAÚDE BH:** mudanças de situação dos terrenos SAÚDE (Fluxo 3)

## 2 · Abas do canal Geral

| Aba | Como adicionar | Observação |
|---|---|---|
| **Central de Diligenciamento** (o app) | **+ › Power Apps** › escolha o app | É o app canvas melhorado, rodando dentro do Teams |
| **Painel (Power BI)** | **+ › Power BI** › relatório consolidado (tema JOPE) | |
| **Tarefas** | **+ › Planner** › *Criar um novo plano* chamado **Diligenciamento**, com os buckets **INOVA BH** e **SAÚDE BH** | O Fluxo 1 cria as tarefas aqui |
| **Listas** | **+ › Lists** › Terrenos | Acesso rápido para consulta |

Nos canais **INOVA BH** e **SAÚDE BH**, adicione a aba **Power BI** com a cópia do relatório no tema da unidade.

## 3 · Calendário de prazos

O Fluxo 2 grava no calendário **Prazos Diligenciamento**. Compartilhe-o com os membros da equipe. Cada pessoa pode exibi-lo no Outlook e no calendário do Teams.

## 4 · Assistente

Publique o agente do Copilot Studio (`../copilot-studio/agente-diligenciamento.md`) e adicione-o à equipe. Quem estiver no canal pode mencioná-lo ou abrir um chat com ele.

## 5 · Permissões

O SharePoint continua sendo a fonte única. Quem não tiver acesso ao site não vê os dados no app, no Power BI nem no assistente. Para incluir alguém, siga estes passos:
1. Dê acesso ao site do SharePoint.
2. Cadastre a pessoa na lista **Usuário do Sistema**, com o perfil certo.
3. Adicione-a na equipe do Teams.
