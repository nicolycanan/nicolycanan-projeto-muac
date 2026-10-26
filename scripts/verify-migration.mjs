import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const snapshot = JSON.parse(
  fs.readFileSync(".backups/migration-2026-10-25/notion.json"),
);
const cli = ["node_modules/wrangler/bin/wrangler.js"];
function run(args) {
  return execFileSync(process.execPath, [...cli, ...args], {
    maxBuffer: 30 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function query(sql) {
  return JSON.parse(
    run([
      "d1",
      "execute",
      "muac-content",
      "--remote",
      "--json",
      `--command=${sql}`,
    ]).toString(),
  )[0].results;
}
const rows = query("SELECT * FROM articles ORDER BY id"),
  blocks = query("SELECT * FROM article_blocks ORDER BY article_id,position");
assert.equal(rows.length, snapshot.articles.length);
for (const original of snapshot.articles) {
  const row = rows.find((r) => r.id === original.id);
  assert.ok(row);
  for (const field of [
    "slug",
    "number",
    "title",
    "subject",
    "role",
    "dek",
    "cover",
  ])
    assert.equal(row[field], original[field], `${original.slug}.${field}`);
  assert.equal(row.published_date, original.date);
  assert.equal(row.published, +original.published);
  assert.equal(row.demo, +original.demo);
  assert.equal(row.featured, +original.featured);
  assert.deepEqual(JSON.parse(row.tags_json), original.tags);
  assert.deepEqual(JSON.parse(row.source_json), original.source);
  assert.deepEqual(
    blocks
      .filter((b) => b.article_id === original.id)
      .map((b) => JSON.parse(b.node_json)),
    original.document.content,
  );
}
for (const asset of snapshot.assets) {
  const bytes = run([
    "kv",
    "key",
    "get",
    asset.key,
    "--binding=muac_media",
    "--remote",
  ]);
  assert.equal(bytes.length, asset.size);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256);
}
console.log(
  JSON.stringify({
    verified: true,
    articles: rows.length,
    published: rows.filter((r) => r.published).length,
    blocks: blocks.length,
    images: snapshot.assets.length,
    bytes: snapshot.assets.reduce((n, a) => n + a.size, 0),
  }),
);
