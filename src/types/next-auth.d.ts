import type { Perfil } from "@/lib/domain/types";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user?: { name?: string | null; email?: string | null; image?: string | null; perfil?: Perfil };
  }
}
