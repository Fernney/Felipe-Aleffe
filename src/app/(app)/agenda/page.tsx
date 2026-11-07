import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Cabecalho, Secao, Vazio } from "@/components/ui";
import { carregarPainel } from "@/lib/data";
import { eventosAgenda, type Evento } from "@/lib/domain/agenda";
import { diffDias, fmtData, somaDias } from "@/lib/domain/datas";
import { filtroAtual } from "@/lib/filtro";

export const metadata = { title: "Agenda de prazos" };

const COR: Record<Evento["tipo"], string> = {
  Protocolo: "#B3261E",
  Retorno: "#3266AF",
  "Linha do tempo": "#8A5300",
  Diretrizes: "#6F3B8C",
  "Termo ambiental": "#0B6B66",
  Condicionante: "#12A9A2",
  Relatório: "#737373",
  Liberação: "#4C2C84",
};
const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export default async function Agenda({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const { base, hoje } = await carregarPainel(await filtroAtual());
  const eventos = eventosAgenda(base, hoje);

  const ref = /^\d{4}-\d{2}$/.test(mes ?? "") ? mes! : hoje.slice(0, 7);
  const [ano, m] = ref.split("-").map(Number);
  const primeiro = `${ref}-01`;
  const diaSemana = new Date(`${primeiro}T12:00:00Z`).getUTCDay();
  const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  const inicioGrade = somaDias(primeiro, -diaSemana);
  const celulas = Array.from({ length: Math.ceil((diaSemana + diasNoMes) / 7) * 7 }, (_, i) => somaDias(inicioGrade, i));
  const porDia = new Map<string, Evento[]>();
  for (const e of eventos) porDia.set(e.data, [...(porDia.get(e.data) ?? []), e]);
  const navegar = (delta: number) => {
    const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
    return `/agenda?mes=${d.toISOString().slice(0, 7)}`;
  };
  const proximos = eventos.filter((e) => e.data >= somaDias(hoje, -30) && e.data <= somaDias(hoje, 30));

  return (
    <>
      <Cabecalho
        titulo="Agenda de prazos"
        subtitulo="Protocolos, retornos, diretrizes, termos, condicionantes, relatórios e prazos da linha do tempo"
        acoes={<a href="/api/agenda" className="btn-primario"><CalendarPlus className="h-4 w-4" /> Adicionar ao Outlook (.ics)</a>}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <section className="cartao p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Link href={navegar(-1)} className="btn-fantasma"><ChevronLeft className="h-4 w-4" /></Link>
            <h2 className="text-lg font-bold capitalize">{MESES[m - 1]} de {ano}</h2>
            <Link href={navegar(1)} className="btn-fantasma"><ChevronRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-ink-soft">
            {DIAS.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((d) => {
              const evs = porDia.get(d) ?? [];
              const doMes = d.startsWith(ref);
              return (
                <div key={d} className={`min-h-[92px] rounded-lg border p-1 ${d === hoje ? "border-brand bg-brand/5" : "border-line"} ${doMes ? "" : "opacity-40"}`}>
                  <div className={`text-right text-xs ${d === hoje ? "font-bold text-brand" : "text-ink-soft"}`}>{Number(d.slice(8))}</div>
                  <div className="space-y-0.5">
                    {evs.slice(0, 3).map((e, i) => (
                      <Link key={i} href={e.href} title={`${e.terreno} · ${e.titulo}`} className="block truncate rounded px-1 text-left text-[10px] font-semibold text-white" style={{ background: COR[e.tipo] }}>
                        {e.terreno || e.titulo}
                      </Link>
                    ))}
                    {evs.length > 3 && <div className="text-[10px] text-ink-soft">+{evs.length - 3}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
            {Object.entries(COR).map(([t, c]) => (
              <span key={t} className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded" style={{ background: c }} />{t}</span>
            ))}
          </div>
        </section>
        <Secao titulo="Janela de 30 dias">
          {proximos.length === 0 ? <Vazio>Nenhum prazo próximo.</Vazio> : (
            <ul className="max-h-[640px] divide-y divide-line overflow-y-auto">
              {proximos.map((e, i) => {
                const dd = diffDias(hoje, e.data);
                return (
                  <li key={i}>
                    <Link href={e.href} className="flex items-start gap-3 py-2 hover:opacity-80">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COR[e.tipo] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{e.terreno || "—"}</span>
                        <span className="block truncate text-xs text-ink-soft">{e.titulo}</span>
                      </span>
                      <span className={`whitespace-nowrap text-right text-xs ${dd < 0 ? "font-bold text-[#B3261E]" : dd <= 7 ? "font-bold text-[#8A5300]" : "text-ink-soft"}`}>
                        {fmtData(e.data)}<br />{dd < 0 ? `${-dd}d atrás` : dd === 0 ? "hoje" : `em ${dd}d`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Secao>
      </div>
    </>
  );
}
