import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        textAlign: "center",
        padding: "var(--edge)",
      }}
    >
      <span className="mono-label">404</span>
      <h1 className="hand" style={{ fontSize: "var(--fs-hand-lg)" }}>
        isso ainda não existe por aqui.
      </h1>
      <Link href="/" style={{ color: "var(--stamp-ink)" }}>
        voltar para a home
      </Link>
    </div>
  );
}
