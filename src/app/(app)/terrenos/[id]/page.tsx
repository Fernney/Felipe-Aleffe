import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, MapPin, Printer, User } from "lucide-react";
import { FluxogramaEditor } from "@/components/fluxograma-editor";
import { LinhaDoTempo } from "@/components/linha-do-tempo";
import { ListaAlertas } from "@/components/lista-alertas";
import { Barra, RiscoBadge, Secao, StatusChip, UnidadeTag, Vazio } from "@/components/ui";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { diffDias, fmtData } from "@/lib/domain/datas";
import { MODULOS, MODULOS_MATRIZ } from "@/lib/domain/modulos";
import { duracoesMedianas, previsaoConclusao, statusProcesso } from "@/lib/domain/regras";
import type { ModuloId } from "@/lib/domain/types";

const JORNADA = ["Parcelamento do Solo", "Licenciamento", "Obra", "Operação"] as const;

export default async function DetalheTerreno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await exigirSessao();
  // Detalhe ignora o filtro de unidade: abre qualquer terreno pelo link.
  const { base, resumos, alertas, hoje } = await carregarPainel("todas");
  const r = resumos.find((x) => x.terreno.id === Number(id));
  if (!r) notFound();
  const t = r.terreno;
  const marca = t.unidade === "INOVA BH" ? "inova" : t.unidade === "SAÚDE BH" ? "saude" : undefined;

  const procs = base.processos.filter((p) => p.terrenoId === t.id);
  const chaves = new Set(procs.map((p) => `${p.modulo}:${p.id}`));
  const andamentos = base.andamentos.filter((a) => chaves.has(`${a.modulo}:${a.processoId}`));
  const titulos = new Map(procs.map((p) => [`${p.modulo}:${p.id}`, p.titulo]));
  const meusAlertas = alertas.filter((a) => a.terrenoId === t.id);
  const meds = duracoesMedianas(base);
  const etapaIdx = JORNADA.indexOf(r.etapa as (typeof JORNADA)[number]);
  const end = t.endereco;
  const endTexto = end ? [end.logradouro && `${end.logradouro}${end.numero ? `, ${end.numero}` : ""}`, end.bairro, end.cidade && `${end.cidade}/${end.uf ?? ""}`].filter(Boolean).join(" · ") : null;
  const mapa = end?.logradouro ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([end.logradouro, end.numero, end.bairro, end.cidade, end.uf].filter(Boolean).join(", "))}` : null;
  const folga = r.liberacaoPrevista && t.prazoLiberacao ? diffDias(r.liberacaoPrevista, t.prazoLiberacao) : null;

  return (
    <div data-brand={marca}>
      <Link href="/terrenos" className="btn-fantasma -ml-3 mb-2 nao-imprimir"><ArrowLeft className="h-4 w-4" /> Terrenos</Link>

      <div className="cartao relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-brand-2 to-brand-muted" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="titulo-pagina">{t.nome}</h1>
              <UnidadeTag unidade={t.unidade} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
              {endTexto && (
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />
                  {mapa ? <a href={mapa} target="_blank" rel="noreferrer" className="hover:text-brand hover:underline">{endTexto}</a> : endTexto}
                </span>
              )}
              {t.responsavel && <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{t.responsavel}</span>}
              <span>Regional: {t.regional ?? "Sem IBED"}</span>
              {t.origemDemanda && <span>Origem: {t.origemDemanda}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RiscoBadge nivel={r.nivelRisco} valor={r.risco} />
            <a href={`/ficha/${t.id}`} target="_blank" className="btn-contorno nao-imprimir"><Printer className="h-4 w-4" /> Ficha PDF</a>
          </div>
        </div>

        {/* Jornada do empreendimento */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {JORNADA.map((e, i) => {
            const feito = etapaIdx > i;
            const atual = etapaIdx === i;
            return (
              <div key={e}>
                <div className={`h-2 rounded-full ${feito ? "bg-brand" : atual ? "bg-gradient-to-r from-brand to-brand-3" : "bg-line"}`} />
                <div className={`mt-1.5 text-[10px] leading-tight sm:text-xs ${atual ? "font-bold text-brand" : feito ? "font-semibold" : "text-ink-soft"}`}>{e}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="rotulo">Progresso dos processos exigidos</div>
            <Barra valor={r.progresso} />
          </div>
          <div>
            <div className="rotulo">Prazo de liberação</div>
            <div className="text-sm font-semibold">{fmtData(t.prazoLiberacao)}</div>
          </div>
          <div>
            <div className="rotulo">Liberação prevista</div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-brand" /> {fmtData(r.liberacaoPrevista)}
              {folga != null && (
                <span className={`text-xs ${folga < 0 ? "text-[#B3261E]" : "text-[#0B6B66]"}`}>
                  ({folga < 0 ? `${-folga} dias de atraso` : `${folga} dias de folga`})
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="rotulo">Entrega da obra (prev.)</div>
            <div className="text-sm font-semibold">{fmtData(t.previsaoEntrega)}</div>
          </div>
        </div>
        {r.motivosRisco.length > 0 && (
          <div className="mt-4 rounded-xl bg-bg p-3 text-xs text-ink-soft">
            <span className="font-bold text-ink">Por que este risco: </span>
            {r.motivosRisco.join(" · ")}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Secao titulo="Processos por módulo" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            {[...MODULOS_MATRIZ, "armbh" as ModuloId].map((m) => {
              const c = r.modulos[m];
              const lista = procs.filter((p) => p.modulo === m);
              if (!lista.length && !c.aplicavel) return null;
              return (
                <div key={m} className={`rounded-xl border p-3 ${c.situacao === "conflito" ? "border-[#B3261E]" : c.situacao === "a-abrir" ? "border-dashed border-[#E0A33A]" : "border-line"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{MODULOS[m].nome}</span>
                    <span className="text-[11px] font-bold text-brand">{MODULOS[m].sigla}</span>
                  </div>
                  {!lista.length ? (
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-[#8A5300]">Exigido pelo fluxograma — ainda não aberto</span>
                      {sessao.podeEditar && <Link className="font-semibold text-brand hover:underline" href={`/processos/${m}/novo?terreno=${t.id}`}>Abrir</Link>}
                    </div>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {lista.map((p) => {
                        const prev = previsaoConclusao(p, meds);
                        const st = statusProcesso(p, hoje);
                        return (
                          <li key={p.id}>
                            <Link href={`/processos/${m}/${p.id}`} className="block rounded-lg p-1.5 hover:bg-brand/5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm">{p.titulo}</span>
                                <StatusChip status={st} compacto />
                              </div>
                              <div className="mt-0.5 text-[11px] text-ink-soft">
                                {p.situacao ?? "Sem situação"}
                                {st !== "Concluído" && prev && ` · conclusão prevista ${fmtData(prev)}`}
                                {c.situacao === "conflito" && <span className="font-bold text-[#B3261E]"> · fluxograma diz que não se aplica</span>}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Secao>

        <Secao titulo={`Alertas (${meusAlertas.length})`}>
          {meusAlertas.length ? <ListaAlertas alertas={meusAlertas} compacta /> : <Vazio>Sem pendências.</Vazio>}
        </Secao>
      </div>

      <div id="fluxograma" className="mt-6 scroll-mt-24">
        <Secao titulo="Fluxograma do terreno">
          <FluxogramaEditor
            terrenoId={t.id}
            fluxo={base.fluxos.find((f) => f.terrenoId === t.id) ?? null}
            cadastrados={[...new Set(procs.map((p) => p.modulo))]}
            podeEditar={sessao.podeEditar}
          />
        </Secao>
      </div>

      <Secao titulo="Linha do tempo unificada" className="mt-6">
        <LinhaDoTempo itens={andamentos} hoje={hoje} mostrarModulo titulos={titulos} />
      </Secao>
    </div>
  );
}
