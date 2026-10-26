import type {
  ArchiveBlock,
  ArchiveEntry,
  ArchiveRichText,
  ProfileReference,
} from "./content";
import { contentEnv } from "./content-env";
import { AdminError } from "./admin-auth";
import {
  type ArticleDocument,
  type ArticleNode,
  nodeText,
  validateDocument,
  validMediaPath,
} from "./article-document";

export type EditableArticle = ArchiveEntry & {
  id: string;
  published: boolean;
  demo: boolean;
  revision: number;
  updatedAt: string;
  document: ArticleDocument;
};
type ArticleRow = {
  id: string;
  slug: string;
  number: string;
  title: string;
  subject: string;
  role: string;
  dek: string;
  cover: string;
  tags_json: string;
  profiles_json: string;
  published_date: string;
  published: number;
  featured: number;
  demo: number;
  revision: number;
  updated_at: string;
};
const COLUMNS =
  "id,slug,number,title,subject,role,dek,cover,tags_json,profiles_json,published_date,published,featured,demo,revision,updated_at";
function richText(node: ArticleNode): ArchiveRichText[] {
  return (node.content ?? []).map((child) => ({
    text: nodeText(child),
    bold: child.marks?.some((m) => m.type === "bold"),
    italic: child.marks?.some((m) => m.type === "italic"),
    underline: child.marks?.some((m) => m.type === "underline"),
    strikethrough: child.marks?.some((m) => m.type === "strike"),
    code: child.marks?.some((m) => m.type === "code"),
    href: child.marks?.find((m) => m.type === "link")?.attrs?.href as
      string | undefined,
  }));
}
export function documentBody(document: ArticleDocument): ArchiveBlock[] {
  return document.content.flatMap((n): ArchiveBlock[] => {
    if (n.type === "paragraph")
      return n.content?.length
        ? [{ type: "paragraph", richText: richText(n) }]
        : [];
    if (n.type === "heading") return [{ type: "heading", text: nodeText(n) }];
    if (n.type === "blockquote")
      return [
        { type: "quote", text: (n.content ?? []).map(nodeText).join("\n") },
      ];
    if (n.type === "image")
      return [
        {
          type: "image",
          src: String(n.attrs?.src ?? ""),
          alt: String(n.attrs?.alt ?? ""),
          caption: String(n.attrs?.caption ?? "") || undefined,
          width: typeof n.attrs?.width === "number" ? n.attrs.width : undefined,
        },
      ];
    if (n.type === "bulletList" || n.type === "orderedList")
      return [
        {
          type: "list",
          ordered: n.type === "orderedList",
          items: (n.content ?? []).map(nodeText),
        },
      ];
    if (n.type === "horizontalRule") return [{ type: "divider" }];
    return [];
  });
}
function entry(row: ArticleRow, document?: ArticleDocument): ArchiveEntry {
  return {
    slug: row.slug,
    number: row.number,
    title: row.title || "sem título",
    subject: row.subject,
    role: row.role,
    dek: row.dek,
    cover: row.cover,
    tags: JSON.parse(row.tags_json),
    profiles: JSON.parse(row.profiles_json) as ProfileReference[],
    date: row.published_date,
    featured: !!row.featured,
    body: document ? documentBody(document) : [],
  };
}
export async function publishedArticles(): Promise<ArchiveEntry[]> {
  const { muac_content: db } = await contentEnv();
  const { results } = await db
    .prepare(
      `SELECT ${COLUMNS} FROM articles WHERE published=1 ORDER BY published_date DESC,id`,
    )
    .all<ArticleRow>();
  return results.map((row) => entry(row));
}
export async function articleBySlug(
  slug: string,
): Promise<ArchiveEntry | null> {
  const { muac_content: db } = await contentEnv();
  // Read publication state and body from one snapshot, including during an unpublish.
  const row = await db
    .prepare(
      `SELECT ${COLUMNS},(SELECT json_group_array(json(node_json)) FROM (SELECT node_json FROM article_blocks WHERE article_id=articles.id ORDER BY position)) AS body_json FROM articles WHERE slug=? AND published=1`,
    )
    .bind(slug)
    .first<ArticleRow & { body_json: string }>();
  if (!row) return null;
  return entry(row, { type: "doc", content: JSON.parse(row.body_json) });
}
export async function listArticles() {
  const { muac_content: db } = await contentEnv();
  const { results } = await db
    .prepare(`SELECT ${COLUMNS} FROM articles ORDER BY published_date DESC,id`)
    .all<ArticleRow>();
  return results.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    published: !!r.published,
    updatedAt: r.updated_at,
    revision: r.revision,
  }));
}
export async function editableArticle(
  id: string,
): Promise<EditableArticle | null> {
  const { muac_content: db } = await contentEnv();
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM articles WHERE id=?`)
    .bind(id)
    .first<ArticleRow>();
  if (!row) return null;
  const { results } = await db
    .prepare(
      "SELECT node_json FROM article_blocks WHERE article_id=? ORDER BY position",
    )
    .bind(id)
    .all<{ node_json: string }>();
  const document: ArticleDocument = {
    type: "doc",
    content: results.map((r) => JSON.parse(r.node_json)),
  };
  return {
    ...entry(row),
    title: row.title,
    id,
    published: !!row.published,
    demo: !!row.demo,
    revision: row.revision,
    updatedAt: row.updated_at,
    document,
  };
}
function field(
  raw: Record<string, unknown>,
  key: string,
  limit: number,
): string {
  const value = raw[key];
  if (typeof value !== "string" || value.length > limit)
    throw new AdminError(`Campo ${key} inválido.`, 400);
  return value;
}
export async function saveArticle(
  raw: unknown,
  id?: string,
): Promise<{ id: string; revision: number }> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new AdminError("Artigo inválido.", 400);
  const input = raw as Record<string, unknown>;
  const slug = field(input, "slug", 120),
    title = field(input, "title", 500),
    number = field(input, "number", 20),
    subject = field(input, "subject", 500),
    role = field(input, "role", 500),
    dek = field(input, "dek", 5000),
    cover = field(input, "cover", 200),
    date = field(input, "date", 40);
  if (!/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?$/.test(slug))
    throw new AdminError(
      "Use letras minúsculas, números e hífens no endereço.",
      400,
    );
  if (!validMediaPath(cover) || !Number.isFinite(Date.parse(date)))
    throw new AdminError("Capa ou data inválida.", 400);
  if (
    typeof input.published !== "boolean" ||
    typeof input.demo !== "boolean" ||
    typeof input.featured !== "boolean"
  )
    throw new AdminError("Estado de publicação inválido.", 400);
  if (input.published && !title.trim())
    throw new AdminError("Escreva um título antes de publicar.", 400);
  if (
    !Array.isArray(input.tags) ||
    input.tags.length > 40 ||
    input.tags.some((t) => typeof t !== "string" || t.length > 100)
  )
    throw new AdminError("Tags inválidas.", 400);
  let document: ArticleDocument;
  try {
    document = validateDocument(input.document);
  } catch (e) {
    throw new AdminError(
      e instanceof Error ? e.message : "Texto inválido.",
      400,
    );
  }
  const { muac_content: db } = await contentEnv();
  // Only references to completed uploads can be saved.
  const paths = new Set<string>([cover]);
  function images(n: ArticleNode) {
    if (n.type === "image") paths.add(String(n.attrs?.src));
    n.content?.forEach(images);
  }
  document.content.forEach(images);
  for (const p of paths)
    if (
      p.startsWith("/media/") &&
      !(await db
        .prepare("SELECT id FROM media WHERE id=?")
        .bind(p.slice(7))
        .first())
    )
      throw new AdminError(
        "Imagem não encontrada. Envie o arquivo novamente.",
        400,
      );
  const current = id
    ? await db
        .prepare(`SELECT ${COLUMNS} FROM articles WHERE id=?`)
        .bind(id)
        .first<ArticleRow>()
    : null;
  if (id && !current) throw new AdminError("Artigo não encontrado.", 404);
  if (current && current.slug !== slug)
    throw new AdminError(
      "O endereço de um artigo existente é permanente.",
      400,
    );
  if (current && current.revision !== input.revision)
    throw new AdminError(
      "Este artigo mudou em outra aba. Recarregue antes de salvar.",
      409,
    );
  if (
    await db
      .prepare("SELECT id FROM articles WHERE slug=? AND id!=?")
      .bind(slug, id ?? "")
      .first()
  )
    throw new AdminError("Já existe um artigo com esse endereço.", 409);
  const articleId = id ?? crypto.randomUUID(),
    token = crypto.randomUUID(),
    now = new Date().toISOString(),
    revision = (current?.revision ?? 0) + 1;
  const fields = [
    slug,
    number,
    title,
    subject,
    role,
    dek,
    cover,
    JSON.stringify(input.tags),
    date,
    +input.published,
    +input.featured,
    +input.demo,
    now,
    token,
  ];
  const statements: D1PreparedStatement[] = [];
  if (current)
    statements.push(
      db
        .prepare(
          "UPDATE articles SET slug=?,number=?,title=?,subject=?,role=?,dek=?,cover=?,tags_json=?,published_date=?,published=?,featured=?,demo=?,updated_at=?,write_token=?,revision=revision+1 WHERE id=? AND revision=?",
        )
        .bind(...fields, articleId, current.revision),
    );
  else
    statements.push(
      db
        .prepare(
          "INSERT INTO articles(slug,number,title,subject,role,dek,cover,tags_json,published_date,published,featured,demo,updated_at,write_token,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(...fields, articleId, now),
    );
  const condition =
    "EXISTS(SELECT 1 FROM articles WHERE id=? AND write_token=?)";
  statements.push(
    db
      .prepare(`DELETE FROM article_blocks WHERE article_id=? AND ${condition}`)
      .bind(articleId, articleId, token),
  );
  for (const [position, node] of document.content.entries())
    statements.push(
      db
        .prepare(
          `INSERT INTO article_blocks(article_id,position,node_json) SELECT ?,?,? WHERE ${condition}`,
        )
        .bind(articleId, position, JSON.stringify(node), articleId, token),
    );
  statements.push(
    db
      .prepare(
        `INSERT INTO article_revisions(article_id,revision,snapshot_json,created_at) SELECT ?,?,?,? WHERE ${condition}`,
      )
      .bind(
        articleId,
        revision,
        JSON.stringify({ ...input, id: articleId, revision, document }),
        now,
        articleId,
        token,
      ),
  );
  const result = await db.batch(statements);
  if (!result[0].meta.changes)
    throw new AdminError(
      "Este artigo mudou em outra aba. Recarregue antes de salvar.",
      409,
    );
  return { id: articleId, revision };
}
