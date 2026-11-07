import type { OpcoesVinculo } from "@/components/form-processo";
import type { Base, ModuloId } from "@/lib/domain/types";

/** Campos extras que apontam para outro registro (lookup) → opções de seleção. */
const ALVO: Record<string, ModuloId> = {
  parcelamentoId: "parcelamento",
  geavaId: "geava",
  gelinId: "gelin",
  alvaraId: "alvara",
};

export function opcoesVinculo(base: Base): OpcoesVinculo {
  const nome = new Map(base.terrenos.map((t) => [t.id, t.nome]));
  const out: OpcoesVinculo = {};
  for (const [chave, mod] of Object.entries(ALVO)) {
    out[chave] = base.processos
      .filter((p) => p.modulo === mod)
      .map((p) => ({ id: p.id, rotulo: `${p.titulo}${p.terrenoId ? ` · ${nome.get(p.terrenoId) ?? ""}` : ""}` }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  }
  return out;
}
