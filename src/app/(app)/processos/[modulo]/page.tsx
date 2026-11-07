import Link from "next/link";
import { notFound } from "next/navigation";
import { Columns3, Download, Plus, Table2 } from "lucide-react";
import { Kanban } from "@/components/kanban";
import { Cabecalho, StatusChip, UnidadeTag, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { fmtData } from "@/lib/domain/datas";
import { MODULOS, moduloValido } from "@/lib/domain/modulos";
import { duracoesMedianas, previsaoConclusao, statusProcesso } from "@/lib/domain/regras";
import { filtroAtual } from "@/lib/filtro";

export default async function ListaModulo({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { modulo } = await params;
  if (!moduloValido(modulo)) notFound();
  const sp = await searchParams;
  const sessao = await exigirSessao();
  const filtro = await filtroAtual();
  const { base, hoje } = await carregarPainel(filtro);
  const def = MODULOS[modulo];
  const meds = duracoesMedianas(base);
  const terrenos = new Map(base.terrenos.map((t) => [t.id, t]));
  const visao = sp.v === "quadro" ? "quadro" : "tabela";
  const q = (sp.q ?? "").toLowerCase();

  const procs = base.processos
    .filter((p) => p.modulo === modulo)
    .filter((p) => !q || `${p.titulo} ${terrenos.get(p.terrenoId ?? -1)?.nome ?? ""} ${p.situacao ?? ""}`.toLowerCase().includes(q))
    .map((p) => {
      const st = statusProcesso(p, hoje);
      const prev = st === "Concluído" || st === "Bloqueado" ? null : previsaoConclusao(p, meds);
      const prazo = [p.dataLimiteProtocolo, p.previsaoRetorno].filter(Boolean).sort()[0] ?? null;
      return { p, st, prev, prazo, terreno: p.terrenoId ? terrenos.get(p.terrenoId) : undefined };
    })
    .sort((a, b) => (a.terreno?.nome ?? "~").localeCompare(b.terreno?.nome ?? "~", "pt-BR"));

  const med = meds[modulo];

  return (
    <>
      <Cabecalho
        titulo={def.nome}
        subtitulo={
          <>
            {def.descricao} · {procs.length} registro(s) · lista “{def.lista}”
            {med != null && <> · duração mediana histórica: <b>{med} dias</b></>}
          </>
        }
        acoes={
          <>
            <div className="flex rounded-xl border border-line bg-card p-1">
              <Link href={`?v=tabela${q ? `&q=${q}` : ""}`} className={`btn px-3 py-1.5 ${visao === "tabela" ? "bg-brand text-white" : "text-ink-soft"}`}><Table2 className="h-4 w-4" /> Tabela</Link>
              <Link href={`?v=quadro${q ? `&q=${q}` : ""}`} className={`btn px-3 py-1.5 ${visao === "quadro" ? "bg-brand text-white" : "text-ink-soft"}`}><Columns3 className="h-4 w-4" /> Quadro</Link>
            </div>
            <a href={`/api/exportar/modulo?modulo=${modulo}&formato=xlsx`} className="btn-contorno"><Download className="h-4 w-4" /> Excel</a>
            {sessao.podeEditar && <Link href={`/processos/${modulo}/novo`} className="btn-primario"><Plus className="h-4 w-4" /> Novo</Link>}
          </>
        }
      />

      <form className="mb-4" action="">
        <input type="hidden" name="v" value={visao} />
        <input name="q" defaultValue={sp.q} placeholder={`Buscar em ${def.nome}…`} className="campo max-w-md" />
      </form>

      {procs.length === 0 ? (
        <Vazio>Nenhum registro.</Vazio>
      ) : visao === "quadro" ? (
        <Kanban
          modulo={modulo}
          podeMover={sessao.podeEditar && modulo !== "baixa"}
          cartoes={procs.map(({ p, st, prazo, terreno }) => ({
            id: p.id,
            titulo: p.titulo,
            terreno: terreno?.nome ?? "Sem terreno",
            status: st,
            situacao: p.situacao,
            prazo,
            atrasado: !!prazo && prazo < hoje,
          }))}
        />
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="tabela w-full min-w-[960px]">
            <thead>
              <tr>
                <th>{def.rotuloTitulo}</th>
                <th>Terreno</th>
                <th>Status</th>
                <th>Ação</th>
                <th>Limite protocolo</th>
                <th>Previsão retorno</th>
                <th>Conclusão prevista</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {procs.map(({ p, st, prev, terreno }) => (
                <tr key={p.id}>
                  <td><Link href={`/processos/${modulo}/${p.id}`} className="font-semibold hover:text-brand">{p.titulo}</Link></td>
                  <td>
                    {terreno ? (
                      <Link href={`/terrenos/${terreno.id}`} className="hover:text-brand">{terreno.nome}</Link>
                    ) : (
                      <span className="text-ink-soft">Não vinculado</span>
                    )}
                    {filtro === "todas" && terreno && <div className="mt-0.5"><UnidadeTag unidade={terreno.unidade} /></div>}
                  </td>
                  <td>
                    <StatusChip status={st} compacto />
                    <div className="mt-0.5 text-[11px] text-ink-soft">{p.situacao}</div>
                  </td>
                  <td className="text-xs">{p.acao ?? "—"}</td>
                  <td className={`text-xs tabular-nums ${p.dataLimiteProtocolo && p.dataLimiteProtocolo < hoje && st !== "Concluído" ? "font-bold text-[#B3261E]" : ""}`}>{fmtData(p.dataLimiteProtocolo)}</td>
                  <td className="text-xs tabular-nums">{fmtData(p.previsaoRetorno)}</td>
                  <td className={`text-xs tabular-nums ${prev && prev < hoje ? "font-bold text-[#8A5300]" : ""}`}>{prev ? fmtData(prev) : "—"}</td>
                  <td className="text-xs tabular-nums text-ink-soft">{fmtData(p.dataAtualizacao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
