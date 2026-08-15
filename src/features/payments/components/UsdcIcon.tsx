import Image from "next/image";

export function UsdcIcon({ className = "size-5" }: { className?: string }) {
  return (
    <Image
      src="/icons/usdc.webp"
      alt="USDC"
      width={32}
      height={32}
      className={`inline-block shrink-0 rounded-full align-[-0.12em] ${className}`}
      unoptimized
    />
  );
}
