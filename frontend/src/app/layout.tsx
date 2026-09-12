import type { Metadata } from "next";
import "./globals.css";
import PortfolioBar from "./components/PortfolioBar";
import CitrusLoader from "./components/CitrusLoader";
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
      <body>
        <PortfolioBar />
        <CitrusLoader />
        {children}
      </body>
    </html>
  );
}
