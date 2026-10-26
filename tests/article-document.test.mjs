import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateDocument, nodeText } from "../lib/article-document.ts";

test("editor documents retain their structure and supported formatting", () => {
  const document = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/article-document.json", import.meta.url),
    ),
  );
  assert.deepEqual(validateDocument(document), document);
});
test("rejects executable links and external or embedded images", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,hello"])
    assert.throws(() =>
      validateDocument({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "link",
                marks: [{ type: "link", attrs: { href } }],
              },
            ],
          },
        ],
      }),
    );
  for (const src of [
    "https://example.com/image.png",
    "data:image/png;base64,a",
    "/media/../../secret",
  ])
    assert.throws(() =>
      validateDocument({
        type: "doc",
        content: [{ type: "image", attrs: { src } }],
      }),
    );
});
test("preserves line breaks, Unicode and inline marks", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Olá 🐟",
            marks: [{ type: "bold" }, { type: "italic" }],
          },
          { type: "hardBreak" },
          {
            type: "text",
            text: "Mais texto",
            marks: [{ type: "link", attrs: { href: "https://example.com" } }],
          },
        ],
      },
    ],
  };
  assert.deepEqual(validateDocument(doc), doc);
  assert.equal(nodeText(doc), "Olá 🐟\nMais texto");
});
test("rejects oversized documents, invalid nesting and unsupported nodes", () => {
  for (const doc of [
    { type: "doc", content: [{ type: "script", text: "oops" }] },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "image", attrs: { src: "/images/carpa.png" } }],
        },
      ],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x".repeat(250001) }],
        },
      ],
    },
  ])
    assert.throws(() => validateDocument(doc));
});
