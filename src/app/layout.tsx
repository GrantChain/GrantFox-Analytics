import type { Metadata } from "next";
import Script from "next/script";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import { poppins, uncutSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrantFox Analytics",
  description:
    "View every payment GrantFox has released to open-source contributors and project maintainers, by project and campaign.",
  openGraph: {
    title: "GrantFox Analytics",
    description:
      "View every payment GrantFox has released to open-source contributors and project maintainers, by project and campaign.",
    type: "website",
  },
};

const THEME_INIT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${uncutSans.variable} ${poppins.variable}`}>
      <Script id="theme-init" strategy="beforeInteractive">
        {THEME_INIT}
      </Script>
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
