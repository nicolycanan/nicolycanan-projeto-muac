import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const base = process.argv[2];
if (!base || !/^https:\/\/[a-z0-9-]+\.muaclife\.workers\.dev$/.test(base))
  throw Error("Supply the MUAC production or version-preview origin.");
const snapshot = JSON.parse(
  await fs.readFile(".backups/migration-2026-10-25/notion.json", "utf8"),
);
const before = JSON.parse(
  await fs.readFile(".backups/migration-2026-10-25/before-pages.json", "utf8"),
);
function normalizedArticle(html) {
  const article = html.match(/<article>([\s\S]*?)<\/article>/)?.[1];
  assert.ok(article, "Article markup missing");
  return article
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<([a-z][a-z0-9]*)\b[^>]*>/gi, "<$1>");
}
for (const a of snapshot.articles) {
  const path = `/archive/${a.slug}`;
  const r = await fetch(base + path);
  assert.equal(r.status, a.published ? 200 : 404, path);
  if (a.published) {
    assert.equal(
      normalizedArticle(await r.text()),
      normalizedArticle(before[path]),
      `Public text/format changed in ${a.slug}`,
    );
  }
}
for (const path of ["/", "/archive", "/radio", "/about", "/sitemap.xml"]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  const html = await r.text();
  assert.ok(
    !html.includes("/gallery"),
    `${path} still references removed route`,
  );
  if (path === "/sitemap.xml") {
    for (const slug of ["001", "002", "003"])
      assert.ok(html.includes(`/archive/${slug}`));
    assert.ok(!html.includes("draft-"));
  }
}
assert.equal((await fetch(base + "/gallery")).status, 404);
for (const a of snapshot.assets) {
  const r = await fetch(base + `/media/${a.id}`);
  assert.equal(r.status, 200);
  const bytes = Buffer.from(await r.arrayBuffer());
  assert.equal(bytes.length, a.size);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), a.sha256);
}
for (const path of [
  "/dashboard/api/articles",
  "/dashboard/api/media",
  "/api/analytics/stats",
  "/api/analytics/logs",
]) {
  const r = await fetch(base + path, {
    method: path.endsWith("/media") ? "POST" : "GET",
    redirect: "manual",
    headers: { "Cf-Access-Jwt-Assertion": "invalid", Origin: base },
  });
  assert.ok(
    [302, 401, 403].includes(r.status),
    `${path} must reject anonymous/forged sessions, got ${r.status}`,
  );
}
if (process.argv.includes("--live")) {
  const archive = await (await fetch(base + "/archive")).text();
  const src = archive.match(/src="([^\"]*\/_next\/image[^\"]*)"/)?.[1];
  assert.ok(src, "Optimized cover URL missing");
  const response = await fetch(new URL(src.replaceAll("&amp;", "&"), base));
  assert.equal(response.status, 200, "Image optimizer must serve KV images");
  assert.ok(response.headers.get("content-type")?.startsWith("image/"));
}
console.log(
  JSON.stringify({
    passed: true,
    origin: base,
    unchangedArticles: 3,
    privateDrafts: 1,
    imagesVerified: 9,
    galleryRemoved: true,
    adminProtected: true,
  }),
);
