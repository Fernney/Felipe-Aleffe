// ============================================================================
// Central de Diligenciamento · Power Query (M)
// Power BI Desktop › Página Inicial › Transformar dados › Nova fonte › Consulta nula
// Crie uma consulta para cada bloco abaixo, com o nome indicado no cabeçalho.
// Conector: Lista do SharePoint Online, implementação 2.0 (nomes de exibição).
// ============================================================================

// ---- Consulta: Site (parâmetro) ---------------------------------------------
"https://transpes.sharepoint.com/sites/CentraldeDiligenciamento_R00"

// ---- Consulta: fnStatus (função) — mesma regra do app ----------------------
(situacao as nullable text) as text =>
let
    s = Text.Lower(Text.Trim(if situacao = null then "" else situacao)),
    r =
        if s = "" then "Não iniciado"
        else if List.Contains({"aprovado","concluído","concluída","concluido","finalizado","dispensado","emitido","deferido","cumprida"}, s) then "Concluído"
        else if List.Contains({"reprovado","cancelado","indeferido"}, s) then "Bloqueado"
        else if List.Contains({"pendente","aguardando documentação","aguardando"}, s) then "Aguardando"
        else if List.Contains({"não iniciada","a iniciar","não iniciado","nao iniciado"}, s) then "Não iniciado"
        else "Em andamento"
in
    r

// ---- Consulta: fnLista (função auxiliar) ------------------------------------
// Lê uma lista e devolve as colunas padronizadas de processo.
(nomeLista as text, modulo as text, colTitulo as text, colLimite as nullable text, colTermino as nullable text) as table =>
let
    Fonte = SharePoint.Tables(Site, [Implementation = "2.0", ViewMode = "All"]),
    Lista = Fonte{[Title = nomeLista]}[Items],
    Col = (r as record, nome as nullable text) => if nome = null then null else Record.FieldOrDefault(r, nome, null),
    Linhas = Table.AddColumn(Lista, "P", each [
        Modulo = modulo,
        IdSharePoint = [ID],
        Protocolo = Col(_, colTitulo),
        Terreno = Record.FieldOrDefault(_, "Terreno", null),
        Situacao = Record.FieldOrDefault(_, "Situação", null),
        DataInicio = Col(_, "Data de Início"),
        LimiteProtocolo = Col(_, colLimite),
        PrevisaoRetorno = Col(_, "Previsão de Retorno"),
        DataTermino = Col(_, colTermino),
        Atualizacao = Record.FieldOrDefault(_, "Modificado", null)
    ]),
    Tabela = Table.FromRecords(Linhas[P])
in
    Tabela

// ---- Consulta: Processos (todas as listas numa tabela só) -------------------
let
    Partes = {
        fnLista("Parcelamento do Solo", "Parcelamento", "Protocolo/Requerimento", "Data Limite para Protocolo", null),
        fnLista("Patrimônios Culturais", "DIPC", "Processo", "Data Limite de Protocolo", "Data de Término"),
        fnLista("Processos CINDACTA", "CINDACTA", "Processo", "Data Limite de Protocolo", null),
        fnLista("Processos GELIN", "GELIN", "Protocolo/Requerimento", "Data Limite de Protocolo", "Data de Término"),
        fnLista("Processos GEAVA", "GEAVA", "Protocolo/Requerimento", "Data Limite de Protocolo", "Data de Término"),
        fnLista("GELIOC", "AMTT", "Número de Autorização", "Data Limite de Protocolo", "Data de Término"),
        fnLista("Alvarás", "Alvará", "Requerimento do Portal de Edificação", "Data Limite de Protocolo", "Data de Emissão"),
        fnLista("Outros Processos", "Outros", "Descrição do Processo", "Data Limite de Protocolo", "Data de Término")
    },
    Juntos = Table.Combine(Partes),
    Tipos = Table.TransformColumnTypes(Juntos, {
        {"DataInicio", type date}, {"LimiteProtocolo", type date}, {"PrevisaoRetorno", type date},
        {"DataTermino", type date}, {"Atualizacao", type datetime}, {"Situacao", type text}, {"Terreno", type text}}),
    ComStatus = Table.AddColumn(Tipos, "Status", each fnStatus([Situacao]), type text),
    // Duração média por módulo (processos concluídos com início e término)
    Concluidos = Table.SelectRows(ComStatus, each [Status] = "Concluído" and [DataInicio] <> null and [DataTermino] <> null and [DataTermino] >= [DataInicio]),
    Medias = Table.Group(Concluidos, {"Modulo"}, {{"DuracaoMedia", each Number.Round(List.Average(List.Transform(Table.ToRecords(_), (r) => Duration.Days(r[DataTermino] - r[DataInicio])))), type number}}),
    ComMedia = Table.NestedJoin(ComStatus, {"Modulo"}, Medias, {"Modulo"}, "M", JoinKind.LeftOuter),
    Expandido = Table.ExpandTableColumn(ComMedia, "M", {"DuracaoMedia"}),
    // Previsão de conclusão: previsão de retorno ou início + duração média
    ComPrevisao = Table.AddColumn(Expandido, "ConclusaoPrevista", each
        if [Status] = "Concluído" or [Status] = "Bloqueado" then [DataTermino]
        else if [PrevisaoRetorno] <> null then [PrevisaoRetorno]
        else if [DataInicio] <> null and [DuracaoMedia] <> null then Date.AddDays([DataInicio], [DuracaoMedia])
        else null, type date)
in
    ComPrevisao

// ---- Consulta: Terrenos ------------------------------------------------------
let
    Fonte = SharePoint.Tables(Site, [Implementation = "2.0", ViewMode = "All"]),
    Itens = Fonte{[Title = "Terrenos"]}[Items],
    Sel = Table.SelectColumns(Itens, {"ID", "Nome do Terreno", "Concessionária", "Origem demanda", "Responsável", "Fase do Empreendimento", "Prazo de Liberação", "Previsão de Entrega da Obra"}, MissingField.UseNull),
    Unidade = Table.AddColumn(Sel, "Unidade", each
        let c = Text.Upper(if [Concessionária] = null then "" else Text.From([Concessionária])) in
        if Text.Contains(c, "INOVA") then "INOVA BH" else if c = "" then "Sem unidade" else "SAÚDE BH", type text),
    Tipos = Table.TransformColumnTypes(Unidade, {{"Prazo de Liberação", type date}, {"Previsão de Entrega da Obra", type date}})
in
    Tipos
