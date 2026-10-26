"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ArticleRichEditor from "./ArticleRichEditor";
import { EMPTY_DOCUMENT, type ArticleDocument } from "@/lib/article-document";
import type { EditableArticle } from "@/lib/article-store";
import styles from "@/app/dashboard/articles/articles.module.css";

type Summary = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt: string;
};
type UploadResult = {
  url: string;
  width: number;
  height: number;
  name: string;
};
type Draft = Omit<EditableArticle, "id" | "body" | "profiles" | "updatedAt"> & {
  id?: string;
};
const fresh = (): Draft => ({
  title: "",
  slug: "",
  number: "",
  subject: "",
  role: "",
  dek: "",
  cover: "/images/carpa.png",
  tags: [],
  date: new Date().toISOString().slice(0, 10),
  featured: false,
  published: false,
  demo: false,
  revision: 0,
  document: structuredClone(EMPTY_DOCUMENT),
});
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...options, cache: "no-store" });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("Sua sessão expirou. Recarregue a página e entre novamente.");
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw Error(data.error ?? "Não foi possível concluir a operação.");
  return data;
}
export default function ArticleManager() {
  const [items, setItems] = useState<Summary[]>([]),
    [article, setArticle] = useState<Draft | null>(null),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [loading, setLoading] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  useEffect(() => {
    let active = true;
    api<{ articles: Summary[] }>("/dashboard/api/articles")
      .then((d) => {
        if (active) setItems(d.articles);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function patch(values: Partial<Draft>) {
    setArticle((current) => (current ? { ...current, ...values } : current));
    setDirty(true);
    setMessage("");
  }
  async function select(id?: string) {
    if (
      dirty &&
      !window.confirm("Há alterações não salvas. Deseja descartá-las?")
    )
      return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      setArticle(
        id
          ? (
              await api<{ article: EditableArticle }>(
                `/dashboard/api/articles/${id}`,
              )
            ).article
          : fresh(),
      );
      setEditorKey((k) => k + 1);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) throw Error("Envie imagens de até 8 MB.");
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      return await api<UploadResult>("/dashboard/api/media", {
        method: "POST",
        body: form,
      });
    } finally {
      setUploading(false);
    }
  }
  async function save(published: boolean) {
    if (!article) return;
    if (
      article.published &&
      !published &&
      !window.confirm(
        "Salvar como rascunho retira este artigo do site. Continuar?",
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api<{ id: string; revision: number }>(
        article.id
          ? `/dashboard/api/articles/${article.id}`
          : "/dashboard/api/articles",
        {
          method: article.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...article, published }),
        },
      );
      setArticle({
        ...article,
        id: result.id,
        revision: result.revision,
        published,
      });
      setDirty(false);
      setItems(
        (await api<{ articles: Summary[] }>("/dashboard/api/articles"))
          .articles,
      );
      setMessage(
        published
          ? "Artigo publicado. A página pública já está atualizada."
          : "Rascunho salvo. Ele não aparece no site.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || uploading;
  return (
    <>
      <header className={styles.header}>
        <div>
          <p className="mono-label">Seu acervo</p>
          <h1 className="hand">Artigos</h1>
          <p>Escreva, guarde e publique no seu tempo.</p>
        </div>
        <button
          className={styles.primary}
          disabled={disabled}
          onClick={() => select()}
        >
          + Novo artigo
        </button>
      </header>
      <div role="status" aria-live="polite">
        {message && <p className={styles.success}>{message}</p>}
        {uploading && <p className={styles.notice}>Enviando imagem…</p>}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.workspace}>
        <aside className={styles.articleList} aria-label="Artigos do acervo">
          {loading ? (
            <p>Carregando artigos…</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                disabled={disabled}
                className={article?.id === item.id ? styles.selected : ""}
                onClick={() => select(item.id)}
              >
                <span className={styles.badge}>
                  {item.published ? "Publicado" : "Rascunho"}
                </span>
                <strong>{item.title || "Sem título"}</strong>
                <span className={styles.hint}>/archive/{item.slug}</span>
              </button>
            ))
          )}
          {!loading && !items.length && <p>Seu primeiro artigo começa aqui.</p>}
        </aside>
        {article ? (
          <section className={styles.form} aria-label="Editor de artigo">
            <div className={styles.actions}>
              <span className={styles.hint}>
                {dirty
                  ? "Alterações não salvas"
                  : article.id
                    ? `Salvo · versão ${article.revision}`
                    : "Novo rascunho"}
              </span>
              <div>
                {article.id && (
                  <Link
                    href={`/dashboard/articles/${article.id}/preview`}
                    target="_blank"
                    onClick={(event) => {
                      if (dirty) {
                        event.preventDefault();
                        setError("Salve o artigo antes de abrir a prévia.");
                      }
                    }}
                  >
                    Prévia ↗
                  </Link>
                )}
                <button disabled={disabled} onClick={() => save(false)}>
                  {article.published ? "Retirar do ar" : "Salvar rascunho"}
                </button>
                <button
                  className={styles.primary}
                  disabled={disabled}
                  onClick={() => save(true)}
                >
                  {busy
                    ? "Salvando…"
                    : article.published
                      ? "Salvar e atualizar"
                      : "Publicar"}
                </button>
              </div>
            </div>
            <label>
              Título
              <input
                className={styles.titleInput}
                value={article.title}
                disabled={disabled}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="O que você quer lembrar?"
                maxLength={500}
              />
            </label>
            <div className={styles.fields}>
              <label>
                Endereço do artigo
                <input
                  value={article.slug}
                  readOnly={!!article.id}
                  disabled={disabled}
                  onChange={(e) => patch({ slug: e.target.value })}
                  placeholder="ex.: minha-primeira-historia"
                  maxLength={120}
                />
                <small>
                  {article.id
                    ? "Endereço permanente para preservar os links existentes."
                    : "Use letras minúsculas, números e hífens."}
                </small>
              </label>
              <label>
                Número
                <input
                  value={article.number}
                  disabled={disabled}
                  onChange={(e) => patch({ number: e.target.value })}
                  placeholder="004"
                  maxLength={20}
                />
              </label>
              <label>
                Assunto / pessoa
                <input
                  value={article.subject}
                  disabled={disabled}
                  onChange={(e) => patch({ subject: e.target.value })}
                  maxLength={500}
                />
              </label>
              <label>
                Função / papel
                <input
                  value={article.role}
                  disabled={disabled}
                  onChange={(e) => patch({ role: e.target.value })}
                  maxLength={500}
                />
              </label>
              <label>
                Data de publicação
                <input
                  type="date"
                  value={article.date.slice(0, 10)}
                  disabled={disabled}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </label>
              <label>
                Tags, separadas por vírgula
                <input
                  value={article.tags.join(", ")}
                  disabled={disabled}
                  onChange={(e) =>
                    patch({
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  onBlur={() => patch({ tags: article.tags.filter(Boolean) })}
                />
              </label>
            </div>
            <label>
              Chamada
              <textarea
                value={article.dek}
                disabled={disabled}
                onChange={(e) => patch({ dek: e.target.value })}
                rows={3}
                maxLength={5000}
              />
            </label>
            <div className={styles.cover}>
              <Image
                src={article.cover}
                alt="Capa do artigo"
                width={240}
                height={160}
                unoptimized
              />
              <div>
                <strong>Capa</strong>
                <p className={styles.hint}>
                  Aparece na Home e na lista do Archive.
                </p>
                <label className={styles.fileButton}>
                  Trocar imagem
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    disabled={disabled}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file)
                        try {
                          const media = await upload(file);
                          patch({ cover: media.url });
                        } catch (err) {
                          setError((err as Error).message);
                        }
                    }}
                  />
                </label>
              </div>
            </div>
            <div className={styles.checks}>
              <label>
                <input
                  type="checkbox"
                  checked={!!article.featured}
                  disabled={disabled}
                  onChange={(e) => patch({ featured: e.target.checked })}
                />{" "}
                Artigo em destaque
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={article.demo}
                  disabled={disabled}
                  onChange={(e) => patch({ demo: e.target.checked })}
                />{" "}
                Demo
              </label>
            </div>
            <ArticleRichEditor
              key={`${article.id ?? "new"}-${editorKey}`}
              document={article.document}
              onChange={(document: ArticleDocument) => patch({ document })}
              upload={upload}
              onError={setError}
              disabled={disabled}
            />
            {article.published && (
              <Link
                className={styles.publicLink}
                href={`/archive/${article.slug}`}
                target="_blank"
              >
                Ver artigo no site ↗
              </Link>
            )}
          </section>
        ) : (
          <section className={styles.empty}>
            <h2 className="hand">Uma história de cada vez.</h2>
            <p>Escolha um artigo ao lado ou crie um novo.</p>
          </section>
        )}
      </div>
    </>
  );
}
