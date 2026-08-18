"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/logs", label: "Logs" },
];

const quickLinks = [
  { href: "/archive", label: "Archive" },
  { href: "/gallery", label: "Gallery" },
  { href: "/radio", label: "Radio" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={`container ${styles.shell}`}>
      <aside className={styles.sidebar} aria-label="Sidebar do painel administrativo">
        <div className={styles.brand}>
          <span className="mono-label">MUAC</span>
          <strong>Admin</strong>
        </div>

        <nav className={styles.nav} aria-label="Navegação do painel administrativo">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}

          <div className={styles.divider} aria-hidden="true" />

          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navItemSecondary}>
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className={styles.backLink}>
          Voltar ao site
        </Link>
      </aside>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
