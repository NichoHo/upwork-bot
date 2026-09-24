import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Not on the allowlist</CardTitle>
          <CardDescription>
            This email isn&apos;t authorized for Proposal Desk. Ask Nicholas
            or Waleed to add it if that&apos;s wrong.
          </CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
