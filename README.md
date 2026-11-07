# Central de Diligenciamento · JOPE

Sistema web que substitui o app **Power Apps "Central de Diligenciamento"**: acompanha licenciamento urbano e ambiental, parcelamento do solo e baixa de construção dos terrenos das SPEs **INOVA BH** e **SAÚDE BH**.

Os dados **continuam no SharePoint**, nas mesmas listas do site `CentraldeDiligenciamento_R00`. O Power BI segue funcionando como hoje e ganha, como opção, uma API com os dados já tratados.

---

## O que mudou em relação ao Power Apps

| Antes (Power Apps) | Agora |
|---|---|
| Regras espalhadas em fórmulas de tela (`colDashTerrenos`, `colAlertas`…) | **Motor de regras** único, testado (`src/lib/domain/regras.ts`) |
| Alertas só para DIPC, parcelamento, ambiental e baixa | Os mesmos alertas, mais: **data limite de protocolo em todos os módulos**, validade das diretrizes ARMBH, **processo parado há 60 dias** e fluxograma não respondido |
| Painel com contagens | **Índice de risco (0–100)** por terreno, com o motivo de cada ponto |
| — | **Previsão de conclusão** de cada processo, pela mediana histórica do módulo, e **liberação prevista** do terreno comparada ao prazo |
| Fluxograma só informativo | Fluxograma que **abre automaticamente** os processos exigidos e aponta conflitos |
| Galerias | **Matriz terreno × módulo**, **quadro Kanban com arrastar e soltar** e **linha do tempo unificada** |
| — | **Agenda de prazos** (calendário) com exportação **.ics** para Outlook e Google Agenda |
| — | **Busca global** (Ctrl+K) por terreno, protocolo e módulo |
| Exportação CSV por fluxo do Power Automate | Excel (.xlsx) formatado e CSV gerados direto no sistema |
| Fluxo para enviar alertas | Envio manual + **resumo diário automático** (`/api/cron/alertas`), separado por SPE |
| Chat limitado a atalhos | **Assistente IA** (Claude) que responde perguntas livres sobre os dados |
| — | **Auditoria**: toda mudança de situação vira um andamento na linha do tempo |
| — | Ficha do terreno em PDF, modo escuro, layout para celular, instalável (PWA) |

## Paletas de cores

| Uso | Cores |
|---|---|
| **JOPE** — geral, menu, telas sem filtro | `#6F3B8C` roxo · `#3266AF` azul · `#12A9A2` verde-água · `#737373` cinza |
| **INOVA** — somente com o filtro INOVA BH | `#0D5A55` verde-escuro · `#95C11F` verde-claro · `#706F6F` cinza |
| **SAÚDE** — somente com o filtro SAÚDE BH | `#6E368C` roxo · `#4C2C84` lilás · `#4D4D4D` cinza |

O menu lateral fica sempre na paleta JOPE. Quando você escolhe **INOVA BH** ou **SAÚDE BH** no seletor do topo, a área de conteúdo (gráficos, botões, destaques e planilhas exportadas) passa a usar a paleta da unidade. A página de cada terreno e de cada processo usa a paleta da unidade a que pertence. A paleta fica definida em `src/app/globals.css` e `src/lib/tema.ts`.

## Telas

- **Início**: indicadores, situação por módulo, terrenos por etapa, prioridades do dia, ranking de risco e comparação INOVA × SAÚDE.
- **Terrenos**: matriz de status por módulo, filtros e ordenação por risco ou progresso.
- **Terreno**: jornada (Parcelamento → Licenciamento → Obra → Operação), risco explicado, previsão de liberação, processos, editor do fluxograma, alertas e linha do tempo unificada.
- **Processos**: os 11 módulos (Parcelamento, ARMBH, DIPC, CINDACTA, GELIN, GEAVA, AMTT/GELIOC, Alvará, Outros, Ambiental e Baixa), em tabela ou quadro Kanban, com cadastro, edição e linha do tempo.
- **Fluxograma**: regras, respostas por pergunta e pendências.
- **Alertas**: agrupados por tipo, com prévia e envio de e-mail por SPE.
- **Agenda de prazos**: calendário mensal e janela de 30 dias.
- **Relatórios & Power BI**: exportações e instruções de conexão.
- **Assistente IA**: perguntas em linguagem natural.

Perfis (lidos da lista **Usuário do Sistema**): **Administrador** e **Editor** podem alterar dados. **Consulta** só visualiza. Quem não está na lista entra como Consulta, como no app original.

---

## Como rodar

Requer **Node.js 20+**.

```bash
npm install
```

```bash
cp .env.example .env.local
```

Gere o segredo de sessão e cole o valor em `NEXTAUTH_SECRET` no `.env.local`:

```bash
openssl rand -base64 32
```

```bash
npm run dev
```

Abra http://localhost:3000. Com `DATA_PROVIDER=demo`, o sistema usa uma **base fictícia** (22 terrenos) e o login de demonstração permite escolher o perfil.

Outros comandos:

```bash
npm test
```

```bash
npm run build
```

```bash
npm start
```

## Ligar no SharePoint

1. No **Microsoft Entra ID**, crie um *App registration*.
   - **Permissões de aplicativo do Microsoft Graph:** `Sites.Selected` (recomendado; depois conceda escrita só no site `CentraldeDiligenciamento_R00`) ou `Sites.ReadWrite.All`. Acrescente `Mail.Send` se o sistema for enviar os e-mails.
   - **Login dos usuários:** adicione a URL de redirecionamento `https://SEU-ENDERECO/api/auth/callback/azure-ad`.
2. Preencha o `.env.local`, ou as variáveis do servidor:

   ```env
   DATA_PROVIDER=sharepoint
   SP_TENANT_ID=...
   SP_CLIENT_ID=...
   SP_CLIENT_SECRET=...
   SP_SITE=transpes.sharepoint.com:/sites/CentraldeDiligenciamento_R00
   AZURE_AD_CLIENT_ID=...
   AZURE_AD_CLIENT_SECRET=...
   AZURE_AD_TENANT_ID=...
   MAIL_SENDER=caixa-que-envia@empresa.com.br
   ```

Os IDs das listas e os nomes internos das colunas foram extraídos do próprio app e estão em `src/lib/domain/modulos.ts`, `src/lib/data/sharepoint.ts` e `docs/sharepoint-schema.json`. **Não é preciso criar nem alterar nenhuma lista.**

A leitura fica em cache por `SP_CACHE_SECONDS` (60 s por padrão) e é renovada a cada gravação. As requisições respeitam o limite do SharePoint, com nova tentativa em caso de 429 ou 503.

## Power BI

- **Opção 1 (nada muda):** continue lendo as listas do SharePoint. O sistema grava nas mesmas listas.
- **Opção 2 (recomendada):** use a API `GET /api/bi/<dataset>` com o cabeçalho `Authorization: Bearer <BI_API_TOKEN>`.
  - Datasets: `consolidado`, `alertas`, `processos`, `andamentos`, `terrenos`, `condicionantes` e `modulo?modulo=<id>`.
  - Parâmetros: `unidade=todas|inova|saude` e `formato=json|csv`.
  - O código Power Query (M) pronto está na tela **Relatórios & Power BI**.

## Alertas automáticos

Agende uma chamada diária (Azure Logic Apps, cron do servidor, GitHub Actions etc.), trocando `$CRON_SECRET` e o endereço pelos seus:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU-ENDERECO/api/cron/alertas
```

Os alertas da INOVA vão para `ALERT_EMAIL_INOVA` e os da Saúde para `ALERT_EMAIL_SAUDE`; os que não têm unidade vão para as duas, como no app original. Cada envio é registrado na lista **Envio de Alertas**.

## Assistente IA

Defina `ANTHROPIC_API_KEY` para que o assistente responda perguntas livres usando o Claude (modelo `claude-opus-5-5`, configurável em `ANTHROPIC_MODEL`). Ele recebe um resumo dos terrenos e alertas do recorte atual. Sem a chave, funciona em **modo local**, com respostas prontas para risco, alertas, pendências do fluxograma e resumo geral.

## Publicação

O sistema é um app Next.js comum e pode rodar em **Azure App Service** (Node 20), Vercel, um container Docker ou um servidor próprio. Basta definir as variáveis de ambiente do `.env.example`, incluindo `NEXTAUTH_URL` com o endereço público.

## Estrutura

```
src/
  app/
    (app)/            telas autenticadas (início, terrenos, processos, alertas, agenda…)
    api/              exportação, API do Power BI, cron, assistente, agenda .ics, auth
    login/  ficha/    login e ficha imprimível
  components/         interface (shell, gráficos, Kanban, formulários, linha do tempo)
  lib/
    domain/           tipos, módulos, regras, datas, agenda (sem dependência de UI)
    data/             provedores: SharePoint (Microsoft Graph) e demonstração
    auth.ts           login Microsoft Entra ID + perfis
    relatorios.ts     tabelas de exportação (Excel/CSV/Power BI)
docs/sharepoint-schema.json  mapa de listas e colunas extraído do Power Apps
```

## Segurança

- Todas as telas exigem login. A API do Power BI e o cron usam tokens próprios, comparados em tempo constante.
- Toda gravação valida a entrada (zod) e confere o perfil do usuário no servidor.
- Segredos ficam só em variáveis de ambiente (`.env.local` está no `.gitignore`).
- Avisos restantes do `npm audit`: `postcss`, dentro do Next.js, usado só ao compilar o CSS; e `uuid`, dependência do `exceljs` e do `next-auth`. A correção sugerida pelo `npm audit fix --force` exige versões incompatíveis desses pacotes.
