'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { isLocalMode } from '@/lib/wagmi.config';

// Local mode: MetaMask extension only, no WalletConnect modal.
function LocalConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <button onClick={() => disconnect()}>
        {address?.slice(0, 6)}...{address?.slice(-4)} (disconnect)
      </button>
    );
  }
  return (
    <button onClick={() => connect({ connector: connectors[0] })}>
      Connect Wallet
    </button>
  );
}

// Full mode: RainbowKit modal with WalletConnect + MetaMask + others.
export function WalletConnectButton() {
  if (isLocalMode) return <LocalConnectButton />;
  return <ConnectButton />;
}
