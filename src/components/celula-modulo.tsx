import type { CelulaModulo } from "@/lib/domain/regras";
import { COR_STATUS } from "@/lib/tema";

/** Célula da matriz terreno × módulo: status, "a abrir", conflito ou não se aplica. */
export function CelulaMatriz({ c }: { c: CelulaModulo }) {
  if (c.situacao === "a-abrir")
    return (
      <span title="Exigido pelo fluxograma e ainda não cadastrado" className="inline-block rounded-md border-2 border-dashed border-[#E0A33A] px-1.5 py-0.5 text-[10px] font-bold text-[#8A5300]">
        ABRIR
      </span>
    );
  if (c.situacao === "conflito")
    return (
      <span title="Cadastrado, mas o fluxograma diz que não se aplica" className="inline-block rounded-md bg-[#B3261E] px-1.5 py-0.5 text-[10px] font-bold text-white">
        CONFLITO
      </span>
    );
  if (!c.status)
    return (
      <span title={c.aplicavel === false ? "Não se aplica" : "Sem processo"} className="text-xs text-line">
        {c.aplicavel === false ? "n/a" : "·"}
      </span>
    );
  const cor = COR_STATUS[c.status];
  return (
    <span
      title={`${c.status}${c.qtd > 1 ? ` (${c.qtd} registros)` : ""}`}
      className="inline-block h-6 w-6 rounded-md text-center text-[10px] font-bold leading-6"
      style={{ background: cor.fundo, color: cor.texto, boxShadow: `inset 0 0 0 1.5px ${cor.grafico}` }}
    >
      {c.status === "Concluído" ? "✓" : c.status === "Bloqueado" ? "✕" : c.status === "Aguardando" ? "!" : c.status === "Em andamento" ? "▶" : "○"}
    </span>
  );
}

export function LegendaMatriz() {
  const itens: [string, string][] = [
    ["✓", "Concluído"],
    ["▶", "Em andamento"],
    ["!", "Aguardando"],
    ["○", "Não iniciado"],
    ["✕", "Bloqueado"],
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-soft">
      {itens.map(([s, n]) => (
        <span key={n} className="flex items-center gap-1">
          <CelulaMatriz c={{ status: n as never, aplicavel: true, qtd: 1, situacao: "ok" }} /> {n}
        </span>
      ))}
      <span className="flex items-center gap-1"><CelulaMatriz c={{ status: null, aplicavel: true, qtd: 0, situacao: "a-abrir" }} /> exigido, não aberto</span>
      <span className="flex items-center gap-1"><CelulaMatriz c={{ status: "Em andamento", aplicavel: false, qtd: 1, situacao: "conflito" }} /> contradiz o fluxograma</span>
      <span>n/a = não se aplica</span>
    </div>
  );
}
