"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground">
        The payment data could not be loaded. This is usually temporary.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
