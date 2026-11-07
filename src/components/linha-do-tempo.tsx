import Link from "next/link";
import type { Andamento } from "@/lib/domain/types";
import { fmtData, fmtDataHora } from "@/lib/domain/datas";
import { MODULOS } from "@/lib/domain/modulos";

export function LinhaDoTempo({ itens, hoje, mostrarModulo, titulos }: {
  itens: Andamento[];
  hoje: string;
  mostrarModulo?: boolean;
  titulos?: Map<string, string>;
}) {
  if (!itens.length) return <p className="text-sm text-ink-soft">Nenhum andamento registrado.</p>;
  const ordenados = [...itens].sort((a, b) => b.data.localeCompare(a.data));
  return (
    <ol className="relative ml-2 border-l-2 border-line">
      {ordenados.map((a) => {
        const vencido = a.prazoAtendimento && a.prazoAtendimento < hoje;
        return (
          <li key={`${a.modulo}-${a.id}`} className="relative mb-5 ml-5">
            <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-card bg-brand ring-2 ring-brand/20" />
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-semibold">{a.acao}</span>
              {mostrarModulo && (
                <Link href={`/processos/${a.modulo}/${a.processoId}`} className="text-[11px] font-bold uppercase text-brand hover:underline">
                  {MODULOS[a.modulo].sigla}
                  {titulos?.get(`${a.modulo}:${a.processoId}`) ? ` · ${titulos.get(`${a.modulo}:${a.processoId}`)}` : ""}
                </Link>
              )}
            </div>
            <div className="text-xs text-ink-soft">
              {fmtDataHora(a.data)}
              {a.usuario && ` · ${a.usuario}`}
              {a.prazoAtendimento && (
                <span className={vencido ? "font-semibold text-[#B3261E]" : ""}> · prazo {fmtData(a.prazoAtendimento)}</span>
              )}
            </div>
            {a.comentario && <p className="mt-1 whitespace-pre-line text-sm">{a.comentario}</p>}
          </li>
        );
      })}
    </ol>
  );
}
