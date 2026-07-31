"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TAX_ID_PATTERNS: Record<string, RegExp> = {
  GR: /^\d{9}$/,
  DE: /^DE\d{9}$/,
  FR: /^FR[A-Z0-9]{2}\d{9}$/,
  IT: /^IT\d{11}$/,
};

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, "At least 8 characters"),
    country: z.string().length(2),
    taxId: z.string().min(4),
    role: z.enum(["BUYER", "SUPPLIER"]),
  })
  .superRefine((data, ctx) => {
    const pattern = TAX_ID_PATTERNS[data.country];
    if (pattern && !pattern.test(data.taxId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["taxId"],
        message: `Tax ID does not match the ${data.country} format.`,
      });
    }
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: "GR", role: "BUYER" },
  });

  const country = watch("country");

  async function onSubmit(values: RegisterForm) {
    setServerError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setServerError(body.error?.message ?? body.error ?? "Registration failed.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-surface-container-lowest px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="material-symbols-outlined text-[18px] text-on-primary">
                token
              </span>
            </div>
            <span className="text-headline-md font-bold text-primary">Zovi</span>
          </div>
          <div className="hidden h-6 w-px bg-border sm:block" />
          <div className="hidden text-body-sm text-on-secondary-container sm:block">
            Institutional Onboarding
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div className="space-y-2">
            <h1 className="text-headline-lg text-primary">Establish Your Identity</h1>
            <p className="text-body-lg text-on-secondary-container">
              Provide your legal business credentials. We cross-reference this
              information with AADE and VIES registries for immediate verification.
            </p>
          </div>

          {success ? (
            <div className="overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
              <div className="flex items-center gap-3 border-b bg-success-emerald/10 px-6 py-4">
                <span className="material-symbols-outlined text-success-emerald">
                  check_circle
                </span>
                <span className="text-body-sm font-bold text-primary">
                  Registration submitted
                </span>
              </div>
              <div className="p-8 text-body-sm text-on-secondary-container">
                Your company has been verified and your account created. You can now{" "}
                <a href="/login" className="font-semibold text-primary underline">
                  sign in
                </a>
                .
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-surface-container-lowest shadow-sm">
              <div className="flex items-center justify-between border-b bg-surface-container px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-on-secondary-container">
                    account_balance
                  </span>
                  <span className="text-label-caps uppercase text-on-secondary-container">
                    Registry Connection
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-surface-variant px-3 py-1">
                  <span className="h-2 w-2 rounded-full bg-outline" />
                  <span className="text-label-caps uppercase text-on-surface-variant">
                    Pending Information
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-8">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="col-span-full space-y-1.5">
                    <Label htmlFor="email" className="text-label-caps uppercase text-on-surface-variant">
                      Email
                    </Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="col-span-full space-y-1.5">
                    <Label htmlFor="password" className="text-label-caps uppercase text-on-surface-variant">
                      Password
                    </Label>
                    <Input id="password" type="password" {...register("password")} />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-label-caps uppercase text-on-surface-variant">
                      Account type
                    </Label>
                    <Select
                      defaultValue="BUYER"
                      onValueChange={(value) =>
                        value && setValue("role", value as "BUYER" | "SUPPLIER")
                      }
                    >
                      <SelectTrigger id="role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUYER">Buyer</SelectItem>
                        <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="country" className="text-label-caps uppercase text-on-surface-variant">
                      Country of registration
                    </Label>
                    <Select
                      defaultValue="GR"
                      onValueChange={(value) => value && setValue("country", value)}
                    >
                      <SelectTrigger id="country" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GR">Greece</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="FR">France</SelectItem>
                        <SelectItem value="IT">Italy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-full space-y-1.5">
                    <Label htmlFor="taxId" className="text-label-caps uppercase text-on-surface-variant">
                      {country === "GR" ? "AFM" : "VAT / Tax ID"}
                    </Label>
                    <Input id="taxId" {...register("taxId")} />
                    {errors.taxId && (
                      <p className="text-sm text-destructive">{errors.taxId.message}</p>
                    )}
                  </div>
                </div>

                {serverError && <p className="text-sm text-destructive">{serverError}</p>}

                <Button type="submit" className="h-11 w-full gap-2" disabled={isSubmitting}>
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  {isSubmitting ? "Verifying via AADE / VIES…" : "Validate & Register"}
                </Button>
                <p className="text-center text-[11px] text-on-secondary-container">
                  Data is processed through encrypted channels to government registries.
                </p>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border bg-surface-bright p-4">
              <span className="material-symbols-outlined text-on-secondary-container">
                security
              </span>
              <h4 className="text-label-caps text-primary">Encrypted Vault</h4>
              <p className="text-[12px] text-on-secondary-container">
                Your financial identifiers are encrypted at rest using Argon2id and
                AES-256 standards.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border bg-surface-bright p-4">
              <span className="material-symbols-outlined text-on-secondary-container">
                history
              </span>
              <h4 className="text-label-caps text-primary">Audit Trail</h4>
              <p className="text-[12px] text-on-secondary-container">
                All registry checks are logged for compliance auditing purposes.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
