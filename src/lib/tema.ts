import type { FiltroUnidade, StatusNorm } from "@/lib/domain/types";

/** Paletas oficiais. JOPE = geral/menu · INOVA = filtro INOVA BH · SAÚDE = filtro SAÚDE BH. */
export const PALETAS = {
  todas: { nome: "JOPE", cores: ["#6F3B8C", "#3266AF", "#12A9A2", "#737373"] },
  inova: { nome: "INOVA BH", cores: ["#0D5A55", "#95C11F", "#706F6F", "#4E8C2A"] },
  saude: { nome: "SAÚDE BH", cores: ["#6E368C", "#4C2C84", "#4D4D4D", "#9A6FB3"] },
} as const satisfies Record<FiltroUnidade, { nome: string; cores: readonly string[] }>;

export function paleta(f: FiltroUnidade) {
  return PALETAS[f];
}

/** Cores de status (mesmas do tblStatus do app original). */
export const COR_STATUS: Record<StatusNorm, { texto: string; fundo: string; grafico: string }> = {
  Concluído: { texto: "#0B6B66", fundo: "#E1F4F2", grafico: "#12A9A2" },
  "Em andamento": { texto: "#234C85", fundo: "#E7EEF8", grafico: "#3266AF" },
  Aguardando: { texto: "#8A5300", fundo: "#FDF1DE", grafico: "#E0A33A" },
  Bloqueado: { texto: "#B3261E", fundo: "#FCECEB", grafico: "#D9534A" },
  "Não iniciado": { texto: "#646464", fundo: "#F0F0F0", grafico: "#B5B5B5" },
  "Não se aplica": { texto: "#969696", fundo: "#FFFFFF", grafico: "#E4E1EA" },
};
