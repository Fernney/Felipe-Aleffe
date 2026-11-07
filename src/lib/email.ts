import "server-only";
import type { Alerta } from "@/lib/domain/regras";
import { fmtData } from "@/lib/domain/datas";
import { MODULOS } from "@/lib/domain/modulos";

export const DESTINOS = {
  inova: { nome: "SPE INOVA BH", email: process.env.ALERT_EMAIL_INOVA ?? "projetos@speinova.com.br", cor: "#0D5A55", cor2: "#95C11F" },
  saude: { nome: "SPE Saúde Primária BH", email: process.env.ALERT_EMAIL_SAUDE ?? "projetos@spesaude.com.br", cor: "#6E368C", cor2: "#4C2C84" },
} as const;

/** Mesma divisão do app original: alertas sem unidade vão para as duas SPEs. */
export function alertasDaSpe(alertas: Alerta[], spe: keyof typeof DESTINOS) {
  return alertas.filter((a) => a.unidade == null || (spe === "inova" ? a.unidade === "INOVA BH" : a.unidade === "SAÚDE BH"));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function htmlAlertas(alertas: Alerta[], spe: keyof typeof DESTINOS, rodape: string, urlBase: string) {
  const d = DESTINOS[spe];
  const linhas = alertas
    .map(
      (a) => `<tr>
  <td style="padding:8px;border-bottom:1px solid #eee"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;${a.alta ? "background:#FCECEB;color:#B3261E" : "background:#FDF1DE;color:#8A5300"}">${a.alta ? "ALTA" : "ATENÇÃO"}</span></td>
  <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${esc(a.terreno)}</td>
  <td style="padding:8px;border-bottom:1px solid #eee">${a.modulo === "fluxograma" ? "Fluxograma" : MODULOS[a.modulo].sigla}</td>
  <td style="padding:8px;border-bottom:1px solid #eee">${esc(a.tipo)}<div style="color:#737373;font-size:12px">${esc(a.detalhe)}</div></td>
  <td style="padding:8px;border-bottom:1px solid #eee;white-space:nowrap">${fmtData(a.data)}</td>
  <td style="padding:8px;border-bottom:1px solid #eee"><a href="${urlBase}${a.href}" style="color:${d.cor}">abrir</a></td>
</tr>`,
    )
    .join("");
  const altas = alertas.filter((a) => a.alta).length;
  return `<!doctype html><html><body style="margin:0;background:#F4F3F7;font-family:'Open Sans',Arial,sans-serif;color:#2B2530">
<div style="max-width:860px;margin:0 auto;padding:24px">
  <div style="height:6px;border-radius:6px;background:linear-gradient(90deg,#6F3B8C,#3266AF,#12A9A2)"></div>
  <div style="background:#fff;border-radius:14px;margin-top:12px;padding:24px;border:1px solid #E4E1EA">
    <div style="font-size:12px;font-weight:700;letter-spacing:.12em;color:#737373;text-transform:uppercase">Central de Diligenciamento · JOPE</div>
    <h1 style="margin:6px 0 4px;font-size:20px;color:${d.cor}">Alertas e pendências — ${esc(d.nome)}</h1>
    <p style="margin:0 0 16px;color:#5F5868">${alertas.length} pendência(s), ${altas} de prioridade alta.</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead><tr style="text-align:left;color:#737373;font-size:11px;text-transform:uppercase">
        <th style="padding:8px">Prioridade</th><th style="padding:8px">Terreno</th><th style="padding:8px">Módulo</th><th style="padding:8px">Pendência</th><th style="padding:8px">Data</th><th></th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#737373">${esc(rodape)}</p>
  </div>
</div></body></html>`;
}
