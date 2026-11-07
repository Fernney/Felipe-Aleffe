import Link from "next/link";
import { AlertOctagon, Clock } from "lucide-react";
import type { Alerta } from "@/lib/domain/regras";
import { MODULOS } from "@/lib/domain/modulos";
import { fmtData } from "@/lib/domain/datas";

export function ListaAlertas({ alertas, compacta }: { alertas: Alerta[]; compacta?: boolean }) {
  return (
    <ul className="divide-y divide-line">
      {alertas.map((a) => (
        <li key={a.id}>
          <Link href={a.href} className="flex items-start gap-3 py-2.5 hover:opacity-80">
            <span
              className="mt-0.5 rounded-lg p-1.5"
              style={a.alta ? { background: "#FCECEB", color: "#B3261E" } : { background: "#FDF1DE", color: "#8A5300" }}
            >
              {a.alta ? <AlertOctagon className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-sm font-semibold">{a.tipo}</span>
                <span className="text-[11px] font-bold uppercase text-brand">
                  {a.modulo === "fluxograma" ? "Fluxograma" : MODULOS[a.modulo].sigla}
                </span>
              </div>
              <div className="truncate text-xs text-ink-soft">
                <span className="font-semibold text-ink">{a.terreno}</span> · {a.detalhe}
              </div>
            </div>
            {!compacta && <span className="whitespace-nowrap text-xs tabular-nums text-ink-soft">{fmtData(a.data)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
