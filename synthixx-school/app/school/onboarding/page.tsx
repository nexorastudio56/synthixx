"use client";

import Link from "next/link";
import { PageHeader } from "@/components/school/ui";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="You're all set"
        description="Your school is ready. Start by adding students and teachers."
      />
      <Link
        href="/school"
        className="inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
