'use client';

import dynamic from 'next/dynamic';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig, isLocalMode } from '@/lib/wagmi.config';

// QueryClient must be created outside the component to avoid re-creation on render.
const queryClient = new QueryClient();

// Inner provider — contains WalletConnect which accesses localStorage.
// Must only run client-side (localStorage doesn't exist on the server).
function Web3ProviderInner({ children }: { children: React.ReactNode }) {
  if (isLocalMode) {
    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Exported provider — dynamically imported with ssr: false so Next.js never
// runs it on the server. Without this, WalletConnect crashes with
// "localStorage.getItem is not a function" during SSR.
export const Web3Provider = dynamic(
  () => Promise.resolve(Web3ProviderInner),
  { ssr: false },
) as typeof Web3ProviderInner;
