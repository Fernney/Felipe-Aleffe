import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Cabecalho, Secao, UnidadeTag, Vazio } from "@/components/ui";
import { carregarPainel } from "@/lib/data";
import { MODULOS } from "@/lib/domain/modulos";
import { PERGUNTAS } from "@/lib/domain/regras";
import { filtroAtual } from "@/lib/filtro";

export const metadata = { title: "Fluxograma" };

/** Regras legíveis — espelham a função aplicabilidade() do motor de regras. */
const REGRAS = [
  { se: "Terreno NÃO está parcelado", entao: ["parcelamento"], obs: "Diretrizes e aprovação do parcelamento do solo." },
  { se: "Não parcelado E requer anuência metropolitana", entao: ["armbh"], obs: "Anuência da Agência RMBH vinculada ao parcelamento." },
  { se: "Lote em área de proteção cultural", entao: ["dipc"], obs: "Processo na Diretoria de Patrimônio Cultural." },
  { se: "Supera a altura limite", entao: ["cindacta"], obs: "Pré-análise e processo no CINDACTA." },
  { se: "Possui relevância ambiental", entao: ["gelin", "ambiental"], obs: "Licenciamento GELIN + acompanhamento ambiental (condicionantes)." },
  { se: "Sem relevância ambiental, MAS com supressão", entao: ["geava", "ambiental"], obs: "Autorização GEAVA + termo de compensação." },
  { se: "Possui movimentação de terra", entao: ["amtt"], obs: "Autorização AMTT/GELIOC (bota-fora / empréstimo)." },
  { se: "Sempre", entao: ["alvara", "baixa"], obs: "Alvará de construção e, ao fim da obra, baixa / Habite-se." },
] as const;

export default async function Fluxograma() {
  const { base, resumos } = await carregarPainel(await filtroAtual());
  const fluxos = new Map(base.fluxos.map((f) => [f.terrenoId, f]));
  const semFluxo = resumos.filter((r) => !r.fluxoRespondido);
  const comPendencia = resumos.filter((r) => r.aAbrir.length || r.conflitos.length);

  return (
    <>
      <Cabecalho titulo="Fluxograma de licenciamento" subtitulo="As respostas de cada terreno definem quais processos são exigidos. O sistema compara com o que está cadastrado." />

      <Secao titulo="Regras">
        <div className="space-y-2">
          {REGRAS.map((r, i) => (
            <div key={i} className="grid items-center gap-3 rounded-xl border border-line p-3 md:grid-cols-[1fr_auto_1.2fr]">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{i + 1}</span>
                <span className="text-sm font-semibold">{r.se}</span>
              </div>
              <ArrowRight className="hidden h-5 w-5 text-brand md:block" />
              <div>
                <div className="flex flex-wrap gap-1.5">
                  {r.entao.map((m) => (
                    <Link key={m} href={`/processos/${m}`} className="rounded-lg bg-brand/10 px-2 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white">{MODULOS[m].nome}</Link>
                  ))}
                </div>
                <div className="mt-1 text-xs text-ink-soft">{r.obs}</div>
              </div>
            </div>
          ))}
        </div>
      </Secao>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Secao titulo="Respostas por pergunta">
          <table className="tabela w-full">
            <thead><tr><th>Pergunta</th><th className="!text-right">Sim</th><th className="!text-right">Não</th><th className="!text-right">Sem resposta</th></tr></thead>
            <tbody>
              {PERGUNTAS.map((p) => {
                const vals = base.terrenos.map((t) => fluxos.get(t.id)?.[p.chave] ?? null);
                return (
                  <tr key={p.chave}>
                    <td className="text-sm">{p.texto}</td>
                    <td className="text-right font-bold tabular-nums text-brand">{vals.filter((v) => v === "Sim").length}</td>
                    <td className="text-right tabular-nums">{vals.filter((v) => v === "Não").length}</td>
                    <td className="text-right tabular-nums text-ink-soft">{vals.filter((v) => v == null).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Secao>

        <div className="space-y-6">
          <Secao titulo={`Pendências do fluxograma (${comPendencia.length})`}>
            {comPendencia.length === 0 ? <Vazio>Tudo coerente.</Vazio> : (
              <ul className="divide-y divide-line">
                {comPendencia.map((r) => (
                  <li key={r.terreno.id}>
                    <Link href={`/terrenos/${r.terreno.id}#fluxograma`} className="flex flex-wrap items-center gap-2 py-2 hover:opacity-80">
                      <span className="flex-1 text-sm font-semibold">{r.terreno.nome}</span>
                      {r.aAbrir.map((m) => <span key={m} className="rounded border-2 border-dashed border-[#E0A33A] px-1.5 text-[10px] font-bold text-[#8A5300]">abrir {MODULOS[m].sigla}</span>)}
                      {r.conflitos.map((m) => <span key={m} className="rounded bg-[#B3261E] px-1.5 text-[10px] font-bold text-white">conflito {MODULOS[m].sigla}</span>)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
          <Secao titulo={`Terrenos sem fluxograma (${semFluxo.length})`}>
            {semFluxo.length === 0 ? <Vazio>Todos respondidos.</Vazio> : (
              <ul className="divide-y divide-line">
                {semFluxo.map((r) => (
                  <li key={r.terreno.id} className="flex items-center justify-between py-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">{r.terreno.nome} <UnidadeTag unidade={r.terreno.unidade} /></span>
                    <Link href={`/terrenos/${r.terreno.id}#fluxograma`} className="btn-fantasma text-xs">Responder</Link>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      </div>
    </>
  );
}
