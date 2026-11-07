"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { enviarAlertasPorEmail } from "./acoes";

export function BotaoEnviarEmail({ habilitado }: { habilitado: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  return (
    <div className="flex items-center gap-2">
      {msg && <span className={`max-w-xs text-xs ${msg.ok ? "text-[#0B6B66]" : "text-[#B3261E]"}`}>{msg.texto}</span>}
      <button
        disabled={!habilitado || pendente}
        onClick={() => {
          if (!confirm("Enviar os alertas por e-mail para as SPEs INOVA e Saúde?")) return;
          iniciar(async () => setMsg(await enviarAlertasPorEmail()));
        }}
        className="btn-primario"
      >
        <Mail className="h-4 w-4" /> {pendente ? "Enviando…" : "Enviar por e-mail"}
      </button>
    </div>
  );
}
