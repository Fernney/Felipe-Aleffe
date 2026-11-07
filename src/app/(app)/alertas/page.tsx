import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { ListaAlertas } from "@/components/lista-alertas";
import { Cabecalho, Kpi, Secao, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { filtroAtual } from "@/lib/filtro";
import { BotaoEnviarEmail } from "./botao-email";

export const metadata = { title: "Alertas" };

export default async function Alertas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const sessao = await exigirSessao();
  const { alertas } = await carregarPainel(await filtroAtual());

  const filtrados = alertas.filter((a) => (!sp.tipo || a.tipo === sp.tipo) && (!sp.prio || (sp.prio === "alta") === a.alta));
  const grupos = new Map<string, typeof alertas>();
  for (const a of filtrados) grupos.set(a.tipo, [...(grupos.get(a.tipo) ?? []), a]);
  const tipos = [...new Set(alertas.map((a) => a.tipo))].sort();
  const link = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...q }).filter(([, v]) => v) as [string, string][]);
    return `/alertas${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <Cabecalho
        titulo="Central de alertas"
        subtitulo="Calculados a cada acesso a partir das listas do SharePoint — sem fluxo agendado para manter."
        acoes={
          <>
            <a href="/api/exportar/alertas?formato=xlsx" className="btn-contorno"><Download className="h-4 w-4" /> Excel</a>
            <a href="/api/alertas/previa?spe=inova" target="_blank" className="btn-contorno"><Eye className="h-4 w-4" /> Prévia INOVA</a>
            <a href="/api/alertas/previa?spe=saude" target="_blank" className="btn-contorno"><Eye className="h-4 w-4" /> Prévia Saúde</a>
            <BotaoEnviarEmail habilitado={sessao.podeEditar && alertas.length > 0} />
          </>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi rotulo="Total" valor={alertas.length} href={link({ prio: undefined, tipo: undefined })} />
        <Kpi rotulo="Prioridade alta" valor={alertas.filter((a) => a.alta).length} destaque="perigo" href={link({ prio: "alta" })} />
        <Kpi rotulo="Atenção" valor={alertas.filter((a) => !a.alta).length} destaque="aviso" href={link({ prio: "normal" })} />
        <Kpi rotulo="Terrenos afetados" valor={new Set(alertas.map((a) => a.terrenoId)).size} />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={link({ tipo: undefined })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${!sp.tipo ? "border-brand bg-brand text-white" : "border-line"}`}>Todos</Link>
        {tipos.map((t) => (
          <Link key={t} href={link({ tipo: t })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${sp.tipo === t ? "border-brand bg-brand text-white" : "border-line hover:border-brand"}`}>
            {t} ({alertas.filter((a) => a.tipo === t).length})
          </Link>
        ))}
      </div>
      {filtrados.length === 0 ? (
        <Vazio>Nenhum alerta com esse filtro.</Vazio>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {[...grupos.entries()].map(([tipo, lista]) => (
            <Secao key={tipo} titulo={`${tipo} (${lista.length})`}>
              <ListaAlertas alertas={lista} />
            </Secao>
          ))}
        </div>
      )}
    </>
  );
}
