import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: '--font-ibm-plex-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'SARA — Sistema de Agentes de Rescate Autónomo',
  description: 'Proyecto Final · Inteligencia Artificial · UMG Antigua',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} h-full`}
    >
      <body className="h-full bg-blueprint-bg text-blueprint-text antialiased">
        {children}
      </body>
    </html>
  );
}
