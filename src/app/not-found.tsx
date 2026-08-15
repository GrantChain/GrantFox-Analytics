import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        There is nothing at this address.
      </p>
      <Button asChild>
        <Link href="/">Back to analytics</Link>
      </Button>
    </div>
  );
}
