import type { Metadata } from "next";
import "./globals.css";
import "@trycourier/courier-editor/styles.css";

export const metadata: Metadata = {
  title: "Editor Demo",
  description: "Demo of react-editor package",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
