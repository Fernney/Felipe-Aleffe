# Copilot Studio · Assistente da Central de Diligenciamento

Um agente no **Teams** que responde perguntas como:
- "Quais terrenos da INOVA estão com alvará bloqueado?"
- "O que vence nesta semana?"
- "Em que pé está o GELIN do CS Jaqueline?"

Ele lê diretamente as listas do SharePoint, com as permissões de quem pergunta.

> **Licença:** o uso de agentes com respostas geradas consome a capacidade de mensagens do Copilot Studio da organização. Se o seu ambiente pedir uma licença ou capacidade que vocês não têm, o Copilot Studio avisa no momento de publicar. Nesse caso, o assistente do próprio app continua sendo a opção.

## 1 · Criar o agente

1. https://copilotstudio.microsoft.com › **Criar › Novo agente**, e clique em **Ignorar para configurar**.
2. **Nome:** Assistente de Diligenciamento
3. **Descrição:** Responde sobre terrenos, processos de licenciamento, prazos e alertas da Central de Diligenciamento (INOVA BH e SAÚDE BH).
4. **Instruções** (cole):

```
Você é o assistente da Central de Diligenciamento da JOPE (Infraestrutura Social Brasil).
Acompanha terrenos das SPEs INOVA BH (escolas) e SAÚDE BH (centros de saúde) em Belo Horizonte,
nos módulos: Parcelamento do Solo, ARMBH, DIPC (patrimônio cultural), CINDACTA, GELIN, GEAVA,
AMTT/GELIOC (movimentação de terra), Alvará, Outros Processos, Ambiental e Baixa de Construção.

Regras:
- Responda em português do Brasil, de forma direta, com listas curtas.
- Use somente os dados das listas do SharePoint conectadas. Se não encontrar, diga que não encontrou.
- Situações "Aprovado", "Dispensado" e "Concluído" contam como concluído; "Reprovado" e "Cancelado" como bloqueado;
  "Pendente" e "Aguardando documentação" como aguardando.
- Ao falar de prazos, informe a data no formato dd/mm/aaaa e quantos dias faltam ou se já venceu.
- A unidade (INOVA BH ou SAÚDE BH) vem da coluna Concessionária da lista Terrenos.
- Termine, quando fizer sentido, com a próxima ação recomendada.
- Nunca altere dados; para alterar, oriente a pessoa a usar o app Central de Diligenciamento.
```

## 2 · Conhecimento (as listas)

**Conhecimento › Adicionar conhecimento › SharePoint** e informe o site:
`https://transpes.sharepoint.com/sites/CentraldeDiligenciamento_R00`

Se a opção **Listas do SharePoint** aparecer, selecione: Terrenos, Parcelamento do Solo, Registros ARMBH, Patrimônios Culturais, Processos CINDACTA, Processos GELIN, Processos GEAVA, GELIOC, Alvarás, Outros Processos, Ambientais, Ambiental-Condicionantes, Baixas de Construção e Linha do Tempo - Licenciamento.

> Se o seu Copilot Studio não oferecer listas como conhecimento, use **ferramentas**: **Ferramentas › Adicionar ferramenta › Conector › SharePoint › Obter itens**, uma para cada lista principal. Em cada uma, a descrição diz quando usar, por exemplo: "Use para consultar alvarás: protocolo, situação, datas e terreno".

## 3 · Prompts sugeridos (aparecem como botões)

- O que vence nos próximos 7 dias?
- Quais processos estão bloqueados?
- Resumo da INOVA BH
- Resumo da SAÚDE BH
- Situação de um terreno

## 4 · Publicar no Teams

1. **Publicar**.
2. **Canais › Teams e Microsoft 365 Copilot › Adicionar canal › Disponibilizar para a equipe**.
3. Instale o agente na equipe **Central de Diligenciamento**. Ele também pode ser fixado na barra lateral do Teams.

## 5 · Aparência

Em **Configurações › Detalhes**, use o ícone da JOPE (`public/jope-logo.png` do repositório) e a cor de fundo **#6F3B8C**.
