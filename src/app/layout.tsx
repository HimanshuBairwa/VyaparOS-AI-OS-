import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VyaparOS AI — Autonomous Merchant Decision Intelligence (व्यापारOS)',
  description: 'AI purchasing decision workspace & growth copilot for Indian retail merchants. Independent prototype for Paytm Merchant Growth AI track.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAF9F6] text-[#0F172A] selection:bg-teal-100 selection:text-teal-900">
        {children}
      </body>
    </html>
  );
}
