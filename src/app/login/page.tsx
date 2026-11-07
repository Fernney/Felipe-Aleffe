import { redirect } from "next/navigation";
import { loginDemoAtivo, loginMicrosoftAtivo, sessaoAtual } from "@/lib/auth";
import { BotoesLogin } from "./botoes";

export const metadata = { title: "Acessar" };

export default async function Login() {
  if (await sessaoAtual()) redirect("/");
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-jope-roxo/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-jope-azul/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-jope-agua/15 blur-3xl" />
      <div className="cartao relative w-full max-w-md p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/jope-logo.png" alt="JOPE ISB — Infraestrutura Social Brasil" className="mx-auto h-20 w-auto" />
        <h1 className="mt-6 text-center text-xl font-bold">Central de Diligenciamento</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">Licenciamento · Parcelamento · Ambiental · Baixa de Construção</p>
        <div className="mt-6 flex justify-center gap-2 text-[11px] font-bold">
          <span className="rounded-md bg-[#E3EFEE] px-2 py-1 text-inova-escuro">INOVA BH</span>
          <span className="rounded-md bg-[#EFE6F4] px-2 py-1 text-saude-roxo">SAÚDE BH</span>
        </div>
        <BotoesLogin microsoft={loginMicrosoftAtivo} demo={loginDemoAtivo} />
      </div>
    </div>
  );
}
