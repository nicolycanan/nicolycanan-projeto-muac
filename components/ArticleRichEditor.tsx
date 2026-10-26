"use client";
import { useRef, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Mark, mergeAttributes } from "@tiptap/core";
import type { ArticleDocument } from "@/lib/article-document";
import styles from "@/app/dashboard/articles/articles.module.css";

const NotionColor = Mark.create({
  name: "notionColor",
  addAttributes() {
    return { value: { default: "default" } };
  },
  parseHTML() {
    return [{ tag: "span[data-notion-color]" }];
  },
  renderHTML({ mark }) {
    return ["span", { "data-notion-color": mark.attrs.value }, 0];
  },
});
const CaptionImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: "" },
      width: { default: null },
      height: { default: null },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { caption, ...image } = HTMLAttributes;
    return [
      "figure",
      {},
      ["img", mergeAttributes(image)],
      ...(caption ? [["figcaption", {}, String(caption)]] : []),
    ];
  },
});
type Props = {
  document: ArticleDocument;
  onChange: (doc: ArticleDocument) => void;
  upload: (
    file: File,
  ) => Promise<{ url: string; width: number; height: number; name: string }>;
  onError: (message: string) => void;
  disabled: boolean;
};
export default function ArticleRichEditor({
  document,
  onChange,
  upload,
  onError,
  disabled,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        link: { openOnClick: false },
      }),
      CaptionImage,
      Placeholder.configure({
        placeholder:
          "Comece a escrever. Use a barra acima para inserir títulos, citações e imagens.",
      }),
      NotionColor,
    ],
    content: document,
    editorProps: {
      attributes: {
        class: styles.prose,
        role: "textbox",
        "aria-label": "Texto do artigo",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as ArticleDocument),
  });
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  function link() {
    if (!editor) return;
    const value = window.prompt(
      "Endereço do link (https:// ou mailto:)",
      String(editor.getAttributes("link").href ?? ""),
    );
    if (value === null) return;
    if (!value) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    try {
      const u = new URL(value);
      if (!["http:", "https:", "mailto:"].includes(u.protocol)) throw Error();
      editor.chain().focus().setLink({ href: value }).run();
    } catch {
      onError("Use um endereço de link válido.");
    }
  }
  function caption() {
    if (!editor?.isActive("image")) {
      onError("Selecione uma imagem no texto para editar sua legenda.");
      return;
    }
    const attrs = editor.getAttributes("image");
    const value = window.prompt(
      "Legenda da imagem",
      String(attrs.caption ?? ""),
    );
    if (value === null) return;
    const alt = window.prompt(
      "Descrição da imagem para acessibilidade",
      String(attrs.alt ?? value),
    );
    if (alt === null) return;
    editor
      .chain()
      .focus()
      .updateAttributes("image", { caption: value, alt })
      .run();
    onChange(editor.getJSON() as ArticleDocument);
  }
  return (
    <div className={styles.editorSurface}>
      <div
        className={styles.toolbar}
        role="toolbar"
        aria-label="Formatação do artigo"
      >
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Negrito (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Itálico (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Sublinhado"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="Tachado"
        >
          <s>S</s>
        </button>
        <button type="button" disabled={disabled || !editor} onClick={link}>
          Link
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          Texto
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Título
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          Citação
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => input.current?.click()}
        >
          + Imagem
        </button>
        <button type="button" disabled={disabled || !editor} onClick={caption}>
          Legenda
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().undo().run()}
          title="Desfazer"
        >
          ↶
        </button>
        <button
          type="button"
          disabled={disabled || !editor}
          onClick={() => editor?.chain().focus().redo().run()}
          title="Refazer"
        >
          ↷
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || !editor) return;
          try {
            const media = await upload(file);
            editor
              .chain()
              .focus()
              .setImage({
                src: media.url,
                alt: "",
                ...{ width: media.width, height: media.height },
              })
              .run();
          } catch (e) {
            onError(e instanceof Error ? e.message : "Erro ao enviar imagem.");
          }
        }}
      />
      <EditorContent editor={editor} />
      <p className={styles.hint}>
        Selecione o texto para formatar. Imagens: PNG, JPG, WebP ou GIF, até 8
        MB. Selecione uma imagem e use “Legenda” para descrevê-la.
      </p>
    </div>
  );
}
