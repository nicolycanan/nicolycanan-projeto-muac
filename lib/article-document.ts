// Version 1 of the editor document. Keep this module usable by migration tools.
export type TextMark = { type: string; attrs?: Record<string, unknown> };
export type ArticleNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: TextMark[];
  content?: ArticleNode[];
};
export type ArticleDocument = { type: "doc"; content: ArticleNode[] };
export const EMPTY_DOCUMENT: ArticleDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
export const MAX_DOCUMENT_BYTES = 250_000;
export function nodeText(node: ArticleNode): string {
  if (node.type === "hardBreak") return "\n";
  return node.text ?? (node.content ?? []).map(nodeText).join("");
}
export function safeLink(value: string): boolean {
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function validMediaPath(value: string): boolean {
  return (
    value === "/images/carpa.png" || /^\/media\/[a-f0-9-]{36}$/.test(value)
  );
}
export function validateDocument(value: unknown): ArticleDocument {
  if (
    new TextEncoder().encode(JSON.stringify(value)).length > MAX_DOCUMENT_BYTES
  )
    throw new Error("O texto excede o limite de 250 kB.");
  let count = 0;
  const children: Record<string, string[]> = {
    doc: [
      "paragraph",
      "heading",
      "blockquote",
      "bulletList",
      "orderedList",
      "image",
      "horizontalRule",
    ],
    paragraph: ["text", "hardBreak"],
    heading: ["text", "hardBreak"],
    blockquote: ["paragraph", "heading", "bulletList", "orderedList"],
    bulletList: ["listItem"],
    orderedList: ["listItem"],
    listItem: ["paragraph", "bulletList", "orderedList"],
    text: [],
    hardBreak: [],
    image: [],
    horizontalRule: [],
  };
  function check(
    raw: unknown,
    parent: string | null,
    depth: number,
  ): ArticleNode {
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      depth > 12 ||
      ++count > 5000
    )
      throw new Error("Estrutura de texto inválida.");
    const n = raw as ArticleNode;
    if (
      !Object.hasOwn(children, n.type) ||
      (parent && !children[parent].includes(n.type))
    )
      throw new Error("Bloco de texto não permitido.");
    if (n.type === "text" && (typeof n.text !== "string" || !n.text.length))
      throw new Error("Texto inválido.");
    if (n.type !== "text" && n.text !== undefined)
      throw new Error("Texto fora de um bloco de texto.");
    if (n.type === "image" && !validMediaPath(String(n.attrs?.src ?? "")))
      throw new Error("Envie a imagem pelo painel antes de inserir.");
    if (n.attrs && (typeof n.attrs !== "object" || Array.isArray(n.attrs)))
      throw new Error("Atributos inválidos.");
    if (n.type === "heading" && ![1, 2, 3].includes(Number(n.attrs?.level)))
      throw new Error("Nível de título inválido.");
    if (n.marks !== undefined && !Array.isArray(n.marks))
      throw new Error("Formatação inválida.");
    for (const m of n.marks ?? []) {
      if (
        ![
          "bold",
          "italic",
          "underline",
          "strike",
          "code",
          "link",
          "notionColor",
        ].includes(m.type)
      )
        throw new Error("Formatação não permitida.");
      if (m.type === "link" && !safeLink(String(m.attrs?.href ?? "")))
        throw new Error("Link inválido. Use https://, http:// ou mailto:.");
    }
    if (n.content !== undefined && !Array.isArray(n.content))
      throw new Error("Conteúdo inválido.");
    if (n.content)
      n.content.forEach((child) => check(child, n.type, depth + 1));
    return n;
  }
  const root = check(value, null, 0);
  if (
    root.type !== "doc" ||
    !Array.isArray(root.content) ||
    !root.content.length
  )
    throw new Error("Documento inválido.");
  return { type: "doc", content: root.content };
}
