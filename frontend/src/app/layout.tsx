import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RentalCircle — Zero-Brokerage Verified Real-Estate Marketplace",
  description: "Direct owner connections for residential and commercial properties in India with zero brokerage fees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-sand text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
