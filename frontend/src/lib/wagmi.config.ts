import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai } from 'wagmi/chains';

// Wagmi config — connects to Polygon Mumbai (testnet) and Polygon mainnet.
// WalletConnect project ID is required for RainbowKit's multi-wallet modal.
// Get one free at https://cloud.walletconnect.com
// WalletConnect requires a real projectId in production.
// For local dev without a projectId, wallet connect modal won't open but
// the page will still render. Get one free at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'demo';

export const wagmiConfig = getDefaultConfig({
  appName: 'Pet360',
  projectId,
  chains: [polygonMumbai, polygon],
  ssr: true, // required for Next.js App Router
});
