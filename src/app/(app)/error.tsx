"use client";

import { signOut } from "next-auth/react";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="cartao mx-auto mt-10 max-w-xl p-8 text-center">
      <h1 className="text-lg font-bold">Não foi possível carregar os dados</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Normalmente isso acontece quando a sessão Microsoft expirou ou quando a sua conta ainda não tem acesso ao site
        do SharePoint da Central de Diligenciamento.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-soft">Código: {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-contorno">Tentar de novo</button>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-primario">Sair e entrar novamente</button>
      </div>
    </div>
  );
}
