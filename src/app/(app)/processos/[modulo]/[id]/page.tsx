import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { FormularioProcesso, NovoAndamento } from "@/components/form-processo";
import { LinhaDoTempo } from "@/components/linha-do-tempo";
import { ListaAlertas } from "@/components/lista-alertas";
import { Secao, StatusChip, UnidadeTag } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { diffDias, fmtData } from "@/lib/domain/datas";
import { MODULOS, moduloValido } from "@/lib/domain/modulos";
import { duracoesMedianas, normalizarStatus, previsaoConclusao, statusProcesso } from "@/lib/domain/regras";
import { opcoesVinculo } from "@/lib/vinculos";

export default async function DetalheProcesso({ params }: { params: Promise<{ modulo: string; id: string }> }) {
  const { modulo, id } = await params;
  if (!moduloValido(modulo)) notFound();
  const sessao = await exigirSessao();
  const { base, alertas, hoje } = await carregarPainel("todas");
  const p = base.processos.find((x) => x.modulo === modulo && x.id === Number(id));
  if (!p) notFound();
  const def = MODULOS[modulo];
  const t = p.terrenoId ? base.terrenos.find((x) => x.id === p.terrenoId) : undefined;
  const marca = t?.unidade === "INOVA BH" ? "inova" : t?.unidade === "SAÚDE BH" ? "saude" : undefined;
  const st = statusProcesso(p, hoje);
  const meds = duracoesMedianas(base);
  const prev = st === "Concluído" || st === "Bloqueado" ? null : previsaoConclusao(p, meds);
  const andamentos = base.andamentos.filter((a) => a.modulo === modulo && a.processoId === p.id);
  const meusAlertas = alertas.filter((a) => a.href === `/processos/${modulo}/${p.id}`);
  const decorridos = p.dataInicio ? diffDias(p.dataInicio, p.dataTermino ?? hoje) : null;
  const condicionantes = modulo === "ambiental" ? base.condicionantes.filter((c) => c.ambientalId === p.id) : [];
  const relatorios = modulo === "ambiental" ? base.relatorios.filter((r) => r.ambientalId === p.id) : [];

  return (
    <div data-brand={marca}>
      <Link href={`/processos/${modulo}`} className="btn-fantasma -ml-3 mb-2"><ArrowLeft className="h-4 w-4" /> {def.nome}</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-brand">{def.sigla} · {def.lista}</div>
          <h1 className="titulo-pagina">{p.titulo}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            {t ? <Link href={`/terrenos/${t.id}`} className="font-semibold text-ink hover:text-brand">{t.nome}</Link> : <span>Sem terreno vinculado</span>}
            {t && <UnidadeTag unidade={t.unidade} />}
            {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand"><ExternalLink className="h-3.5 w-3.5" /> Abrir link</a>}
          </div>
        </div>
        <StatusChip status={st} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cartao p-4"><div className="rotulo">Situação</div><div className="font-semibold">{p.situacao ?? "—"}</div></div>
        <div className="cartao p-4"><div className="rotulo">Tempo decorrido</div><div className="font-semibold">{decorridos != null ? `${decorridos} dias` : "—"}</div></div>
        <div className="cartao p-4">
          <div className="rotulo">Conclusão prevista</div>
          <div className="flex items-center gap-1.5 font-semibold"><Sparkles className="h-4 w-4 text-brand" />{prev ? fmtData(prev) : st === "Concluído" ? fmtData(p.dataTermino) : "—"}</div>
          {prev && !p.previsaoRetorno && meds[modulo] != null && <div className="text-[11px] text-ink-soft">pela mediana de {meds[modulo]} dias do histórico</div>}
        </div>
        <div className="cartao p-4"><div className="rotulo">Última atualização</div><div className="font-semibold">{fmtData(p.dataAtualizacao)}</div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Secao titulo="Dados do processo" className="xl:col-span-2">
          <FormularioProcesso
            modulo={modulo}
            processo={p}
            terrenos={base.terrenos.map((x) => ({ id: x.id, nome: x.nome }))}
            vinculos={opcoesVinculo(base)}
            podeEditar={sessao.podeEditar}
          />
        </Secao>
        <div className="space-y-6">
          {meusAlertas.length > 0 && (
            <Secao titulo="Alertas deste processo"><ListaAlertas alertas={meusAlertas} compacta /></Secao>
          )}
          {condicionantes.length > 0 && (
            <Secao titulo="Condicionantes">
              <ul className="space-y-2 text-sm">
                {condicionantes.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 border-b border-line pb-2">
                    <div><b>Item {c.item}</b> · {c.condicionante}<div className={`text-xs ${c.prazo && c.prazo < hoje && normalizarStatus(c.status) !== "Concluído" ? "font-bold text-[#B3261E]" : "text-ink-soft"}`}>Prazo {fmtData(c.prazo)}</div></div>
                    <StatusChip status={normalizarStatus(c.status)} compacto />
                  </li>
                ))}
              </ul>
            </Secao>
          )}
          {relatorios.length > 0 && (
            <Secao titulo="Relatórios de monitoramento">
              <ul className="space-y-2 text-sm">
                {relatorios.map((r) => (
                  <li key={r.id} className="flex justify-between border-b border-line pb-2">
                    <span>{r.nome}</span>
                    <span className={`text-xs ${!r.real && r.prevista && r.prevista < hoje ? "font-bold text-[#B3261E]" : "text-ink-soft"}`}>
                      {r.real ? `entregue ${fmtData(r.real)}` : `previsto ${fmtData(r.prevista)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          )}
        </div>
      </div>

      {def.linhaDoTempo && (
        <Secao titulo="Linha do tempo" className="mt-6">
          {sessao.podeEditar && <NovoAndamento modulo={modulo} processoId={p.id} />}
          <LinhaDoTempo itens={andamentos} hoje={hoje} />
        </Secao>
      )}
    </div>
  );
}
