import { createRemoteJWKSet, jwtVerify } from "jose";
import { contentEnv } from "./content-env";
export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
let keys: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function requireAdmin(request: Request): Promise<void> {
  const url = new URL(request.url);
  // Explicit, local development only. There is no bypass in production builds.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.MUAC_DEV_AUTH === "1" &&
    ["localhost", "127.0.0.1"].includes(url.hostname)
  )
    return;
  const env = await contentEnv();
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
    throw new AdminError("Entre novamente pelo Cloudflare Access.", 401);
  try {
    keys ??= createRemoteJWKSet(
      new URL("/cdn-cgi/access/certs", env.ACCESS_TEAM_DOMAIN),
    );
    const { payload } = await jwtVerify(token, keys, {
      issuer: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
      algorithms: ["RS256"],
    });
    if (payload.type !== "app" || typeof payload.email !== "string")
      throw new Error("User session required");
  } catch {
    throw new AdminError(
      "Sessão inválida. Entre novamente pelo Cloudflare Access.",
      401,
    );
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (
      origin !== url.origin ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new AdminError("Origem da requisição inválida.", 403);
  }
}
export function adminFailure(error: unknown): Response {
  if (error instanceof AdminError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error("Article admin error", error);
  return Response.json(
    { error: "Não foi possível concluir a operação. Tente novamente." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
