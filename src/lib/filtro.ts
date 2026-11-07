import "server-only";
import { cookies } from "next/headers";
import { parseFiltro } from "@/lib/domain/regras";
import type { FiltroUnidade } from "@/lib/domain/types";

export async function filtroAtual(): Promise<FiltroUnidade> {
  return parseFiltro((await cookies()).get("unidade")?.value);
}

export async function temaAtual(): Promise<"light" | "dark"> {
  return (await cookies()).get("tema")?.value === "dark" ? "dark" : "light";
}
