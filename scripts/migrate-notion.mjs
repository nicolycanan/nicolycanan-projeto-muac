import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Client } from "@notionhq/client";
import { imageSize } from "image-size";

const root = path.resolve(".backups/migration-2026-10-25");
const snapshotPath = path.join(root, "notion.json");
const plain = (items) =>
  (items ?? []).map((t) => t.plain_text ?? t.text?.content ?? "").join("");
const sql = (value) =>
  value === null || value === undefined
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`;
function wrangler(args) {
  const result = spawnSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    { stdio: "inherit" },
  );
  if (result.status !== 0)
    throw new Error(`Wrangler failed: ${args[0]} ${args[1]}`);
}
if (process.argv[2] === "export") {
  try {
    await fs.access(snapshotPath);
    throw new Error(
      "Backup already exists. Preserve it; use a new directory for another export.",
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  process.loadEnvFile(".env.local");
  const client = new Client({
    auth: process.env.NOTION_TOKEN,
    notionVersion: "2026-03-11",
    logLevel: "error",
  });
  const database = await client.databases.retrieve({
    database_id: process.env.NOTION_DATABASE_ID,
  });
  const source = await client.dataSources.retrieve({
    data_source_id:
      process.env.NOTION_DATA_SOURCE_ID || database.data_sources[0].id,
  });
  async function paginate(method, params) {
    const all = [];
    let cursor;
    do {
      const r = await method({
        ...params,
        start_cursor: cursor,
        page_size: 100,
      });
      all.push(...r.results);
      cursor = r.next_cursor || undefined;
    } while (cursor);
    return all;
  }
  const pages = await paginate((p) => client.dataSources.query(p), {
    data_source_id: source.id,
  });
  const assets = [];
  const urls = new Map();
  await fs.mkdir(path.join(root, "images"), { recursive: true });
  async function media(url, name) {
    const key = url.split("?")[0];
    if (urls.has(key)) return urls.get(key);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Image download failed: ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    const sha256 = createHash("sha256").update(data).digest("hex");
    const dimensions = imageSize(data);
    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        contentType,
      )
    )
      throw new Error("Unsupported image format");
    const id = randomUUID(),
      file = `images/${id}`;
    await fs.writeFile(path.join(root, file), data);
    const asset = {
      id,
      file,
      key: `images/${id}`,
      name: name || "imagem",
      contentType,
      size: data.length,
      sha256,
      width: dimensions.width,
      height: dimensions.height,
    };
    assets.push(asset);
    urls.set(key, `/media/${id}`);
    return `/media/${id}`;
  }
  function rich(items) {
    return (items ?? [])
      .filter((t) => plain([t]))
      .map((t) => {
        const marks = [];
        for (const [key, type] of [
          ["bold", "bold"],
          ["italic", "italic"],
          ["underline", "underline"],
          ["strikethrough", "strike"],
          ["code", "code"],
        ])
          if (t.annotations?.[key]) marks.push({ type });
        if (t.href) marks.push({ type: "link", attrs: { href: t.href } });
        if (t.annotations?.color && t.annotations.color !== "default")
          marks.push({
            type: "notionColor",
            attrs: { value: t.annotations.color },
          });
        return {
          type: "text",
          text: plain([t]),
          ...(marks.length ? { marks } : {}),
        };
      });
  }
  async function getBlocks(id) {
    const blocks = await paginate((p) => client.blocks.children.list(p), {
      block_id: id,
    });
    for (const block of blocks)
      if (block.has_children) block.children = await getBlocks(block.id);
    return blocks;
  }
  async function convert(blocks) {
    const nodes = [];
    for (const b of blocks) {
      if (b.type === "paragraph")
        nodes.push({ type: "paragraph", content: rich(b.paragraph.rich_text) });
      else if (b.type.startsWith("heading_"))
        nodes.push({
          type: "heading",
          attrs: { level: Number(b.type.slice(-1)) },
          content: rich(b[b.type].rich_text),
        });
      else if (b.type === "quote")
        nodes.push({
          type: "blockquote",
          content: [{ type: "paragraph", content: rich(b.quote.rich_text) }],
        });
      else if (b.type === "image") {
        const image = b.image,
          caption = plain(image.caption);
        nodes.push({
          type: "image",
          attrs: {
            src: await media(image[image.type].url, caption),
            alt: caption,
            caption,
          },
        });
      } else if (
        b.type === "bulleted_list_item" ||
        b.type === "numbered_list_item"
      ) {
        const type =
          b.type === "bulleted_list_item" ? "bulletList" : "orderedList";
        const item = {
          type: "listItem",
          content: [
            { type: "paragraph", content: rich(b[b.type].rich_text) },
            ...(await convert(b.children ?? [])),
          ],
        };
        if (nodes.at(-1)?.type === type) nodes.at(-1).content.push(item);
        else nodes.push({ type, content: [item] });
      } else if (b.type === "divider") nodes.push({ type: "horizontalRule" });
      else
        throw new Error(
          `Unsupported Notion block ${b.type}; migration stopped without discarding it.`,
        );
      if (
        b.has_children &&
        !["bulleted_list_item", "numbered_list_item"].includes(b.type)
      )
        throw new Error("Nested blocks need explicit conversion.");
    }
    return nodes;
  }
  const articles = [];
  for (const [index, page] of pages.entries()) {
    const p = page.properties;
    const blocks = await getBlocks(page.id);
    let cover = "/images/carpa.png";
    for (const f of p.Cover?.files ?? []) {
      const mapped = await media(f[f.type].url, f.name);
      if (cover === "/images/carpa.png") cover = mapped;
    }
    if (page.cover)
      cover = await media(page.cover[page.cover.type].url, "capa");
    articles.push({
      id: page.id,
      slug: plain(p.Slug?.rich_text) || `draft-${page.id}`,
      number: String(p.Number?.number ?? index + 1).padStart(3, "0"),
      title: plain(p.Title?.title),
      subject: plain(p.Subject?.rich_text),
      role: plain(p.Role?.rich_text),
      dek: plain(p.Dek?.rich_text),
      cover,
      tags: (p.Tags?.multi_select ?? []).map((t) => t.name),
      profiles: [],
      date: p["Published Date"]?.date?.start || page.created_time,
      published: Boolean(p.Published?.checkbox),
      demo: Boolean(p.Demo?.checkbox),
      featured: Boolean(p.Featured?.checkbox),
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
      document: { type: "doc", content: await convert(blocks) },
      source: { page, blocks },
    });
  }
  for (const a of articles)
    if (!a.document.content.length)
      a.document.content.push({ type: "paragraph" });
  const snapshot = {
    version: 1,
    exportedAt: new Date().toISOString(),
    database,
    source,
    articles,
    assets,
  };
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), {
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      exported: articles.length,
      published: articles.filter((a) => a.published).length,
      images: assets.length,
      bytes: assets.reduce((s, a) => s + a.size, 0),
      backup: root,
    }),
  );
} else if (process.argv[2] === "import") {
  const remote = process.argv.includes("--remote");
  const flag = remote ? "--remote" : "--local";
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
  const statements = [];
  const values = [];
  for (const asset of snapshot.assets) {
    const bytes = await fs.readFile(path.join(root, asset.file));
    if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
      throw new Error("Image checksum mismatch");
    values.push({
      key: asset.key,
      value: bytes.toString("base64"),
      base64: true,
      metadata: { contentType: asset.contentType, sha256: asset.sha256 },
    });
    statements.push(
      `INSERT OR IGNORE INTO media(id,storage_key,original_name,content_type,size,sha256,width,height,created_at) VALUES(${[asset.id, asset.key, asset.name, asset.contentType, asset.size, asset.sha256, asset.width, asset.height, snapshot.exportedAt].map(sql).join(",")});`,
    );
  }
  for (const a of snapshot.articles) {
    const columns = [
      "id",
      "notion_page_id",
      "slug",
      "number",
      "title",
      "subject",
      "role",
      "dek",
      "cover",
      "tags_json",
      "profiles_json",
      "published_date",
      "published",
      "featured",
      "demo",
      "source_json",
      "created_at",
      "updated_at",
    ];
    const row = [
      a.id,
      a.id,
      a.slug,
      a.number,
      a.title,
      a.subject,
      a.role,
      a.dek,
      a.cover,
      JSON.stringify(a.tags),
      JSON.stringify(a.profiles),
      a.date,
      +a.published,
      +a.featured,
      +a.demo,
      JSON.stringify(a.source),
      a.createdAt,
      a.updatedAt,
    ];
    statements.push(
      `INSERT OR IGNORE INTO articles(${columns.join(",")}) VALUES(${row.map(sql).join(",")});`,
    );
    a.document.content.forEach((node, i) =>
      statements.push(
        `INSERT OR IGNORE INTO article_blocks(article_id,position,node_json) SELECT ${[a.id, i, JSON.stringify(node)].map(sql).join(",")} WHERE EXISTS(SELECT 1 FROM articles WHERE id=${sql(a.id)} AND revision=1 AND write_token='');`,
      ),
    );
    statements.push(
      `INSERT OR IGNORE INTO article_revisions(article_id,revision,snapshot_json,created_at) VALUES(${[a.id, 1, JSON.stringify({ ...a, source: undefined }), snapshot.exportedAt].map(sql).join(",")});`,
    );
  }
  const importPath = path.join(root, "import.sql"),
    bulkPath = path.join(root, "media-kv.json");
  await fs.writeFile(importPath, statements.join("\n"));
  await fs.writeFile(bulkPath, JSON.stringify(values));
  wrangler([
    "d1",
    "execute",
    "muac-content",
    flag,
    "--file=migrations-content/0001_content.sql",
  ]);
  if (remote)
    wrangler(["kv", "bulk", "put", bulkPath, "--binding=muac_media", flag]);
  else {
    // Wrangler 4.123 local bulk import decodes binary through UTF-8. Write bytes
    // through the binding instead so the local test copy matches production.
    const { getPlatformProxy } = await import("wrangler");
    const proxy = await getPlatformProxy({ remoteBindings: false });
    try {
      for (const asset of snapshot.assets)
        await proxy.env.muac_media.put(
          asset.key,
          await fs.readFile(path.join(root, asset.file)),
          {
            metadata: { contentType: asset.contentType, sha256: asset.sha256 },
          },
        );
    } finally {
      await proxy.dispose();
    }
  }
  wrangler(["d1", "execute", "muac-content", flag, `--file=${importPath}`]);
  console.log(
    `Imported ${snapshot.articles.length} articles and ${snapshot.assets.length} verified images (${remote ? "remote" : "local"}).`,
  );
} else
  throw new Error(
    "Use: node scripts/migrate-notion.mjs export | import [--remote]",
  );
