import Link from "next/link";
import { Cabecalho } from "@/components/ui";
import { carregarPainel } from "@/lib/data";
import { LISTA_MODULOS, type Area } from "@/lib/domain/modulos";
import { statusProcesso } from "@/lib/domain/regras";
import type { StatusNorm } from "@/lib/domain/types";
import { filtroAtual } from "@/lib/filtro";
import { COR_STATUS } from "@/lib/tema";

export const metadata = { title: "Processos" };

const AREAS: Area[] = ["Parcelamento do Solo", "Licenciamento", "Ambiental", "Baixa de Construção"];
const ORDEM: StatusNorm[] = ["Concluído", "Em andamento", "Aguardando", "Não iniciado", "Bloqueado"];

export default async function Processos() {
  const { base, alertas, hoje } = await carregarPainel(await filtroAtual());
  return (
    <>
      <Cabecalho titulo="Processos" subtitulo="Todos os módulos do diligenciamento, agrupados por área" />
      {AREAS.map((area) => (
        <section key={area} className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{area}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {LISTA_MODULOS.filter((m) => m.area === area).map((m) => {
              const procs = base.processos.filter((p) => p.modulo === m.id);
              const cont = Object.fromEntries(ORDEM.map((s) => [s, 0])) as Record<StatusNorm, number>;
              procs.forEach((p) => cont[statusProcesso(p, hoje)]++);
              const al = alertas.filter((a) => a.modulo === m.id);
              return (
                <Link key={m.id} href={`/processos/${m.id}`} className="cartao group p-4 transition hover:-translate-y-0.5 hover:border-brand/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-brand">{m.sigla}</div>
                      <div className="font-bold group-hover:text-brand">{m.nome}</div>
                      <div className="text-xs text-ink-soft">{m.descricao}</div>
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{procs.length}</div>
                  </div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-line">
                    {ORDEM.map((s) =>
                      cont[s] ? <div key={s} style={{ width: `${(cont[s] / procs.length) * 100}%`, background: COR_STATUS[s].grafico }} title={`${s}: ${cont[s]}`} /> : null,
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-ink-soft">
                    {ORDEM.filter((s) => cont[s]).map((s) => (
                      <span key={s}><b style={{ color: COR_STATUS[s].texto }}>{cont[s]}</b> {s.toLowerCase()}</span>
                    ))}
                  </div>
                  {al.length > 0 && (
                    <div className="mt-3 text-xs font-semibold text-[#B3261E]">
                      {al.filter((a) => a.alta).length} crítico(s) · {al.length} alerta(s)
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
