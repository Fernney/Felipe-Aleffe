"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Save, Wand2 } from "lucide-react";
import { criarProcessosFaltantes, salvarFluxo } from "@/app/(app)/acoes";
import { MODULOS } from "@/lib/domain/modulos";
import { aplicabilidade, PERGUNTAS } from "@/lib/domain/regras";
import type { Fluxo, ModuloId, SimNao } from "@/lib/domain/types";

interface Props {
  terrenoId: number;
  fluxo: Fluxo | null;
  cadastrados: ModuloId[];
  podeEditar: boolean;
}

const EXIBIR: ModuloId[] = ["parcelamento", "armbh", "dipc", "cindacta", "gelin", "geava", "amtt", "ambiental", "alvara", "baixa"];

export function FluxogramaEditor({ terrenoId, fluxo, cadastrados, podeEditar }: Props) {
  const inicial: Fluxo = fluxo ?? {
    id: null, terrenoId, parcelado: null, armbh: null, cultural: null, altura: null, relevancia: null, supressao: null, movTerra: null, eas: null,
  };
  const [f, setF] = useState<Fluxo>(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const alterado = JSON.stringify(f) !== JSON.stringify(inicial);
  const apl = useMemo(() => aplicabilidade(f), [f]);
  const respondidas = PERGUNTAS.filter((p) => f[p.chave] != null).length;

  const faltantes = EXIBIR.filter((m) => apl?.[m] && !cadastrados.includes(m) && ["parcelamento", "dipc", "cindacta", "gelin", "geava", "amtt"].includes(m));

  const definir = (chave: keyof Fluxo, v: SimNao) => setF((x) => ({ ...x, [chave]: x[chave] === v ? null : v }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <div className="mb-3 text-xs text-ink-soft">{respondidas} de {PERGUNTAS.length} respondidas</div>
        <ol className="space-y-2">
          {PERGUNTAS.map((p, i) => (
            <li key={p.chave} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{p.texto}</div>
                <div className="text-xs text-ink-soft">{p.ajuda}</div>
              </div>
              <div className="flex overflow-hidden rounded-lg border border-line text-xs font-bold">
                {(["Sim", "Não"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!podeEditar}
                    onClick={() => definir(p.chave, v)}
                    className={`px-3.5 py-1.5 transition ${f[p.chave] === v ? (v === "Sim" ? "bg-brand text-white" : "bg-brand-muted text-white") : "hover:bg-brand/10"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {podeEditar && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              disabled={!alterado || pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvarFluxo(f);
                  setMsg(r.ok ? { ok: true, texto: r.mensagem ?? "Salvo." } : { ok: false, texto: r.erro });
                })
              }
              className="btn-primario"
            >
              <Save className="h-4 w-4" /> Salvar respostas
            </button>
            {msg && <span className={`text-sm ${msg.ok ? "text-[#0B6B66]" : "text-[#B3261E]"}`}>{msg.texto}</span>}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="rounded-xl bg-brand/5 p-4">
          <div className="mb-3 text-sm font-bold">Resultado do fluxograma</div>
          {!apl ? (
            <p className="text-sm text-ink-soft">Responda as perguntas para ver quais processos são exigidos.</p>
          ) : (
            <ul className="space-y-1.5">
              {EXIBIR.map((m) => {
                const exige = apl[m];
                const tem = cadastrados.includes(m);
                return (
                  <li key={m} className="flex items-center gap-2 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${exige ? "bg-brand text-white" : "bg-line text-ink-soft"}`}>
                      {exige ? <Check className="h-3 w-3" /> : "—"}
                    </span>
                    <span className={exige ? "font-semibold" : "text-ink-soft line-through"}>{MODULOS[m].nome}</span>
                    <span className="ml-auto text-[11px]">
                      {exige && tem && <span className="text-[#0B6B66]">cadastrado</span>}
                      {exige && !tem && m !== "alvara" && m !== "baixa" && m !== "ambiental" && m !== "armbh" && <span className="font-bold text-[#8A5300]">a abrir</span>}
                      {!exige && tem && <span className="font-bold text-[#B3261E]">conflito</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {podeEditar && faltantes.length > 0 && !alterado && (
            <button
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await criarProcessosFaltantes(terrenoId);
                  setMsg(r.ok ? { ok: true, texto: r.mensagem ?? "Pronto." } : { ok: false, texto: r.erro });
                })
              }
              className="btn-primario mt-4 w-full justify-center"
            >
              <Wand2 className="h-4 w-4" /> Abrir {faltantes.length} processo(s) automaticamente
            </button>
          )}
          {alterado && faltantes.length > 0 && <p className="mt-3 text-xs text-ink-soft">Salve as respostas para abrir os processos exigidos.</p>}
        </div>
      </div>
    </div>
  );
}
