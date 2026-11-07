"use server";

import { headers } from "next/headers";
import { exigirEdicao } from "@/lib/auth";
import { carregarPainel, obterProvedor } from "@/lib/data";
import { fmtDataHora } from "@/lib/domain/datas";
import { alertasDaSpe, DESTINOS, htmlAlertas } from "@/lib/email";

export async function enviarAlertasPorEmail(): Promise<{ ok: boolean; texto: string }> {
  try {
    const s = await exigirEdicao();
    const { alertas } = await carregarPainel("todas");
    const p = await obterProvedor();
    const h = await headers();
    const urlBase = process.env.NEXTAUTH_URL ?? `https://${h.get("host")}`;
    const resumo: string[] = [];
    for (const spe of ["saude", "inova"] as const) {
      const lista = alertasDaSpe(alertas, spe);
      if (!lista.length) continue;
      const html = htmlAlertas(lista, spe, `Enviado manualmente por ${s.nome} em ${fmtDataHora(new Date().toISOString())}.`, urlBase);
      if ("enviarEmail" in p && typeof p.enviarEmail === "function") {
        await (p.enviarEmail as (a: string[], b: string, c: string) => Promise<void>)([DESTINOS[spe].email], `[Diligenciamento] ${lista.length} alerta(s) · ${DESTINOS[spe].nome}`, html);
      }
      resumo.push(`${DESTINOS[spe].nome}: ${lista.length}`);
    }
    await p.registrarEnvioAlertas({ nome: `Envio manual ${fmtDataHora(new Date().toISOString())}`, enviadoPor: s.nome, origem: "Manual", quantidade: alertas.length });
    const simulado = p.origem === "demo" ? " (modo demonstração: e-mail simulado, veja a prévia)" : "";
    return { ok: true, texto: `Enviado · ${resumo.join(" · ") || "nenhum alerta"}${simulado}` };
  } catch (e) {
    return { ok: false, texto: e instanceof Error ? e.message : "Falha ao enviar" };
  }
}
