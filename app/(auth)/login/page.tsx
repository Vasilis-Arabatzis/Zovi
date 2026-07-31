"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [requiresTotp, setRequiresTotp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setServerError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const body = await res.json().catch(() => ({}));

    if (res.status === 429) {
      setServerError("Too many login attempts. Try again later.");
      return;
    }

    if (!res.ok) {
      setServerError(body.error ?? "Login failed.");
      return;
    }

    if (body.requiresTotp) {
      setRequiresTotp(true);
      return;
    }

    if (body.requires2faSetup) {
      router.push("/settings");
      router.refresh();
      return;
    }

    const dashboardByRole: Record<string, string> = {
      BUYER: "/buyer",
      SUPPLIER: "/supplier",
      SUPER_ADMIN: "/admin",
    };

    router.push(dashboardByRole[body.role] ?? "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-container/20 p-4">
      <main className="w-full max-w-[440px]">
        <div className="mb-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg">
              <span className="material-symbols-outlined text-on-primary">token</span>
            </div>
            <h1 className="text-headline-lg tracking-tight text-primary">Zovi</h1>
          </div>
          <p className="text-label-caps uppercase tracking-widest text-on-secondary-container">
            Institutional Vault Access
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-surface-container-lowest/80 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-md">
          <div className="flex items-center justify-between bg-primary-container px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success-emerald" />
              <span className="text-mono-data font-mono-data uppercase tracking-wider text-on-primary-container">
                AES-256 Encryption Active
              </span>
            </div>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-2 text-label-caps uppercase text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                  Corporate email
                </Label>
                <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="flex items-center gap-2 text-label-caps uppercase text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">vpn_key</span>
                  Security key
                </Label>
                <Input id="password" type="password" placeholder="••••••••••••" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {requiresTotp && (
                <div className="space-y-1.5">
                  <Label htmlFor="totpCode" className="flex items-center gap-2 text-label-caps uppercase text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">shield_lock</span>
                    Authenticator code
                  </Label>
                  <Input id="totpCode" maxLength={6} {...register("totpCode")} />
                </div>
              )}

              {serverError && <p className="text-sm text-destructive">{serverError}</p>}

              <Button type="submit" className="h-14 w-full gap-3 text-headline-md" disabled={isSubmitting}>
                <span className="material-symbols-outlined">lock</span>
                {isSubmitting ? "Authenticating…" : "Sign in with 2FA"}
              </Button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-body-sm text-on-secondary-container">
                Don&apos;t have an account?{" "}
                <a href="/register" className="font-semibold text-primary underline">
                  Register your company
                </a>
              </p>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-body-sm text-on-secondary-container/60">
          Unauthorized access is strictly prohibited and subject to legal action.
          <br />
          Monitoring and logging is active for all vault sessions.
        </p>
      </main>
    </div>
  );
}
