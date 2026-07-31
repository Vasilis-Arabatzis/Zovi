"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Role = "BUYER" | "SUPPLIER" | "SUPER_ADMIN";

const NAV_ITEMS: { href: string; label: string; icon: string; roles: Role[] }[] = [
  { href: "/buyer", label: "Dashboard", icon: "dashboard", roles: ["BUYER"] },
  { href: "/supplier", label: "Dashboard", icon: "dashboard", roles: ["SUPPLIER"] },
  { href: "/admin", label: "Overview", icon: "dashboard", roles: ["SUPER_ADMIN"] },
  { href: "/products", label: "Marketplace", icon: "search", roles: ["BUYER", "SUPPLIER"] },
  { href: "/supplier/products", label: "My Products", icon: "inventory_2", roles: ["SUPPLIER"] },
  { href: "/watchlist", label: "Watchlist", icon: "visibility", roles: ["BUYER", "SUPPLIER"] },
  { href: "/admin/fraud", label: "Fraud & Audit", icon: "shield_person", roles: ["SUPER_ADMIN"] },
  { href: "/admin/disputes", label: "Disputes", icon: "gavel", roles: ["SUPER_ADMIN"] },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings",
    roles: ["BUYER", "SUPPLIER", "SUPER_ADMIN"],
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
        <span className="material-symbols-outlined text-on-primary">token</span>
      </div>
      <div>
        <h1 className="text-headline-md font-bold text-primary leading-none">ZOVI</h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
          Institutional Vault
        </p>
      </div>
    </div>
  );
}

function NavLinks({ role }: { role: Role }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  return (
    <nav className="flex-1 space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-on-secondary-container transition-colors hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-body-sm text-on-secondary-container transition-colors hover:bg-surface-container-low"
    >
      <span className="material-symbols-outlined text-[20px]">logout</span>
      Sign out
    </button>
  );
}

export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-2 border-r bg-surface-container-lowest p-4 lg:flex">
        <div className="mb-8 px-2">
          <Logo />
        </div>
        <NavLinks role={role} />
        <div className="mt-auto space-y-1 border-t pt-4">
          <SignOutButton />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-surface px-4 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={<Button variant="outline" size="icon" aria-label="Open navigation" />}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  menu
                </span>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <div className="mb-8 px-2">
                  <Logo />
                </div>
                <NavLinks role={role} />
                <div className="mt-auto space-y-1 border-t pt-4">
                  <SignOutButton />
                </div>
              </SheetContent>
            </Sheet>
            <span className="text-headline-md font-bold text-primary">Zovi</span>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3 rounded-full border bg-surface-container-high px-3 py-1.5">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              account_circle
            </span>
            <span className="text-mono-data font-mono-data uppercase text-on-surface-variant">
              {role.replace("_", " ")}
            </span>
          </div>
        </header>

        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
