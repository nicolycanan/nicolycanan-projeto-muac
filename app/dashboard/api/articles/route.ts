import { requireAdmin, adminFailure, AdminError } from "@/lib/admin-auth";
import { listArticles, saveArticle } from "@/lib/article-store";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    return Response.json(
      { articles: await listArticles() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminFailure(e);
  }
}
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 300000)
      throw new AdminError("Artigo muito grande.", 413);
    return Response.json(await saveArticle(JSON.parse(text)), { status: 201 });
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    return adminFailure(e);
  }
}
