import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-container/20 p-4">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-lg">
            <span className="material-symbols-outlined text-on-primary">token</span>
          </div>
          <h1 className="text-headline-lg tracking-tight text-primary">Zovi</h1>
        </div>
        <p className="text-label-caps uppercase tracking-widest text-on-secondary-container">
          Institutional Vault
        </p>
        <p className="mt-3 max-w-sm text-body-sm text-on-secondary-container">
          Escrow-protected B2B trade between verified buyers and suppliers.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
          <div className="border-b bg-surface-container-low px-6 py-3 text-headline-md">
            Sign in
          </div>
          <div className="p-6">
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              className="h-11 w-full gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">lock</span>
              Sign in to your account
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
          <div className="border-b bg-surface-container-low px-6 py-3 text-headline-md">
            New here?
          </div>
          <div className="p-6">
            <Button
              render={<Link href="/register" />}
              nativeButton={false}
              variant="outline"
              className="h-11 w-full gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                account_balance
              </span>
              Register a company
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
