import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { polygon, polygonMumbai } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Local mode: no WalletConnect project ID set.
// Uses injected connector only (MetaMask browser extension).
// Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID for full multi-wallet support.
export const isLocalMode = !projectId;

export const wagmiConfig = isLocalMode
  ? createConfig({
      chains: [polygonMumbai, polygon],
      connectors: [injected()],
      transports: {
        [polygonMumbai.id]: http(),
        [polygon.id]: http(),
      },
      ssr: true,
    })
  : getDefaultConfig({
      appName: 'Pet360',
      projectId: projectId as string,
      chains: [polygonMumbai, polygon],
      ssr: true,
    });
