import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { checkRateLimit } from "@/lib/redis";

const PROTECTED_PAGE_PREFIXES = [
  "/home",
  "/dramas",
  "/watch",
  "/conta",
  "/dispositivos",
  "/onboarding",
  "/lista",
  "/admin",
];

const RATE_LIMITED_ROUTES: Record<string, { limit: number; windowSeconds: number }> = {
  "/api/auth/login": { limit: 10, windowSeconds: 60 },
  "/api/auth/signup": { limit: 5, windowSeconds: 60 },
  "/api/playback/heartbeat": { limit: 30, windowSeconds: 60 },
  "/api/ingest": { limit: 30, windowSeconds: 60 },
  "/api/admin/import": { limit: 10, windowSeconds: 60 },
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
// Rotas chamadas servidor-a-servidor (sem Origin de navegador): webhook do
// Stripe (assinatura propria) e ingestao (API key propria).
const ORIGIN_CHECK_EXEMPT = new Set(["/api/billing/webhook", "/api/ingest"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Defesa CSRF adicional (alem do cookie SameSite=Lax): em rotas de API que
  // mutam estado, o Origin do request precisa bater com o host da propria app.
  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(request.method) &&
    !ORIGIN_CHECK_EXEMPT.has(pathname)
  ) {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.nextUrl.host) {
      return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
    }
  }

  const rateLimitConfig = RATE_LIMITED_ROUTES[pathname];
  if (rateLimitConfig) {
    try {
      const ip = getClientIp(request);
      const { allowed } = await checkRateLimit(
        `${pathname}:${ip}`,
        rateLimitConfig.limit,
        rateLimitConfig.windowSeconds
      );
      if (!allowed) {
        return NextResponse.json(
          { error: "Muitas tentativas. Aguarde um pouco e tente novamente." },
          { status: 429 }
        );
      }
    } catch {
      // Redis indisponivel (ex.: ainda nao provisionado) — nao bloqueia a rota,
      // so deixa de aplicar o rate limit nessa requisicao.
    }
  }

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtectedPage) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = token ? await verifySession(token) : null;
    if (!session) {
      const loginUrl = new URL("/entrar", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif)$).*)",
  ],
};
