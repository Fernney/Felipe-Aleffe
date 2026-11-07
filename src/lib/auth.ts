import "server-only";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import type { Perfil } from "@/lib/domain/types";
import { obterProvedor } from "@/lib/data";

export const loginDemoAtivo = process.env.DATA_PROVIDER !== "sharepoint" || process.env.DEMO_LOGIN === "true";
export const loginMicrosoftAtivo = !!process.env.AZURE_AD_CLIENT_ID;

const providers: NextAuthOptions["providers"] = [];
if (loginMicrosoftAtivo) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  );
}
if (loginDemoAtivo) {
  providers.push(
    CredentialsProvider({
      id: "demo",
      name: "Demonstração",
      credentials: { perfil: { label: "Perfil", type: "text" } },
      async authorize(c) {
        const perfil = (["Administrador", "Editor", "Consulta"] as const).find((p) => p === c?.perfil) ?? "Editor";
        const email = { Administrador: "admin@demo.local", Editor: "editor@demo.local", Consulta: "consulta@demo.local" }[perfil];
        return { id: email, email, name: `${perfil} Demo` };
      },
    }),
  );
}

/** Perfil vem da lista "Usuário do Sistema" (igual à tela de login do Power Apps). */
async function perfilDoUsuario(email: string): Promise<Perfil> {
  try {
    const base = await (await obterProvedor()).carregar();
    return base.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase())?.perfil ?? "Consulta";
  } catch {
    return "Consulta";
  }
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 10 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.perfil = await perfilDoUsuario(user.email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.perfil = (token.perfil as Perfil) ?? "Consulta";
      return session;
    },
  },
};

export interface Sessao {
  nome: string;
  email: string;
  perfil: Perfil;
  podeEditar: boolean;
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const s = await getServerSession(authOptions);
  if (!s?.user?.email) return null;
  const perfil = s.user.perfil ?? "Consulta";
  return { nome: s.user.name ?? s.user.email, email: s.user.email, perfil, podeEditar: perfil !== "Consulta" };
}

export async function exigirSessao(): Promise<Sessao> {
  const s = await sessaoAtual();
  if (!s) redirect("/login");
  return s;
}

export async function exigirEdicao(): Promise<Sessao> {
  const s = await exigirSessao();
  if (!s.podeEditar) throw new Error("Seu perfil é somente consulta.");
  return s;
}
