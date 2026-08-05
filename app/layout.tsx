import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { InstallPwaPrompt } from "@/components/install-pwa-prompt";
import { PwaInstallProvider } from "@/components/pwa-install-context";

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Painel de Controle",
  description: "Painel de controle criado com Next.js e shadcn/ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${notoSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <PwaInstallProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster />
            <InstallPwaPrompt />
          </PwaInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
