import { WalletConnectButton } from '@/components/WalletConnectButton';
import { MintForm } from '@/components/MintForm';

// Demo page — shows the full mint flow end to end:
//   1. Connect MetaMask via RainbowKit
//   2. Fill pet details + upload photo
//   3. API mints NFT on Polygon Mumbai
//   4. View result + Polygonscan link
export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pet360</h1>
          <p className="text-xs text-gray-500">NFT Passport Demo — Polygon Mumbai</p>
        </div>
        <WalletConnectButton />
      </header>

      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-xl bg-white shadow-sm border p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Mint Pet Passport</h2>
            <p className="text-sm text-gray-500 mt-1">
              Creates an ERC-721 NFT on Polygon Mumbai with the pet&apos;s identity and photo stored on IPFS.
            </p>
          </div>
          <MintForm />
        </div>
      </div>
    </main>
  );
}
