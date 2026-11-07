"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { parseFiltro } from "@/lib/domain/regras";

const UM_ANO = 60 * 60 * 24 * 365;

export async function definirFiltro(valor: string) {
  (await cookies()).set("unidade", parseFiltro(valor), { maxAge: UM_ANO, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export async function definirTema(valor: "light" | "dark") {
  (await cookies()).set("tema", valor === "dark" ? "dark" : "light", { maxAge: UM_ANO, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
