# Central de Diligenciamento no Microsoft 365

Versão do sistema montada **só com as ferramentas que a sua conta corporativa já tem**: Power Apps, SharePoint/Lists, Power Automate, Teams, Outlook, Planner, Power BI e Copilot Studio. Não é preciso servidor, registro de aplicativo nem administrador para a maior parte.

Ela segue o mesmo padrão do sistema em código (pasta `src/`):
- **Paleta JOPE** no geral e no menu; **INOVA** e **SAÚDE** quando o filtro da unidade estiver ativo.
- **Índice de risco** e **previsão de liberação** por terreno.
- **Novos alertas:** limite de protocolo em todos os módulos, processo parado, validade ARMBH e fluxograma não respondido.
- **Agenda de prazos.**
- **Resumo diário automático** por SPE.
- **Assistente.**

```
                ┌──────────────── Teams (equipe "Central de Diligenciamento") ───────────────┐
                │  aba App · aba Power BI · aba Planner · Assistente (Copilot Studio)        │
                └───────────────▲───────────────▲───────────────▲───────────────▲─────────────┘
                                │               │               │               │
 Power Apps (canvas melhorado) ─┤   Power BI ───┤   Power Automate (diário 7h) ─┤
   lê e grava                   │   lê          │   lê → e-mail SPE, Teams,     │  Copilot Studio
                                │               │        Planner, Outlook       │   lê
                ┌───────────────┴───────────────┴───────────────────────────────┴─────────────┐
                │        SharePoint · site CentraldeDiligenciamento_R00 (listas atuais)       │
                └─────────────────────────────────────────────────────────────────────────────┘
```

## Ordem de implantação

| # | O quê | Onde | Tempo aprox. | Precisa de TI? |
|---|---|---|---|---|
| 1 | Paleta por unidade, risco, alertas novos, telas Agenda e Risco | `canvas-app/` | 1–2 h | Não |
| 2 | Resumo diário por e-mail + Teams + Planner | `power-automate/01-…` | 1–2 h | Não |
| 3 | Equipe no Teams com as abas | `teams/` | 30 min | Não |
| 4 | Prazos no calendário do Outlook | `power-automate/02-…` | 45 min | Não |
| 5 | Aviso de mudança de situação no Teams | `power-automate/03-…` | 30 min por lista | Não |
| 6 | Temas e medidas no Power BI | `power-bi/` | 1–2 h | Não |
| 7 | Assistente no Teams | `copilot-studio/` | 1 h | Talvez, se a organização exigir capacidade do Copilot Studio |

## Passo 1 em detalhe · o app canvas

Trabalhe numa **cópia** do app: Power Apps › seu app › **…› Salvar como**, com o nome "Central de Diligenciamento v2".

1. **Cores:** selecione **App** na Árvore, escolha a propriedade **Formulas**, apague tudo e cole o conteúdo de `canvas-app/01-App.Formulas.pfx`.
2. **Filtro, menu e entrada das telas:** siga `canvas-app/02-filtro-menu-e-telas.md`.
3. **Cálculos:** em **scrHome › btnDashCarregar › OnSelect**, encontre a linha `// 4) Últimas movimentações` e cole, **antes dela**, todo o conteúdo de `canvas-app/03-btnDashCarregar-risco-alertas-agenda.pfx`.
4. **Telas novas:** cole `04-Tela_Agenda.yaml` e `05-Tela_Risco.yaml` sobre **scrHome** (instruções na seção 2.4 do guia).
5. **Teste:** pressione **F5**.
   - Troque a concessionária: o conteúdo deve ficar verde (INOVA) ou roxo-escuro (SAÚDE), e o menu continua no roxo JOPE.
   - Abra **Agenda** e **Risco** no menu.
   - Abra um terreno: a tela usa a cor da unidade dele.
6. **Publique:** **Arquivo › Salvar › Publicar**. Compartilhe com a equipe ou adicione como aba no Teams.

> **Se aparecer erro de fórmula depois de colar:** o painel de erros do Studio mostra o controle e a propriedade. A causa mais comum é uma coluna com nome diferente na sua lista. Me mande a mensagem que eu ajusto.

> **Limite de 2.000 itens:** como o app original, os cálculos usam `ClearCollect` de listas inteiras. Confira em **Configurações › Geral › Limite de linhas de dados** que o valor está em **2000**. Se alguma lista passar disso, avise que eu mudo a leitura para páginas.

## O que ficou de fora nesta versão, e por quê

| Recurso do sistema em código | No Microsoft 365 |
|---|---|
| Arrastar e soltar no quadro Kanban | O canvas não tem arrastar e soltar nativo. A tela **Risco** e os filtros cobrem o acompanhamento. |
| Previsão pela **mediana** | No canvas e no Power BI é pela **média**, que é o que as fórmulas oferecem de forma simples. |
| API de dados para o Power BI | Não é necessária: o Power BI lê as listas e o arquivo `.pq` aplica as mesmas regras. |
| Assistente com Claude | Substituído pelo **Copilot Studio**, que já está no seu painel de apps e no Teams. |
