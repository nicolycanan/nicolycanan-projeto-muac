import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const base = "http://127.0.0.1:3000";
async function call(path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: body ? { "Content-Type": "application/json", Origin: base } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
const snapshot = JSON.parse(
  await fs.readFile(".backups/migration-2026-10-25/notion.json", "utf8"),
);
const list = await call("/dashboard/api/articles");
assert.equal(list.status, 200);
for (const original of snapshot.articles) {
  const {
    data: { article },
  } = await call(`/dashboard/api/articles/${original.id}`);
  for (const field of [
    "slug",
    "title",
    "number",
    "subject",
    "role",
    "dek",
    "cover",
    "date",
    "published",
    "demo",
  ])
    assert.deepEqual(
      article[field],
      original[field],
      `${original.slug}.${field}`,
    );
  assert.deepEqual(article.tags, original.tags);
  assert.deepEqual(article.document, original.document);
}
for (const asset of snapshot.assets) {
  const r = await fetch(base + `/media/${asset.id}`);
  assert.equal(r.status, 200);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
}
const slug = `teste-local-${Date.now()}`;
const draft = {
  slug,
  title: "Teste local de migração",
  number: "999",
  subject: "Teste",
  role: "",
  dek: "",
  cover: "/images/carpa.png",
  date: "2026-10-25",
  tags: ["teste"],
  published: false,
  featured: false,
  demo: true,
  document: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Conteúdo de teste.",
            marks: [{ type: "bold" }],
          },
        ],
      },
    ],
  },
};
let result = await call("/dashboard/api/articles", "POST", draft);
assert.equal(result.status, 201);
const { id, revision } = result.data;
assert.equal(
  (await fetch(base + `/archive/${slug}`)).status,
  404,
  "Draft must remain private",
);
assert.equal(
  (await fetch(base + `/dashboard/articles/${id}/preview`)).status,
  200,
);
const updated = { ...draft, published: true, revision };
result = await call(`/dashboard/api/articles/${id}`, "PUT", updated);
assert.equal(result.status, 200);
assert.equal(
  (await fetch(base + `/archive/${slug}`)).status,
  200,
  "Published article must be visible immediately",
);
assert.equal(
  (await call(`/dashboard/api/articles/${id}`, "PUT", updated)).status,
  409,
  "Stale saves must not overwrite content",
);
assert.equal(
  (
    await call(`/dashboard/api/articles/${id}`, "PUT", {
      ...updated,
      revision: result.data.revision,
      slug: "changed-url",
    })
  ).status,
  400,
  "Existing URLs are immutable",
);
assert.equal(
  (await call("/dashboard/api/articles", "POST", draft)).status,
  409,
  "Duplicate URLs must be rejected",
);
result = await call(`/dashboard/api/articles/${id}`, "PUT", {
  ...updated,
  published: false,
  revision: result.data.revision,
});
assert.equal(result.status, 200);
assert.equal(
  (await fetch(base + `/archive/${slug}`)).status,
  404,
  "Unpublished article must disappear immediately",
);
const invalid = new FormData();
invalid.append(
  "file",
  new Blob(["not an image"], { type: "image/png" }),
  "invalid.png",
);
assert.equal(
  (
    await fetch(base + "/dashboard/api/media", {
      method: "POST",
      body: invalid,
    })
  ).status,
  400,
);
const asset = snapshot.assets[0],
  valid = new FormData();
valid.append(
  "file",
  new Blob([await fs.readFile(`.backups/migration-2026-10-25/${asset.file}`)], {
    type: asset.contentType,
  }),
  "test.png",
);
const upload = await fetch(base + "/dashboard/api/media", {
  method: "POST",
  body: valid,
});
assert.equal(upload.status, 201);
const media = await upload.json();
const downloaded = Buffer.from(
  await (await fetch(base + media.url)).arrayBuffer(),
);
assert.equal(
  createHash("sha256").update(downloaded).digest("hex"),
  asset.sha256,
);
console.log(
  "PASS: exact data and image checksums; drafts, preview, publish, unpublish, stale saves, URL conflicts and image upload. Only local data changed.",
);
