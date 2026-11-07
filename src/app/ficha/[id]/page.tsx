import { notFound } from "next/navigation";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { fmtData, fmtDataHora } from "@/lib/domain/datas";
import { MODULOS, MODULOS_MATRIZ } from "@/lib/domain/modulos";
import { PERGUNTAS, statusProcesso } from "@/lib/domain/regras";
import { COR_STATUS } from "@/lib/tema";
import { Imprimir } from "./imprimir";

export const metadata = { title: "Ficha do terreno" };

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirSessao();
  const { base, resumos, alertas, hoje } = await carregarPainel("todas");
  const r = resumos.find((x) => x.terreno.id === Number(id));
  if (!r) notFound();
  const t = r.terreno;
  const inova = t.unidade === "INOVA BH";
  const cor = inova ? "#0D5A55" : t.unidade === "SAÚDE BH" ? "#6E368C" : "#6F3B8C";
  const fluxo = base.fluxos.find((f) => f.terrenoId === t.id);
  const procs = base.processos.filter((p) => p.terrenoId === t.id);
  const meus = alertas.filter((a) => a.terrenoId === t.id);

  return (
    <div className="mx-auto max-w-[820px] bg-white p-10 text-[13px] text-[#2B2530]" style={{ colorScheme: "light" }}>
      <Imprimir />
      <div className="flex items-start justify-between border-b-4 pb-4" style={{ borderColor: cor }}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#737373]">Central de Diligenciamento · Ficha do terreno</div>
          <h1 className="mt-1 text-2xl font-bold" style={{ color: cor }}>{t.nome}</h1>
          <div className="text-[#5F5868]">{t.unidade ?? "Sem unidade"} · Regional {t.regional ?? "—"} · Etapa: {r.etapa}</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jope-logo.png" alt="JOPE" className="h-12" />
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {[
          ["Risco", `${r.risco} (${r.nivelRisco})`],
          ["Progresso", `${Math.round(r.progresso * 100)}%`],
          ["Prazo de liberação", fmtData(t.prazoLiberacao)],
          ["Liberação prevista", fmtData(r.liberacaoPrevista)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-[#E4E1EA] p-2">
            <div className="text-[10px] font-bold uppercase text-[#737373]">{k}</div>
            <div className="font-bold">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-6 mb-2 font-bold" style={{ color: cor }}>Processos</h2>
      <table className="w-full border-collapse">
        <thead><tr className="text-left text-[10px] uppercase text-[#737373]"><th className="py-1">Módulo</th><th>Protocolo</th><th>Situação</th><th>Status</th><th>Início</th><th>Retorno prev.</th></tr></thead>
        <tbody>
          {MODULOS_MATRIZ.flatMap((m) =>
            procs.filter((p) => p.modulo === m).map((p) => {
              const s = statusProcesso(p, hoje);
              return (
                <tr key={`${m}${p.id}`} className="border-t border-[#E4E1EA]">
                  <td className="py-1 font-bold">{MODULOS[m].sigla}</td><td>{p.titulo}</td><td>{p.situacao ?? "—"}</td>
                  <td><span className="rounded px-1.5 font-semibold" style={{ background: COR_STATUS[s].fundo, color: COR_STATUS[s].texto }}>{s}</span></td>
                  <td>{fmtData(p.dataInicio)}</td><td>{fmtData(p.previsaoRetorno)}</td>
                </tr>
              );
            }),
          )}
          {r.aAbrir.map((m) => (
            <tr key={`abrir${m}`} className="border-t border-[#E4E1EA] text-[#8A5300]"><td className="py-1 font-bold">{MODULOS[m].sigla}</td><td colSpan={5}>Exigido pelo fluxograma — ainda não aberto</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-6 mb-2 font-bold" style={{ color: cor }}>Fluxograma</h2>
      <div className="grid grid-cols-2 gap-x-6">
        {PERGUNTAS.map((p) => (
          <div key={p.chave} className="flex justify-between border-b border-[#E4E1EA] py-1"><span>{p.texto}</span><b>{fluxo?.[p.chave] ?? "—"}</b></div>
        ))}
      </div>

      <h2 className="mt-6 mb-2 font-bold" style={{ color: cor }}>Pendências ({meus.length})</h2>
      {meus.length === 0 ? <p>Nenhuma.</p> : (
        <ul className="list-disc pl-5">
          {meus.map((a) => <li key={a.id}><b>{a.alta ? "[ALTA] " : ""}{a.tipo}</b> — {a.detalhe}</li>)}
        </ul>
      )}
      <p className="mt-8 text-[10px] text-[#737373]">Gerado em {fmtDataHora(new Date().toISOString())} · dados de {base.origem === "sharepoint" ? "SharePoint" : "demonstração"}.</p>
    </div>
  );
}
