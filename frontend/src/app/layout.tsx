import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Yuzu Finance · Bank Accounting Lab",
  description:
    "Explore a bank portfolio, IFRS 9 classification and the journal entries behind its balance sheet.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
