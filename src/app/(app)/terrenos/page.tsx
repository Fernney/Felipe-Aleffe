import Link from "next/link";
import { CelulaMatriz, LegendaMatriz } from "@/components/celula-modulo";
import { Barra, Cabecalho, RiscoBadge, UnidadeTag, Vazio } from "@/components/ui";
import { carregarPainel } from "@/lib/data";
import { fmtData } from "@/lib/domain/datas";
import { MODULOS, MODULOS_MATRIZ } from "@/lib/domain/modulos";
import { filtroAtual } from "@/lib/filtro";

export const metadata = { title: "Terrenos" };

const ETAPAS = ["Não informado", "Parcelamento do Solo", "Licenciamento", "Obra", "Operação"];

export default async function Terrenos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filtro = await filtroAtual();
  const { resumos } = await carregarPainel(filtro);

  const q = (sp.q ?? "").trim().toLowerCase();
  const ordem = sp.ordem ?? "nome";
  let lista = resumos.filter((r) => {
    if (sp.etapa && r.etapa !== sp.etapa) return false;
    if (sp.risco && r.nivelRisco !== sp.risco) return false;
    if (sp.pend === "abrir" && !r.aAbrir.length) return false;
    if (sp.pend === "conflito" && !r.conflitos.length) return false;
    if (sp.pend === "fluxo" && r.fluxoRespondido) return false;
    if (!q) return true;
    const alvo = [r.terreno.nome, r.terreno.regional, r.terreno.responsavel, r.terreno.endereco?.bairro].join(" ").toLowerCase();
    return alvo.includes(q);
  });
  lista = lista.sort((a, b) =>
    ordem === "risco" ? b.risco - a.risco : ordem === "progresso" ? b.progresso - a.progresso : a.terreno.nome.localeCompare(b.terreno.nome, "pt-BR"),
  );

  return (
    <>
      <Cabecalho titulo="Terrenos" subtitulo={`${lista.length} de ${resumos.length} terrenos · matriz de processos por módulo`} />

      <form className="cartao mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" action="/terrenos">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por nome, regional, bairro, responsável…" className="campo lg:col-span-2" />
        <select name="etapa" defaultValue={sp.etapa ?? ""} className="campo">
          <option value="">Todas as etapas</option>
          {ETAPAS.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select name="risco" defaultValue={sp.risco ?? ""} className="campo">
          <option value="">Qualquer risco</option>
          <option>Alto</option>
          <option>Médio</option>
          <option>Baixo</option>
        </select>
        <select name="pend" defaultValue={sp.pend ?? ""} className="campo">
          <option value="">Todas as situações</option>
          <option value="abrir">Com processo a abrir</option>
          <option value="conflito">Com conflito no fluxograma</option>
          <option value="fluxo">Sem fluxograma</option>
        </select>
        <div className="flex gap-2">
          <select name="ordem" defaultValue={ordem} className="campo">
            <option value="nome">Ordem: nome</option>
            <option value="risco">Ordem: risco</option>
            <option value="progresso">Ordem: progresso</option>
          </select>
          <button className="btn-primario">Filtrar</button>
        </div>
      </form>

      <div className="mb-3"><LegendaMatriz /></div>

      {lista.length === 0 ? (
        <Vazio>Nenhum terreno encontrado com esses filtros.</Vazio>
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="tabela w-full min-w-[1100px]">
            <thead>
              <tr>
                <th>Terreno</th>
                <th>Etapa</th>
                {MODULOS_MATRIZ.map((m) => (
                  <th key={m} className="!text-center" title={MODULOS[m].nome}>{MODULOS[m].sigla}</th>
                ))}
                <th>Progresso</th>
                <th>Risco</th>
                <th>Liberação prev.</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.terreno.id}>
                  <td>
                    <Link href={`/terrenos/${r.terreno.id}`} className="font-semibold hover:text-brand">{r.terreno.nome}</Link>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                      {filtro === "todas" && <UnidadeTag unidade={r.terreno.unidade} />}
                      {r.terreno.regional ?? "Sem IBED"}
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-xs">{r.etapa}</td>
                  {MODULOS_MATRIZ.map((m) => (
                    <td key={m} className="text-center"><CelulaMatriz c={r.modulos[m]} /></td>
                  ))}
                  <td className="w-40"><Barra valor={r.progresso} /></td>
                  <td><RiscoBadge nivel={r.nivelRisco} valor={r.risco} /></td>
                  <td className="whitespace-nowrap text-xs tabular-nums">
                    {fmtData(r.liberacaoPrevista)}
                    {r.terreno.prazoLiberacao && r.liberacaoPrevista && r.liberacaoPrevista > r.terreno.prazoLiberacao && (
                      <div className="font-semibold text-[#B3261E]">após o prazo</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
