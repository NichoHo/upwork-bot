"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { requestMagicLink } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CALLBACK_ERRORS: Record<string, string> = {
  link_invalid:
    "That link already expired or was already opened (some email apps open links automatically to scan them). Request a new one and click it right away.",
  provisioning_failed:
    "Something went wrong signing you in. Try again, and tell Nicholas if it keeps happening.",
};

function CallbackError() {
  const message = CALLBACK_ERRORS[useSearchParams().get("error") ?? ""];
  if (!message) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(requestMagicLink, {
    error: null,
    sent: false,
  });

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Proposal Desk</CardTitle>
          <CardDescription>
            Sign in with the email on the allowlist. We&apos;ll send a link,
            no password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <CallbackError />
          </Suspense>
          {state.sent ? (
            <Alert>
              <AlertDescription>
                Check your email for the sign-in link.
              </AlertDescription>
            </Alert>
          ) : (
            <form action={formAction}>
              <FieldGroup>
                <Field data-invalid={!!state.error}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@skydecklabs.com"
                    aria-invalid={!!state.error}
                    autoComplete="email"
                    required
                  />
                  {state.error ? (
                    <FieldDescription className="text-destructive">
                      {state.error}
                    </FieldDescription>
                  ) : null}
                </Field>
                <Button type="submit" disabled={pending}>
                  {pending ? "Sending..." : "Send magic link"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
