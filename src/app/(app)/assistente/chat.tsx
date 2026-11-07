"use client";

import { Fragment, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGESTOES = [
  "Quais terrenos têm maior risco e por quê?",
  "O que vence nos próximos 15 dias?",
  "Quais processos o fluxograma exige e ainda não foram abertos?",
  "Faça um resumo executivo para a reunião de diretoria.",
  "Compare INOVA BH e SAÚDE BH.",
];

/** Renderiza **negrito**, _itálico_ e listas sem injetar HTML. */
function Texto({ t }: { t: string }) {
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).map((p, i) =>
      p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>,
    );
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {t.split("\n").map((l, i) => {
        const h = l.match(/^#{1,4}\s+(.*)/);
        if (h) return <div key={i} className="pt-1 font-bold">{inline(h[1])}</div>;
        const li = l.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)/);
        if (li) return <div key={i} className="flex gap-2 pl-1"><span className="text-brand">•</span><span>{inline(li[1])}</span></div>;
        return l.trim() ? <p key={i}>{inline(l)}</p> : null;
      })}
    </div>
  );
}

export function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  const enviar = async (pergunta: string) => {
    if (!pergunta.trim() || carregando) return;
    const novas: Msg[] = [...msgs, { role: "user", content: pergunta.trim() }];
    setMsgs(novas);
    setTexto("");
    setCarregando(true);
    try {
      const r = await fetch("/api/assistente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mensagens: novas.slice(-20) }) });
      const j = await r.json();
      setMsgs([...novas, { role: "assistant", content: j.resposta ?? j.erro ?? "Erro." }]);
    } catch {
      setMsgs([...novas, { role: "assistant", content: "Não foi possível responder agora." }]);
    } finally {
      setCarregando(false);
      setTimeout(() => fim.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div className="cartao flex h-[calc(100vh-220px)] min-h-[480px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {msgs.length === 0 && (
          <div className="mx-auto max-w-xl pt-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-jope-roxo via-jope-azul to-jope-agua text-white">
              <Bot className="h-7 w-7" />
            </div>
            <p className="mt-3 text-sm text-ink-soft">Experimente:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => enviar(s)} className="rounded-full border border-line px-3 py-1.5 text-xs hover:border-brand hover:text-brand">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-brand text-white" : "bg-brand/10 text-brand"}`}>
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-brand text-white" : "bg-bg"}`}>
              {m.role === "user" ? <p className="text-sm">{m.content}</p> : <Texto t={m.content} />}
            </div>
          </div>
        ))}
        {carregando && <div className="text-sm text-ink-soft">Analisando os dados…</div>}
        <div ref={fim} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); enviar(texto); }} className="flex gap-2 border-t border-line p-3">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pergunte sobre terrenos, prazos, riscos…" className="campo" maxLength={4000} />
        <button disabled={carregando || !texto.trim()} className="btn-primario"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}
