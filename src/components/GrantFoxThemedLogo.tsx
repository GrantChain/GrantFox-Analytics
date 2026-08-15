import Image from "next/image";

import { cn } from "@/lib/utils";

export const GRANTFOX_LOGO_GRANTFOX = {
  light: "/logos/black-grantfox.svg",
  dark: "/logos/white-grantfox.svg",
} as const;

export const GRANTFOX_LOGO_MARK = {
  light: "/logos/black-logo.svg",
  dark: "/logos/white-logo.svg",
} as const;

export type GrantFoxThemedLogoProps = {
  /** `grantfox` = full wordmark; `mark` = icon only. */
  variant?: "grantfox" | "mark";
  width: number;
  height: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

export const GrantFoxThemedLogo = ({
  variant = "grantfox",
  width,
  height,
  className,
  alt = "GrantFox",
  priority = false,
}: GrantFoxThemedLogoProps) => {
  const pair =
    variant === "mark" ? GRANTFOX_LOGO_MARK : GRANTFOX_LOGO_GRANTFOX;

  return (
    <div className={cn("relative shrink-0", className)} style={{ width, height }}>
      <Image
        src={pair.light}
        alt={alt}
        fill
        sizes={`${width}px`}
        className="object-contain dark:hidden"
        priority={priority}
      />
      <Image
        src={pair.dark}
        alt={alt}
        fill
        sizes={`${width}px`}
        className="hidden object-contain dark:block"
        priority={priority}
      />
    </div>
  );
};
