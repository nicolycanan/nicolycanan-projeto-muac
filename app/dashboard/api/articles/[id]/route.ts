import { requireAdmin, adminFailure, AdminError } from "@/lib/admin-auth";
import { editableArticle, saveArticle } from "@/lib/article-store";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    await requireAdmin(request);
    const article = await editableArticle((await params).id);
    return Response.json(
      article ? { article } : { error: "Artigo não encontrado." },
      { status: article ? 200 : 404, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return adminFailure(e);
  }
}
export async function PUT(request: Request, { params }: Context) {
  try {
    await requireAdmin(request);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 300000)
      throw new AdminError("Artigo muito grande.", 413);
    return Response.json(
      await saveArticle(JSON.parse(text), (await params).id),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    return adminFailure(e);
  }
}
