import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { PageErrorBoundary } from "@/components/ui/error-boundary";

export const metadata: Metadata = {
  title: "CRM Pro - Sales Platform",
  description: "Professional CRM system for managing contacts, deals, and pipeline",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        style={{ backgroundColor: '#F6F9FC', color: '#2D3E50' }}
        suppressHydrationWarning
      >
        <ToastProvider>
          <PageErrorBoundary>
            {children}
          </PageErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
