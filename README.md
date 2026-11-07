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

O sistema tem dois modos de acesso, escolhidos em `SP_AUTH_MODE`:

| | **Delegado** (padrão) | **Aplicativo** |
|---|---|---|
| Como acessa | Com o login Microsoft de quem está usando | Com acesso próprio do sistema |
| Precisa de administrador? | **Não**, se a organização permitir que o usuário aprove as permissões | Sim (consentimento + liberação do site) |
| O que cada pessoa vê | O que ela já vê no SharePoint | Tudo do site |
| E-mail de alertas | Sai da caixa de quem clicou em "Enviar" | Sai da caixa `MAIL_SENDER` |
| Resumo diário automático e API do Power BI | Não (exigem alguém logado) | Sim |

### Modo delegado (sem administrador)

1. Acesse https://entra.microsoft.com com a sua conta corporativa.
2. Vá em **Aplicativos › Registros de aplicativo › Novo registro**.
   - **Nome:** Central de Diligenciamento
   - **Tipo de conta:** *Somente contas deste diretório organizacional*
   - **URI de redirecionamento:** tipo **Web**, endereço `http://localhost:3000/api/auth/callback/azure-ad`
3. Anote o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**.
4. Em **Certificados e segredos › Novo segredo do cliente**, crie um segredo e copie o **Valor** (ele aparece uma vez só).
5. Em **Permissões de API › Adicionar › Microsoft Graph › Permissões delegadas**, adicione:
   `User.Read`, `offline_access`, `openid`, `profile`, `email`, `Sites.ReadWrite.All`, `Mail.Send`.
   Não clique em "conceder consentimento do administrador": você aprova as suas no primeiro login.
6. Preencha o `.env.local`:

   ```env
   DATA_PROVIDER=sharepoint
   SP_AUTH_MODE=delegado
   SP_SITE=transpes.sharepoint.com:/sites/CentraldeDiligenciamento_R00
   AZURE_AD_CLIENT_ID=<ID do aplicativo>
   AZURE_AD_TENANT_ID=<ID do diretório>
   AZURE_AD_CLIENT_SECRET=<valor do segredo>
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   ```

7. Rode `npm run dev`, clique em **Entrar com conta Microsoft** e aceite a tela de permissões.

Se a Microsoft mostrar **"Aprovação necessária"** / *"Need admin approval"*, a organização bloqueou o consentimento pelo usuário. Aí é preciso pedir ao TI que aprove o app; muitas vezes a própria tela tem um botão para enviar a solicitação. Também é possível que a opção *Novo registro* esteja desabilitada para não administradores; nesse caso, o TI faz o registro e envia os três valores do passo 3 e 4.

Cada pessoa só precisa estar cadastrada na lista **Usuário do Sistema**, com o e-mail igual ao login, para receber o perfil correto.

### Modo aplicativo (com administrador)

É o mesmo registro, com estas diferenças:
- Permissões **de aplicativo** `Sites.Selected` (e `Mail.Send`, se for enviar e-mail), com **consentimento do administrador**.
- O administrador do SharePoint libera o site para o app:

  ```powershell
  Grant-PnPAzureADAppSitePermission -AppId <ID do aplicativo> -DisplayName "Central de Diligenciamento" -Permissions Write -Site https://transpes.sharepoint.com/sites/CentraldeDiligenciamento_R00
  ```

- No `.env.local`: `SP_AUTH_MODE=aplicativo`, além de `SP_TENANT_ID`, `SP_CLIENT_ID`, `SP_CLIENT_SECRET` e `MAIL_SENDER`.

### Detalhes

Os IDs das listas e os nomes internos das colunas foram extraídos do próprio app e estão em `src/lib/domain/modulos.ts`, `src/lib/data/sharepoint.ts` e `docs/sharepoint-schema.json`. **Não é preciso criar nem alterar nenhuma lista.** A leitura fica em cache por `SP_CACHE_SECONDS` (60 s por padrão), separada por usuário no modo delegado, e é renovada a cada gravação. As requisições respeitam o limite do SharePoint, com nova tentativa em caso de 429 ou 503.

## Power BI

- **Opção 1 (nada muda):** continue lendo as listas do SharePoint. O sistema grava nas mesmas listas.
- **Opção 2 (recomendada, exige o modo aplicativo):** use a API `GET /api/bi/<dataset>` com o cabeçalho `Authorization: Bearer <BI_API_TOKEN>`.
  - Datasets: `consolidado`, `alertas`, `processos`, `andamentos`, `terrenos`, `condicionantes` e `modulo?modulo=<id>`.
  - Parâmetros: `unidade=todas|inova|saude` e `formato=json|csv`.
  - O código Power Query (M) pronto está na tela **Relatórios & Power BI**.

## Alertas automáticos

Disponível no modo aplicativo. Agende uma chamada diária (Azure Logic Apps, cron do servidor, GitHub Actions etc.), trocando `$CRON_SECRET` e o endereço pelos seus:

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
