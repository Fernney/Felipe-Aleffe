"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function BotoesLogin({ microsoft, demo }: { microsoft: boolean; demo: boolean }) {
  const [perfil, setPerfil] = useState("Editor");
  return (
    <div className="mt-8 space-y-4">
      {microsoft && (
        <button onClick={() => signIn("azure-ad", { callbackUrl: "/" })} className="btn-primario w-full justify-center bg-jope-roxo py-3">
          <svg viewBox="0 0 21 21" className="h-4 w-4" aria-hidden>
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Entrar com conta Microsoft
        </button>
      )}
      {demo && (
        <div className="rounded-xl border border-dashed border-line p-4">
          <div className="rotulo">Acesso de demonstração</div>
          <div className="flex gap-2">
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="campo">
              <option>Administrador</option>
              <option>Editor</option>
              <option>Consulta</option>
            </select>
            <button onClick={() => signIn("demo", { perfil, callbackUrl: "/" })} className="btn-contorno shrink-0">
              Entrar
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">Usa a base fictícia. Com o SharePoint configurado, o acesso é pela conta Microsoft.</p>
        </div>
      )}
      {!microsoft && !demo && <p className="text-center text-sm text-[#B3261E]">Nenhum método de login configurado. Veja o README.</p>}
    </div>
  );
}
