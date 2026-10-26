import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import ArticleView from "@/components/ArticleView";
import { requireAdmin } from "@/lib/admin-auth";
import { editableArticle, documentBody } from "@/lib/article-store";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Prévia do artigo",
  robots: { index: false, follow: false },
};
export default async function ArticlePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const h = await headers();
  try {
    await requireAdmin(
      new Request(
        `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}/dashboard`,
        { headers: h },
      ),
    );
  } catch {
    redirect("/dashboard");
  }
  const article = await editableArticle((await params).id);
  if (!article) notFound();
  return (
    <>
      <p
        style={{
          padding: "1rem",
          border: "1px solid var(--line)",
          marginBottom: "2rem",
        }}
      >
        Prévia · {article.published ? "Publicado" : "Rascunho privado"}
      </p>
      <ArticleView
        entry={{
          ...article,
          title: article.title || "Sem título",
          body: documentBody(article.document),
        }}
      />
    </>
  );
}
