import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Layers, ShieldAlert, Sprout } from "lucide-react";
import { Comparativo, Rosca, StatusPorModulo } from "@/components/graficos";
import { Barra, Cabecalho, Kpi, RiscoBadge, Secao, UnidadeTag, Vazio } from "@/components/ui";
import { ListaAlertas } from "@/components/lista-alertas";
import { exigirSessao } from "@/lib/auth";
import { carregarPainel } from "@/lib/data";
import { fmtData, fmtDataHora } from "@/lib/domain/datas";
import { consolidar, filtrarBase, gerarAlertas } from "@/lib/domain/regras";
import { filtroAtual } from "@/lib/filtro";
import { paleta } from "@/lib/tema";

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function Inicio() {
  const sessao = await exigirSessao();
  const filtro = await filtroAtual();
  const { base, completa, alertas, resumos, ind, hoje } = await carregarPainel(filtro);
  const cores = paleta(filtro).cores;

  const emRisco = [...resumos].sort((a, b) => b.risco - a.risco).filter((r) => r.risco > 0).slice(0, 6);
  const etapas = Object.entries(ind.porEtapa).map(([nome, valor]) => ({ nome, valor }));

  // Visão por unidade (só faz sentido sem filtro)
  let comparativo: { indicador: string; inova: number; saude: number }[] | null = null;
  if (filtro === "todas") {
    const calc = (f: "inova" | "saude") => {
      const b = filtrarBase(completa, f);
      const al = gerarAlertas(b, hoje);
      const rs = consolidar(b, hoje, al);
      return {
        terrenos: b.terrenos.length,
        abertos: b.processos.length,
        criticos: al.filter((a) => a.alta).length,
        risco: rs.filter((r) => r.nivelRisco === "Alto").length,
        abrir: rs.reduce((a, r) => a + r.aAbrir.length, 0),
      };
    };
    const i = calc("inova");
    const s = calc("saude");
    comparativo = [
      { indicador: "Terrenos", inova: i.terrenos, saude: s.terrenos },
      { indicador: "Processos", inova: i.abertos, saude: s.abertos },
      { indicador: "Alertas críticos", inova: i.criticos, saude: s.criticos },
      { indicador: "Risco alto", inova: i.risco, saude: s.risco },
      { indicador: "A abrir", inova: i.abrir, saude: s.abrir },
    ];
  }

  const pctMudas = ind.mudasCompensar ? ind.mudasPlantadas / ind.mudasCompensar : 0;

  return (
    <>
      <Cabecalho
        titulo={`${saudacao()}, ${sessao.nome.split(" ")[0]}`}
        subtitulo={
          <>
            Visão {paleta(filtro).nome} · atualizado {fmtDataHora(base.geradoEm)}
            {base.origem === "demo" && " · base de demonstração"}
          </>
        }
        acoes={
          <Link href="/relatorios" className="btn-contorno">
            Exportar relatórios
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi rotulo="Terrenos" valor={ind.terrenos} detalhe={`${resumos.filter((r) => !r.fluxoRespondido).length} sem fluxograma`} icone={<Building2 className="h-5 w-5" />} href="/terrenos" />
        <Kpi rotulo="Processos abertos" valor={ind.abertos} detalhe={`${ind.processos} cadastrados`} icone={<Layers className="h-5 w-5" />} href="/processos" />
        <Kpi rotulo="Concluídos" valor={ind.concluidos} detalhe={`${ind.processos ? Math.round((ind.concluidos / ind.processos) * 100) : 0}% do total`} icone={<CheckCircle2 className="h-5 w-5" />} />
        <Kpi rotulo="Alertas críticos" valor={ind.alertasAltos} detalhe={`${ind.alertas} pendências no total`} icone={<AlertTriangle className="h-5 w-5" />} destaque={ind.alertasAltos ? "perigo" : undefined} href="/alertas" />
        <Kpi rotulo="Risco alto" valor={ind.riscoAlto} detalhe="terrenos com índice ≥ 55" icone={<ShieldAlert className="h-5 w-5" />} destaque={ind.riscoAlto ? "aviso" : undefined} href="/terrenos?ordem=risco" />
        <Kpi rotulo="Compensação" valor={`${Math.round(pctMudas * 100)}%`} detalhe={`${ind.mudasPlantadas.toLocaleString("pt-BR")} de ${ind.mudasCompensar.toLocaleString("pt-BR")} mudas`} icone={<Sprout className="h-5 w-5" />} href="/processos/ambiental" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Secao titulo="Situação por módulo" className="xl:col-span-2">
          {ind.porModulo.length ? <StatusPorModulo dados={ind.porModulo} /> : <Vazio>Sem processos cadastrados.</Vazio>}
        </Secao>
        <Secao titulo="Terrenos por etapa">
          <Rosca dados={etapas} cores={[...cores, "#B5B5B5"]} centro="terrenos" />
        </Secao>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Secao
          titulo="Prioridades de hoje"
          acao={<Link href="/alertas" className="btn-fantasma text-xs">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link>}
        >
          {alertas.length ? <ListaAlertas alertas={alertas.slice(0, 7)} compacta /> : <Vazio>Nenhuma pendência. 🎉</Vazio>}
        </Secao>

        <Secao titulo="Terrenos que exigem atenção" acao={<Link href="/terrenos?ordem=risco" className="btn-fantasma text-xs">Ranking <ArrowRight className="h-3.5 w-3.5" /></Link>}>
          {emRisco.length ? (
            <ul className="divide-y divide-line">
              {emRisco.map((r) => (
                <li key={r.terreno.id}>
                  <Link href={`/terrenos/${r.terreno.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{r.terreno.nome}</span>
                        {filtro === "todas" && <UnidadeTag unidade={r.terreno.unidade} />}
                      </div>
                      <div className="truncate text-xs text-ink-soft">{r.motivosRisco.join(" · ")}</div>
                      <Barra valor={r.progresso} className="mt-1.5 max-w-xs" />
                    </div>
                    <div className="text-right">
                      <RiscoBadge nivel={r.nivelRisco} valor={r.risco} />
                      <div className="mt-1 text-[11px] text-ink-soft">Liberação prev.: {fmtData(r.liberacaoPrevista)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio>Nenhum terreno com risco identificado.</Vazio>
          )}
        </Secao>
      </div>

      {comparativo && (
        <Secao titulo="Visão por unidade" className="mt-6">
          <Comparativo dados={comparativo} />
        </Secao>
      )}
    </>
  );
}
