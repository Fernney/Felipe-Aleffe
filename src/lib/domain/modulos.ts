import type { ModuloId } from "./types";

export type Area = "Parcelamento do Solo" | "Licenciamento" | "Ambiental" | "Baixa de Construção";

export interface CampoExtra {
  chave: string;
  rotulo: string;
  /** Nome interno da coluna no SharePoint. */
  sp: string;
  tipo: "texto" | "data" | "numero";
}

export interface ModuloDef {
  id: ModuloId;
  sigla: string;
  nome: string;
  descricao: string;
  area: Area;
  /** Nome da lista no SharePoint (site CentraldeDiligenciamento_R00). */
  lista: string;
  listaId: string;
  /** Rótulo do campo principal (Title). */
  rotuloTitulo: string;
  /** Colunas padrão → nome interno. Ausente = coluna não existe nesta lista. */
  sp: {
    titulo: string;
    situacao?: string;
    acao?: string;
    dataInicio?: string;
    dataLimiteProtocolo?: string;
    previsaoRetorno?: string;
    dataAtualizacao?: string;
    dataTermino?: string;
    link?: string;
    comentarios?: string;
    /** Coluna lookup do terreno (o Graph devolve <nome>LookupId). */
    terreno?: string;
  };
  extras: CampoExtra[];
  /** Pergunta do fluxograma que torna o módulo obrigatório (informativo). */
  regra?: string;
  /** Onde ficam os andamentos (linha do tempo) deste módulo. */
  linhaDoTempo: { lista: "licenciamento" | "parcelamento"; coluna: string; tipo: string } | null;
}

const PADRAO = {
  titulo: "Title",
  situacao: "cd_situacao",
  acao: "cd_acao",
  dataInicio: "cd_datadeinicio",
  dataLimiteProtocolo: "cd_datalimitedeprotocolo",
  previsaoRetorno: "cd_previsaoderetorno",
  dataAtualizacao: "cd_datadeatualizacao",
  link: "cd_link",
  comentarios: "cd_comentarios",
  terreno: "cd_terreno",
};

export const MODULOS: Record<ModuloId, ModuloDef> = {
  parcelamento: {
    id: "parcelamento",
    sigla: "PARC",
    nome: "Parcelamento do Solo",
    descricao: "Diretrizes, aprovação e registro do parcelamento",
    area: "Parcelamento do Solo",
    lista: "Parcelamento do Solo",
    listaId: "abb46fe4-cffc-4e3c-b371-7e5493a95cee",
    rotuloTitulo: "Protocolo/Requerimento",
    sp: {
      ...PADRAO,
      dataLimiteProtocolo: "cd_datalimiteparaprotocolo",
      dataAtualizacao: "cd_ultimaatualizacao",
      link: "cd_linkdeacesso",
    },
    extras: [
      { chave: "vencimentoDiretrizes", rotulo: "Vencimento das diretrizes", sp: "cd_datadevencimentodasdiretrizes", tipo: "data" },
      { chave: "faseProcesso", rotulo: "Fase do processo", sp: "cd_fasedoprocesso", tipo: "texto" },
      { chave: "modalidade", rotulo: "Tipo de modalidade", sp: "cd_tipodemodalidade", tipo: "texto" },
      { chave: "requerArmbh", rotulo: "Requer ARMBH", sp: "cd_requerarmbh", tipo: "texto" },
    ],
    regra: "Terreno ainda não parcelado",
    linhaDoTempo: { lista: "parcelamento", coluna: "cd_parcelamentodosolo", tipo: "Parcelamento do Solo" },
  },
  armbh: {
    id: "armbh",
    sigla: "ARMBH",
    nome: "Anuência Metropolitana",
    descricao: "Diretrizes e anuência da Agência RMBH",
    area: "Parcelamento do Solo",
    lista: "Registros ARMBH",
    listaId: "40002f5f-4994-4c26-9438-14c233693575",
    rotuloTitulo: "Processo SEI",
    sp: {
      titulo: "Title",
      situacao: "cd_statusdacondicionante",
      acao: "cd_acao",
      dataLimiteProtocolo: "cd_datalimiteparaprotocolo",
      previsaoRetorno: "cd_previsaoderetorno",
      dataAtualizacao: "cd_ultimaatualizacao",
      link: "cd_linkdeacesso",
      comentarios: "cd_comentarios",
    },
    extras: [
      { chave: "parcelamentoId", rotulo: "Parcelamento", sp: "cd_parcelamentodosolo", tipo: "numero" },
      { chave: "anuencia", rotulo: "Anuência de ARMBH", sp: "cd_anuenciadearmbh", tipo: "texto" },
      { chave: "diretrizes", rotulo: "Diretrizes de ARMBH", sp: "cd_diretrizesdearmbh", tipo: "texto" },
      { chave: "numeroAnuencia", rotulo: "Número da anuência", sp: "cd_numerodaanuencia", tipo: "texto" },
      { chave: "validadeDiretrizes", rotulo: "Validade das diretrizes", sp: "cd_validadedasdiretrizesarmbh", tipo: "data" },
    ],
    regra: "Não parcelado e requer anuência metropolitana",
    linhaDoTempo: { lista: "parcelamento", coluna: "cd_armbh", tipo: "ARMBH" },
  },
  dipc: {
    id: "dipc",
    sigla: "DIPC",
    nome: "Patrimônio Cultural",
    descricao: "Diretoria de Patrimônio Cultural (DIPC)",
    area: "Licenciamento",
    lista: "Patrimônios Culturais",
    listaId: "913c01f6-c963-4ef8-a80c-a6e06714564a",
    rotuloTitulo: "Processo",
    sp: { ...PADRAO, dataTermino: "DatadeT_x00e9_rmino" },
    extras: [{ chave: "requerPatrimonio", rotulo: "Requer patrimônio", sp: "cd_requerpatrimonio", tipo: "texto" }],
    regra: "Lote em área de proteção cultural",
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_patrimoniocultural", tipo: "DIPC" },
  },
  cindacta: {
    id: "cindacta",
    sigla: "CINDACTA",
    nome: "CINDACTA",
    descricao: "Gabarito aeronáutico / altura limite",
    area: "Licenciamento",
    lista: "Processos CINDACTA",
    listaId: "670fe544-5d2f-4b9a-9915-88b7841c55c0",
    rotuloTitulo: "Processo",
    sp: { ...PADRAO, dataTermino: "cd_datadeterminodaobra" },
    extras: [
      { chave: "processoCindacta", rotulo: "Processo CINDACTA", sp: "cd_processocindacta", tipo: "texto" },
      { chave: "preAnalise", rotulo: "Pré-análise", sp: "cd_preanalise", tipo: "texto" },
      { chave: "numeroPreAnalise", rotulo: "Nº da pré-análise", sp: "cd_numerodapreanalise", tipo: "texto" },
      { chave: "situacaoPreAnalise", rotulo: "Situação da pré-análise", sp: "cd_situacaopreanalise", tipo: "texto" },
      { chave: "comunicadoTermino", rotulo: "Comunicado de término", sp: "cd_statusdecomunicadodetermino", tipo: "texto" },
    ],
    regra: "Supera a altura limite",
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_cindacta", tipo: "CINDACTA" },
  },
  gelin: {
    id: "gelin",
    sigla: "GELIN",
    nome: "GELIN",
    descricao: "Licenciamento ambiental — relevância ambiental",
    area: "Licenciamento",
    lista: "Processos GELIN",
    listaId: "71fd9315-b97d-4ed1-b5e2-e9ab58d68b2e",
    rotuloTitulo: "Protocolo/Requerimento",
    sp: { ...PADRAO, dataTermino: "Datadet_x00e9_rmino" },
    extras: [
      { chave: "nomeProcesso", rotulo: "Nome do processo", sp: "cd_nomedoprocessogelin", tipo: "texto" },
      { chave: "tipoAmbiental", rotulo: "Tipo de processo ambiental", sp: "cd_tipodeprocessoambiental", tipo: "texto" },
    ],
    regra: "Terreno com relevância ambiental",
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_gelin", tipo: "GELIN" },
  },
  geava: {
    id: "geava",
    sigla: "GEAVA",
    nome: "GEAVA",
    descricao: "Supressão de vegetação e compensação",
    area: "Licenciamento",
    lista: "Processos GEAVA",
    listaId: "19088f91-8767-413c-a1f3-de7c3fdbd505",
    rotuloTitulo: "Protocolo/Requerimento",
    sp: { ...PADRAO, dataTermino: "DatadeT_x00e9_rmino" },
    extras: [{ chave: "tipoAmbiental", rotulo: "Tipo de processo ambiental", sp: "cd_tipodeprocessoambiental", tipo: "texto" }],
    regra: "Sem relevância ambiental, mas com supressão",
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_geava", tipo: "GEAVA" },
  },
  amtt: {
    id: "amtt",
    sigla: "AMTT",
    nome: "Movimentação de Terra",
    descricao: "Autorização GELIOC (bota-fora / empréstimo)",
    area: "Licenciamento",
    lista: "GELIOC",
    listaId: "e788e930-159e-4980-8333-0d36e2c2de24",
    rotuloTitulo: "Número de autorização",
    sp: { ...PADRAO, dataTermino: "DatadeT_x00e9_rmino" },
    extras: [
      { chave: "protocolo", rotulo: "Protocolo/Processo", sp: "cd_protocoloprocesso", tipo: "texto" },
      { chave: "tipoProcesso", rotulo: "Tipo de processo", sp: "cd_tipodeprocesso", tipo: "texto" },
      { chave: "volumeBotaFora", rotulo: "Volume de bota-fora (m³)", sp: "cd_volumedebotafora", tipo: "numero" },
      { chave: "volumeEmprestimo", rotulo: "Volume de empréstimo (m³)", sp: "cd_volumedeemprestimo", tipo: "numero" },
    ],
    regra: "Possui movimentação de terra",
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_gelioc", tipo: "AMTT" },
  },
  alvara: {
    id: "alvara",
    sigla: "ALV",
    nome: "Alvará",
    descricao: "Alvará de construção (Portal de Edificação)",
    area: "Licenciamento",
    lista: "Alvarás",
    listaId: "c288f80b-46e2-4442-b900-4eff9dade0e7",
    rotuloTitulo: "Requerimento do Portal",
    sp: { ...PADRAO, dataTermino: "DatadeEmiss_x00e3_o" },
    extras: [
      { chave: "numeroAlvara", rotulo: "Número do alvará", sp: "cd_numerodoalvara", tipo: "texto" },
      { chave: "processo", rotulo: "Processo", sp: "cd_processo", tipo: "texto" },
    ],
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_alvara", tipo: "Alvará" },
  },
  outros: {
    id: "outros",
    sigla: "OUT",
    nome: "Outros Processos",
    descricao: "Demais processos de licenciamento",
    area: "Licenciamento",
    lista: "Outros Processos",
    listaId: "98c00da5-de0a-4e8c-b198-797f461342b1",
    rotuloTitulo: "Descrição do processo",
    sp: { ...PADRAO, dataTermino: "DatadeT_x00e9_rmino" },
    extras: [{ chave: "processo", rotulo: "Processo", sp: "cd_processo", tipo: "texto" }],
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_outrosprocessos", tipo: "Outros" },
  },
  ambiental: {
    id: "ambiental",
    sigla: "AMB",
    nome: "Ambiental",
    descricao: "Termos de compromisso, compensação e plantio",
    area: "Ambiental",
    lista: "Ambientais",
    listaId: "331c2f0e-650e-42de-9b84-91005ef52dab",
    rotuloTitulo: "Nome do processo ambiental",
    sp: { titulo: "Title", situacao: "cd_status", acao: "cd_acao", comentarios: "cd_observacoes" },
    extras: [
      { chave: "tipo", rotulo: "Tipo de processo", sp: "cd_tipodeprocesso", tipo: "texto" },
      { chave: "parecer", rotulo: "Parecer técnico", sp: "cd_parecertecnico", tipo: "texto" },
      { chave: "numeroProcesso", rotulo: "Nº processo", sp: "cd_nprocesso", tipo: "texto" },
      { chave: "termoCompensacao", rotulo: "Nº termo de compensação", sp: "cd_ntermodecompensacao", tipo: "texto" },
      { chave: "statusTermo", rotulo: "Status do termo", sp: "cd_statustermodecompromisso", tipo: "texto" },
      { chave: "assinaturaTermo", rotulo: "Assinatura do termo", sp: "cd_datadeassinaturadotermo", tipo: "data" },
      { chave: "prazoTermo", rotulo: "Prazo p/ cumprimento do termo", sp: "cd_prazolimitepcumprimentodoterm", tipo: "data" },
      { chave: "reciboProvisorio", rotulo: "Recibo provisório", sp: "cd_reciboprovisorio", tipo: "data" },
      { chave: "previsaoReciboDefinitivo", rotulo: "Previsão recibo definitivo", sp: "cd_previsaorecibodefinitivo", tipo: "data" },
      { chave: "reciboDefinitivo", rotulo: "Recibo definitivo", sp: "cd_recibodefinitivorealizado", tipo: "data" },
      { chave: "arvoresSuprimidas", rotulo: "Árvores suprimidas", sp: "cd_totaldearvoressuprimidas", tipo: "numero" },
      { chave: "arvoresTransplantadas", rotulo: "Árvores transplantadas", sp: "cd_totaldearvorestransplantadas", tipo: "numero" },
      { chave: "mudasCompensar", rotulo: "Mudas a compensar", sp: "cd_totaldemudasasercompensadas", tipo: "numero" },
      { chave: "mudasDpea", rotulo: "Mudas plantadas (DPEA)", sp: "cd_plantiodemudasrealizadosdpea", tipo: "numero" },
      { chave: "mudasGelin", rotulo: "Mudas plantadas (GELIN)", sp: "cd_plantiodemudasrealizadosgelin", tipo: "numero" },
      { chave: "geavaId", rotulo: "Processo GEAVA", sp: "cd_processogeava", tipo: "numero" },
      { chave: "gelinId", rotulo: "Processo GELIN", sp: "cd_processogelin", tipo: "numero" },
      { chave: "alvaraId", rotulo: "Alvará", sp: "cd_alvara", tipo: "numero" },
    ],
    regra: "Supressão (compensação) ou relevância ambiental",
    linhaDoTempo: null,
  },
  baixa: {
    id: "baixa",
    sigla: "BAIXA",
    nome: "Baixa de Construção",
    descricao: "Comunicado de término e Habite-se",
    area: "Baixa de Construção",
    lista: "Baixas de Construção",
    listaId: "9197a729-8573-496e-95da-6b99bbb7a8fe",
    rotuloTitulo: "Nome da baixa",
    sp: {
      titulo: "Title",
      situacao: "cd_situacao",
      acao: "cd_acao",
      dataLimiteProtocolo: "cd_datalimiteparaprotocolo",
      previsaoRetorno: "cd_previsaoderetorno",
      dataTermino: "cd_datadetermino",
      link: "cd_link",
      comentarios: "cd_observacoes",
    },
    extras: [
      { chave: "protocolo", rotulo: "Protocolo", sp: "cd_protocolo", tipo: "texto" },
      { chave: "requerimento", rotulo: "Requerimento", sp: "cd_requerimento", tipo: "texto" },
      { chave: "inicioObra", rotulo: "Início de obra", sp: "cd_datainiciodeobra", tipo: "data" },
      { chave: "comunicadoTermino", rotulo: "Comunicado de término", sp: "cd_datadecomunicadodeterminodeob", tipo: "data" },
      { chave: "programacaoBaixa", rotulo: "Programação de baixa", sp: "cd_datadeprogramacaodebaixa", tipo: "data" },
      { chave: "alvaraId", rotulo: "Alvará", sp: "cd_conclusaodoalvara", tipo: "numero" },
    ],
    linhaDoTempo: { lista: "licenciamento", coluna: "cd_baixadeconstrucao", tipo: "Baixa de Construção" },
  },
};

export const LISTA_MODULOS = Object.values(MODULOS);

/** Módulos que aparecem como colunas da matriz por terreno (mesma ordem do relatório consolidado). */
export const MODULOS_MATRIZ: ModuloId[] = [
  "parcelamento",
  "dipc",
  "cindacta",
  "gelin",
  "geava",
  "amtt",
  "alvara",
  "outros",
  "ambiental",
  "baixa",
];

export function moduloValido(id: string): id is ModuloId {
  return id in MODULOS;
}

/** Situações oferecidas no formulário (valores vistos no app original). */
export const SITUACOES = [
  "Não Iniciada",
  "Em análise",
  "Aguardando documentação",
  "Pendente",
  "Aprovado",
  "Dispensado",
  "Reprovado",
  "Cancelado",
] as const;
