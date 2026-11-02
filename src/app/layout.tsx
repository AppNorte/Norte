import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/store/StoreProvider";
import { ToastProvider } from "@/components/ui";
import { ServiceWorker } from "@/components/ServiceWorker";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "NORTE",
  description: "Direção para uma vida com propósito. Rotina, leitura, família e um assistente que ajuda a organizar o dia.",
  applicationName: "NORTE",
  appleWebApp: { capable: true, title: "NORTE", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e2a45",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <StoreProvider>
          <ToastProvider>
            <div className="app">{children}</div>
          </ToastProvider>
        </StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
