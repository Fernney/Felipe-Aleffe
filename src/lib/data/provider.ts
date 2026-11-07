import type { Andamento, Base, DataISO, Fluxo, ModuloId, Processo } from "@/lib/domain/types";

export interface AlteracaoProcesso {
  titulo?: string;
  situacao?: string | null;
  acao?: string | null;
  dataInicio?: DataISO;
  dataLimiteProtocolo?: DataISO;
  previsaoRetorno?: DataISO;
  dataTermino?: DataISO;
  link?: string | null;
  comentarios?: string | null;
  extras?: Record<string, string | number | null>;
}

export interface NovoProcesso extends AlteracaoProcesso {
  modulo: ModuloId;
  terrenoId: number | null;
  titulo: string;
}

export interface NovoAndamento {
  modulo: ModuloId;
  processoId: number;
  acao: string;
  comentario: string | null;
  prazoAtendimento: DataISO;
  usuarioEmail: string;
}

export interface RegistroEnvio {
  nome: string;
  enviadoPor: string;
  origem: "Manual" | "Automático";
  quantidade: number;
}

/** Contrato comum aos provedores de dados (SharePoint ou demonstração). */
export interface Provedor {
  readonly origem: Base["origem"];
  carregar(): Promise<Base>;
  atualizarProcesso(modulo: ModuloId, id: number, alt: AlteracaoProcesso): Promise<void>;
  criarProcesso(novo: NovoProcesso): Promise<Processo>;
  registrarAndamento(a: NovoAndamento): Promise<Andamento>;
  salvarFluxo(f: Fluxo): Promise<void>;
  registrarEnvioAlertas(r: RegistroEnvio): Promise<void>;
}

/**
 * Liga registros que não têm coluna de terreno direta:
 * Ambiental → GEAVA/GELIN/Alvará, Baixa → Alvará (ou nome), ARMBH → Parcelamento.
 * Igual ao que o app original fazia com Coalesce(LookUp(...)).
 */
export function resolverVinculos(base: Base): Base {
  const terrenoDe = new Map(base.processos.map((p) => [`${p.modulo}:${p.id}`, p.terrenoId]));
  const porNome = new Map(base.terrenos.map((t) => [chaveNome(t.nome), t.id]));
  const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
  for (const p of base.processos) {
    if (p.terrenoId != null) continue;
    const e = p.extras;
    if (p.modulo === "ambiental") {
      p.terrenoId =
        terrenoDe.get(`geava:${num(e.geavaId)}`) ??
        terrenoDe.get(`gelin:${num(e.gelinId)}`) ??
        terrenoDe.get(`alvara:${num(e.alvaraId)}`) ??
        null;
    } else if (p.modulo === "baixa") {
      p.terrenoId = terrenoDe.get(`alvara:${num(e.alvaraId)}`) ?? porNome.get(chaveNome(p.titulo)) ?? null;
    } else if (p.modulo === "armbh") {
      p.terrenoId = terrenoDe.get(`parcelamento:${num(e.parcelamentoId)}`) ?? null;
    }
  }
  return base;
}

export function chaveNome(s: string): string {
  return s.replace(/_/g, " ").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
