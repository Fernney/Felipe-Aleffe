import { withAuth } from "next-auth/middleware";

export default withAuth({ pages: { signIn: "/login" } });

// Rotas públicas: login, autenticação, API do Power BI e cron (ambas usam token próprio).
export const config = {
  matcher: ["/((?!login|api/auth|api/bi|api/cron|_next|jope-logo.png|favicon.ico|manifest.webmanifest).*)"],
};
