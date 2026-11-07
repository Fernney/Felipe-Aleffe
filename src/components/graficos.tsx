"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR_STATUS } from "@/lib/tema";
import type { StatusNorm } from "@/lib/domain/types";

const STATUS: StatusNorm[] = ["Concluído", "Em andamento", "Aguardando", "Não iniciado", "Bloqueado"];

const estiloTooltip = {
  contentStyle: {
    background: "rgb(var(--card))",
    border: "1px solid rgb(var(--line))",
    borderRadius: 10,
    fontSize: 12,
    color: "rgb(var(--ink))",
  },
};

export function StatusPorModulo({ dados }: { dados: { sigla: string; status: Record<StatusNorm, number> }[] }) {
  const linhas = dados.map((d) => ({ sigla: d.sigla, ...d.status }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, linhas.length * 34)}>
      <BarChart data={linhas} layout="vertical" margin={{ left: 8, right: 12 }} barSize={16}>
        <CartesianGrid horizontal={false} stroke="rgb(var(--line))" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "rgb(var(--ink-soft))" }} />
        <YAxis type="category" dataKey="sigla" width={72} tick={{ fontSize: 11, fontWeight: 600, fill: "rgb(var(--ink-soft))" }} />
        <Tooltip {...estiloTooltip} cursor={{ fill: "rgb(var(--line) / .4)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {STATUS.map((s, i) => (
          <Bar key={s} dataKey={s} stackId="a" fill={COR_STATUS[s].grafico} radius={i === STATUS.length - 1 ? [0, 6, 6, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Rosca({ dados, cores, centro }: { dados: { nome: string; valor: number }[]; cores: readonly string[]; centro?: string }) {
  const filtrados = dados.filter((d) => d.valor > 0);
  const total = filtrados.reduce((a, b) => a + b.valor, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={filtrados} dataKey="valor" nameKey="nome" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
            {filtrados.map((_, i) => (
              <Cell key={i} fill={cores[i % cores.length]} />
            ))}
          </Pie>
          <Tooltip {...estiloTooltip} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[88px] text-center">
        <div className="text-2xl font-bold tabular-nums">{total}</div>
        <div className="text-[11px] text-ink-soft">{centro}</div>
      </div>
    </div>
  );
}

export function Comparativo({ dados }: { dados: { indicador: string; inova: number; saude: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={dados} barGap={4} barSize={18}>
        <CartesianGrid vertical={false} stroke="rgb(var(--line))" />
        <XAxis dataKey="indicador" tick={{ fontSize: 11, fill: "rgb(var(--ink-soft))" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgb(var(--ink-soft))" }} />
        <Tooltip {...estiloTooltip} cursor={{ fill: "rgb(var(--line) / .4)" }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {/* Cores oficiais: INOVA verde escuro / SAÚDE roxo */}
        <Bar dataKey="inova" name="INOVA BH" fill="#0D5A55" radius={[6, 6, 0, 0]} />
        <Bar dataKey="saude" name="SAÚDE BH" fill="#6E368C" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
