import { Poppins } from "next/font/google";
import localFont from "next/font/local";

export const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const uncutSans = localFont({
  src: "./uncut-sans.woff2",
  variable: "--font-uncut-sans",
  display: "swap",
  weight: "100 900",
});
