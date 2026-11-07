"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { criarProcesso, registrarAndamento, salvarProcesso, type FormProcesso } from "@/app/(app)/acoes";
import { MODULOS, SITUACOES } from "@/lib/domain/modulos";
import type { ModuloId, Processo } from "@/lib/domain/types";

export type OpcoesVinculo = Record<string, { id: number; rotulo: string }[]>;

interface Props {
  modulo: ModuloId;
  processo?: Processo;
  terrenos: { id: number; nome: string }[];
  terrenoInicial?: number | null;
  vinculos: OpcoesVinculo;
  podeEditar: boolean;
}

export function FormularioProcesso({ modulo, processo, terrenos, terrenoInicial, vinculos, podeEditar }: Props) {
  const def = MODULOS[modulo];
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [terrenoId, setTerrenoId] = useState<number | null>(processo?.terrenoId ?? terrenoInicial ?? null);
  const [v, setV] = useState<FormProcesso>({
    titulo: processo?.titulo ?? "",
    situacao: processo?.situacao ?? "Não Iniciada",
    acao: processo?.acao ?? "",
    dataInicio: processo?.dataInicio ?? "",
    dataLimiteProtocolo: processo?.dataLimiteProtocolo ?? "",
    previsaoRetorno: processo?.previsaoRetorno ?? "",
    dataTermino: processo?.dataTermino ?? "",
    link: processo?.link ?? "",
    comentarios: processo?.comentarios ?? "",
    extras: { ...(processo?.extras ?? {}) },
  });
  const set = (k: keyof FormProcesso, val: string) => setV((x) => ({ ...x, [k]: val }));
  const setExtra = (k: string, val: string) => setV((x) => ({ ...x, extras: { ...x.extras, [k]: val } }));
  const situacoes = [...new Set([...(processo?.situacao ? [processo.situacao] : []), ...SITUACOES])];
  const desab = !podeEditar || pendente;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      if (processo) {
        const r = await salvarProcesso(modulo, processo.id, v);
        setMsg(r.ok ? { ok: true, texto: r.mensagem ?? "Salvo." } : { ok: false, texto: r.erro });
        if (r.ok) router.refresh();
      } else {
        const r = await criarProcesso(modulo, terrenoId, v);
        if (r.ok && r.id) router.push(`/processos/${modulo}/${r.id}`);
        else setMsg({ ok: false, texto: r.ok ? "Erro" : r.erro });
      }
    });
  };

  const Data = ({ k, rotulo }: { k: "dataInicio" | "dataLimiteProtocolo" | "previsaoRetorno" | "dataTermino"; rotulo: string }) =>
    k in def.sp || (k === "dataInicio" && def.sp.dataInicio) ? (
      <label>
        <span className="rotulo">{rotulo}</span>
        <input type="date" disabled={desab} value={(v[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} className="campo" />
      </label>
    ) : null;

  return (
    <form onSubmit={enviar} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="rotulo">{def.rotuloTitulo} *</span>
          <input required disabled={desab} value={v.titulo} onChange={(e) => set("titulo", e.target.value)} className="campo" />
        </label>
        {def.sp.terreno && (
          <label>
            <span className="rotulo">Terreno</span>
            <select disabled={desab || !!processo} value={terrenoId ?? ""} onChange={(e) => setTerrenoId(e.target.value ? Number(e.target.value) : null)} className="campo">
              <option value="">— Sem terreno —</option>
              {terrenos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </label>
        )}
        {def.sp.situacao && (
          <label>
            <span className="rotulo">Situação</span>
            <select disabled={desab} value={v.situacao ?? ""} onChange={(e) => set("situacao", e.target.value)} className="campo">
              {situacoes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        {def.sp.acao && (
          <label>
            <span className="rotulo">Próxima ação</span>
            <input disabled={desab} value={v.acao ?? ""} onChange={(e) => set("acao", e.target.value)} className="campo" placeholder="Ex.: Protocolar, Responder exigência…" />
          </label>
        )}
        {def.sp.link && (
          <label>
            <span className="rotulo">Link</span>
            <input type="url" disabled={desab} value={v.link ?? ""} onChange={(e) => set("link", e.target.value)} className="campo" placeholder="https://" />
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Data k="dataInicio" rotulo="Data de início" />
        <Data k="dataLimiteProtocolo" rotulo="Limite de protocolo" />
        <Data k="previsaoRetorno" rotulo="Previsão de retorno" />
        <Data k="dataTermino" rotulo={modulo === "alvara" ? "Data de emissão" : "Data de término"} />
      </div>

      {def.extras.length > 0 && (
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 text-xs font-bold uppercase tracking-wide text-brand">Campos de {def.nome}</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {def.extras.map((e) => {
              const val = v.extras?.[e.chave];
              const opcoes = vinculos[e.chave];
              return (
                <label key={e.chave}>
                  <span className="rotulo">{e.rotulo}</span>
                  {opcoes ? (
                    <select disabled={desab} value={val ?? ""} onChange={(ev) => setExtra(e.chave, ev.target.value)} className="campo">
                      <option value="">—</option>
                      {opcoes.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
                    </select>
                  ) : (
                    <input
                      disabled={desab}
                      type={e.tipo === "data" ? "date" : e.tipo === "numero" ? "number" : "text"}
                      value={val ?? ""}
                      onChange={(ev) => setExtra(e.chave, ev.target.value)}
                      className="campo"
                    />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {def.sp.comentarios && (
        <label className="block">
          <span className="rotulo">Comentários</span>
          <textarea disabled={desab} rows={3} value={v.comentarios ?? ""} onChange={(e) => set("comentarios", e.target.value)} className="campo" />
        </label>
      )}

      {podeEditar ? (
        <div className="flex items-center gap-3">
          <button disabled={pendente} className="btn-primario"><Save className="h-4 w-4" /> {processo ? "Salvar alterações" : "Cadastrar"}</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-[#0B6B66]" : "text-[#B3261E]"}`}>{msg.texto}</span>}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">Seu perfil é de consulta: os campos estão somente para leitura.</p>
      )}
    </form>
  );
}

export function NovoAndamento({ modulo, processoId }: { modulo: ModuloId; processoId: number }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [a, setA] = useState({ acao: "", comentario: "", prazoAtendimento: "" });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await registrarAndamento(modulo, processoId, { ...a, comentario: a.comentario || null });
          if (r.ok) {
            setA({ acao: "", comentario: "", prazoAtendimento: "" });
            setErro(null);
            router.refresh();
          } else setErro(r.erro);
        });
      }}
      className="mb-6 grid gap-3 rounded-xl bg-bg p-4 md:grid-cols-4"
    >
      <input required value={a.acao} onChange={(e) => setA({ ...a, acao: e.target.value })} placeholder="O que aconteceu? (ex.: Exigência recebida)" className="campo md:col-span-2" />
      <label className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs text-ink-soft">Prazo</span>
        <input type="date" value={a.prazoAtendimento} onChange={(e) => setA({ ...a, prazoAtendimento: e.target.value })} className="campo" />
      </label>
      <button disabled={pendente} className="btn-primario justify-center">Registrar</button>
      <textarea value={a.comentario} onChange={(e) => setA({ ...a, comentario: e.target.value })} placeholder="Comentário (opcional)" rows={2} className="campo md:col-span-4" />
      {erro && <p className="text-sm text-[#B3261E] md:col-span-4">{erro}</p>}
    </form>
  );
}
