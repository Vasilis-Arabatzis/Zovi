"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to change password.");
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  if (success) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-success-emerald/10 p-4">
        <span className="material-symbols-outlined text-success-emerald">check_circle</span>
        <p className="text-body-sm text-primary">
          Password changed. All sessions were signed out — redirecting to sign in…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword" className="text-label-caps uppercase text-on-surface-variant">
          Current password
        </Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-label-caps uppercase text-on-surface-variant">
          New password
        </Label>
        <Input id="newPassword" name="newPassword" type="password" minLength={8} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-label-caps uppercase text-on-surface-variant">
          Confirm new password
        </Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function TwoFactorSettings({
  role,
  initialEnabled,
  mandatory,
}: {
  role: "BUYER" | "SUPPLIER" | "SUPER_ADMIN";
  initialEnabled: boolean;
  mandatory: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function startEnrollment() {
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/2fa", { method: "POST" });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Could not start 2FA setup.");
      return;
    }
    setQrCode(body.qrCodeDataUrl);
  }

  async function verifyEnrollment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/auth/2fa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(body.error ?? "Invalid code.");
      return;
    }
    setEnabled(true);
    setQrCode(null);
    router.refresh();
  }

  async function disable() {
    if (!confirm("Disable two-factor authentication?")) return;
    setPending(true);
    const res = await fetch("/api/auth/2fa", { method: "DELETE" });
    setPending(false);
    if (res.ok) {
      setEnabled(false);
      router.refresh();
    }
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg bg-success-emerald/10 p-4">
          <span className="material-symbols-outlined text-success-emerald">verified_user</span>
          <p className="text-body-sm text-primary">
            Two-factor authentication is enabled for this account.
          </p>
        </div>
        {role === "BUYER" ? (
          <Button variant="outline" onClick={disable} disabled={pending}>
            Disable 2FA
          </Button>
        ) : (
          <p className="text-[12px] text-on-surface-variant">
            2FA is mandatory for {role === "SUPPLIER" ? "supplier" : "admin"} accounts and cannot
            be disabled.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mandatory && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-amber/30 bg-warning-amber/10 p-4">
          <span className="material-symbols-outlined text-warning-amber">warning</span>
          <p className="text-body-sm text-primary">
            Two-factor authentication is required for your account type. Complete setup below to
            unlock your dashboard.
          </p>
        </div>
      )}

      {!qrCode ? (
        <Button onClick={startEnrollment} disabled={pending} className="gap-2">
          <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
          {pending ? "Generating…" : "Set up authenticator"}
        </Button>
      ) : (
        <div className="space-y-4">
          <p className="text-body-sm text-on-secondary-container">
            Scan this QR code with Google Authenticator, Authy, or any TOTP app, then enter the
            6-digit code it generates.
          </p>
          <Image src={qrCode} alt="2FA QR code" width={200} height={200} className="rounded-lg border" />
          <form onSubmit={verifyEnrollment} className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="totp-code" className="text-label-caps uppercase text-on-surface-variant">
                Authenticator code
              </Label>
              <Input
                id="totp-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Verifying…" : "Verify & enable"}
            </Button>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
