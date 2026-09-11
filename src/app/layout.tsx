import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Deskload",
  description:
    "Deskload records the full production history of every story — not just the byline — so newsrooms can see who's actually holding the issue together.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AppNav user={user} />
        <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-8">
          {children}
        </main>
        <footer className="border-t border-line mt-12">
          <div className="max-w-6xl mx-auto px-5 py-5 text-xs text-muted">
            Deskload is a workload-balancing and recognition tool, not a
            productivity leaderboard.
          </div>
        </footer>
      </body>
    </html>
  );
}
