"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { moverSituacao } from "@/app/(app)/acoes";
import type { StatusNorm } from "@/lib/domain/types";
import { COR_STATUS } from "@/lib/tema";
import { fmtData } from "@/lib/domain/datas";

export interface CartaoKanban {
  id: number;
  titulo: string;
  terreno: string;
  status: StatusNorm;
  situacao: string | null;
  prazo: string | null;
  atrasado: boolean;
}

/** Coluna → situação gravada no SharePoint ao soltar o cartão. */
const COLUNAS: { status: StatusNorm; situacao: string }[] = [
  { status: "Não iniciado", situacao: "Não Iniciada" },
  { status: "Em andamento", situacao: "Em análise" },
  { status: "Aguardando", situacao: "Aguardando documentação" },
  { status: "Concluído", situacao: "Aprovado" },
  { status: "Bloqueado", situacao: "Reprovado" },
];

export function Kanban({ modulo, cartoes, podeMover }: { modulo: string; cartoes: CartaoKanban[]; podeMover: boolean }) {
  const [, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<StatusNorm | null>(null);
  const [otimista, mover] = useOptimistic(cartoes, (estado, m: { id: number; status: StatusNorm; situacao: string }) =>
    estado.map((c) => (c.id === m.id ? { ...c, status: m.status, situacao: m.situacao } : c)),
  );

  const soltar = (col: (typeof COLUNAS)[number]) => {
    setSobre(null);
    if (arrastando == null) return;
    const id = arrastando;
    setArrastando(null);
    if (otimista.find((c) => c.id === id)?.status === col.status) return;
    iniciar(async () => {
      mover({ id, ...col });
      const r = await moverSituacao(modulo, id, col.situacao);
      setErro(r.ok ? null : r.erro);
    });
  };

  return (
    <>
      {erro && <div className="mb-3 rounded-xl bg-[#FCECEB] p-3 text-sm text-[#B3261E]">{erro}</div>}
      {podeMover && <p className="mb-3 text-xs text-ink-soft">Arraste os cartões entre as colunas: a situação é gravada e o movimento entra na linha do tempo.</p>}
      <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-5">
        {COLUNAS.map((col) => {
          const itens = otimista.filter((c) => c.status === col.status);
          const cor = COR_STATUS[col.status];
          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                if (!podeMover) return;
                e.preventDefault();
                setSobre(col.status);
              }}
              onDragLeave={() => setSobre(null)}
              onDrop={() => soltar(col)}
              className={`min-h-[300px] min-w-[220px] rounded-card border-2 p-2 transition ${sobre === col.status ? "border-brand bg-brand/5" : "border-transparent bg-line/40"}`}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cor.texto }}>{col.status}</span>
                <span className="rounded-full px-2 text-xs font-bold" style={{ background: cor.fundo, color: cor.texto }}>{itens.length}</span>
              </div>
              <div className="space-y-2">
                {itens.map((c) => (
                  <div
                    key={c.id}
                    draggable={podeMover}
                    onDragStart={() => setArrastando(c.id)}
                    onDragEnd={() => setArrastando(null)}
                    className={`cartao border-l-4 p-3 ${podeMover ? "cursor-grab active:cursor-grabbing" : ""} ${arrastando === c.id ? "opacity-50" : ""}`}
                    style={{ borderLeftColor: cor.grafico }}
                  >
                    <Link href={`/processos/${modulo}/${c.id}`} className="block text-sm font-semibold hover:text-brand">{c.titulo}</Link>
                    <div className="mt-0.5 truncate text-xs text-ink-soft">{c.terreno}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-ink-soft">{c.situacao ?? "—"}</span>
                      {c.prazo && <span className={c.atrasado ? "font-bold text-[#B3261E]" : "text-ink-soft"}>{fmtData(c.prazo)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
