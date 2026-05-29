'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

// Thin wrapper around RainbowKit's ConnectButton.
// Disconnected: shows "Connect Wallet" → opens MetaMask/wallet modal.
// Connected: shows truncated address + chain + disconnect option.
export function WalletConnectButton() {
  return <ConnectButton />;
}
