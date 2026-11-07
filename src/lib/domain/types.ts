// Modelo de domínio da Central de Diligenciamento.
// Independe da origem dos dados: o provedor SharePoint (Microsoft Graph) e o
// provedor de demonstração convertem tudo para estes tipos.

export type Unidade = "INOVA BH" | "SAÚDE BH";
export type FiltroUnidade = "todas" | "inova" | "saude";

export type SimNao = "Sim" | "Não" | null;

/** Data ISO curta (yyyy-mm-dd) ou null. */
export type DataISO = string | null;

export type ModuloId =
  | "parcelamento"
  | "armbh"
  | "dipc"
  | "cindacta"
  | "gelin"
  | "geava"
  | "amtt"
  | "alvara"
  | "outros"
  | "ambiental"
  | "baixa";

/** Status normalizado, igual ao usado no app Power Apps (tblStatus). */
export type StatusNorm =
  | "Concluído"
  | "Em andamento"
  | "Aguardando"
  | "Bloqueado"
  | "Não iniciado"
  | "Não se aplica";

export type Perfil = "Administrador" | "Editor" | "Consulta";

export interface Endereco {
  logradouro: string | null;
  numero: number | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

export interface Terreno {
  id: number;
  nome: string;
  unidade: Unidade | null;
  origemDemanda: string | null;
  responsavel: string | null;
  fase: string | null;
  dataDisponibilidade: DataISO;
  previsaoEntrega: DataISO;
  prazoLiberacao: DataISO;
  regional: string | null;
  endereco: Endereco | null;
}

/** Respostas do fluxograma ("Fluxos do Terreno"). */
export interface Fluxo {
  id: number | null;
  terrenoId: number;
  parcelado: SimNao;
  armbh: SimNao;
  cultural: SimNao;
  altura: SimNao;
  relevancia: SimNao;
  supressao: SimNao;
  movTerra: SimNao;
  eas: SimNao;
}

export type PerguntaFluxo = Exclude<keyof Fluxo, "id" | "terrenoId">;

export interface Processo {
  id: number;
  modulo: ModuloId;
  terrenoId: number | null;
  /** Protocolo / requerimento / nome principal do registro. */
  titulo: string;
  /** Situação como está no SharePoint (texto livre da coluna de escolha). */
  situacao: string | null;
  acao: string | null;
  dataInicio: DataISO;
  dataLimiteProtocolo: DataISO;
  previsaoRetorno: DataISO;
  dataAtualizacao: DataISO;
  dataTermino: DataISO;
  link: string | null;
  comentarios: string | null;
  /** Campos específicos do módulo (ex.: vencimento das diretrizes, tipo ambiental). */
  extras: Record<string, string | number | null>;
}

export interface Condicionante {
  id: number;
  ambientalId: number | null;
  item: string | null;
  condicionante: string | null;
  prazo: DataISO;
  status: string | null;
  observacao: string | null;
}

export interface RelatorioMonitoramento {
  id: number;
  ambientalId: number | null;
  nome: string;
  prevista: DataISO;
  real: DataISO;
}

export interface Andamento {
  id: number;
  modulo: ModuloId;
  processoId: number;
  acao: string;
  comentario: string | null;
  /** Data/hora ISO completa. */
  data: string;
  prazoAtendimento: DataISO;
  usuario: string | null;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

/** Fotografia completa dos dados usada pelos cálculos. */
export interface Base {
  terrenos: Terreno[];
  fluxos: Fluxo[];
  processos: Processo[];
  condicionantes: Condicionante[];
  relatorios: RelatorioMonitoramento[];
  andamentos: Andamento[];
  usuarios: Usuario[];
  geradoEm: string;
  origem: "sharepoint" | "demo";
}
