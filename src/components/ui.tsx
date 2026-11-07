import Link from "next/link";
import type { ReactNode } from "react";
import type { NivelRisco } from "@/lib/domain/regras";
import type { StatusNorm } from "@/lib/domain/types";
import { COR_STATUS } from "@/lib/tema";

export function StatusChip({ status, compacto }: { status: StatusNorm | null; compacto?: boolean }) {
  if (!status) return <span className="text-xs text-ink-soft">—</span>;
  const c = COR_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${compacto ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
      style={{ background: c.fundo, color: c.texto }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.texto }} />
      {status}
    </span>
  );
}

export function RiscoBadge({ nivel, valor }: { nivel: NivelRisco; valor: number }) {
  const cor = nivel === "Alto" ? COR_STATUS.Bloqueado : nivel === "Médio" ? COR_STATUS.Aguardando : COR_STATUS.Concluído;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: cor.fundo, color: cor.texto }}>
      {valor}
      <span className="font-semibold">· {nivel}</span>
    </span>
  );
}

export function Barra({ valor, className = "" }: { valor: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, valor)) * 100);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-3" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-ink-soft">{pct}%</span>
    </div>
  );
}

export function Kpi({ rotulo, valor, detalhe, icone, destaque, href }: {
  rotulo: string; valor: ReactNode; detalhe?: ReactNode; icone?: ReactNode; destaque?: "perigo" | "aviso"; href?: string;
}) {
  const corValor = destaque === "perigo" ? "text-[#B3261E]" : destaque === "aviso" ? "text-[#8A5300]" : "text-ink";
  const conteudo = (
    <div className="cartao flex h-full items-start gap-3 p-4 transition hover:border-brand/40">
      {icone && <div className="rounded-xl bg-brand/10 p-2.5 text-brand">{icone}</div>}
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{rotulo}</div>
        <div className={`mt-1 text-2xl font-bold tabular-nums ${corValor}`}>{valor}</div>
        {detalhe && <div className="mt-0.5 text-xs text-ink-soft">{detalhe}</div>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{conteudo}</Link> : conteudo;
}

export function Cabecalho({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="titulo-pagina">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-ink-soft">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Secao({ titulo, acao, children, className = "" }: { titulo: string; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`cartao p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-ink">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft">{children}</div>;
}

export function UnidadeTag({ unidade }: { unidade: string | null }) {
  if (!unidade) return <span className="text-xs text-ink-soft">Sem unidade</span>;
  const inova = unidade.includes("INOVA");
  return (
    <span
      className="rounded-md px-2 py-0.5 text-[11px] font-bold"
      style={inova ? { background: "#E3EFEE", color: "#0D5A55" } : { background: "#EFE6F4", color: "#6E368C" }}
    >
      {unidade}
    </span>
  );
}
