import type { Metadata } from 'next';
import { Web3Provider } from '@/providers/Web3Provider';
import '@rainbow-me/rainbowkit/styles.css';

export const metadata: Metadata = {
  title: 'Pet360 — NFT Passport Demo',
  description: 'Mint blockchain pet passports on Polygon',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
