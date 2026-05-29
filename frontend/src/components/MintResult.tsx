'use client';

interface MintResultProps {
  tokenId: string;
  txHash: string;
  tokenURI: string;
  contractAddress: string;
}

// Displays the result after a successful mint.
// Shows tokenId, txHash, and a direct link to the NFT on Polygonscan Mumbai.
export function MintResult({ tokenId, txHash, tokenURI, contractAddress }: MintResultProps) {
  const polygonscanBase = 'https://mumbai.polygonscan.com';
  const tokenUrl = `${polygonscanBase}/token/${contractAddress}?a=${tokenId}`;
  const txUrl = `${polygonscanBase}/tx/${txHash}`;

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-3">
      <h2 className="text-lg font-semibold text-green-800">Passport Minted!</h2>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-600">Token ID: </span>
          <span className="font-mono text-gray-900">#{tokenId}</span>
        </div>

        <div>
          <span className="font-medium text-gray-600">Transaction: </span>
          <a
            href={txUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-blue-600 hover:underline break-all"
          >
            {txHash.slice(0, 20)}…
          </a>
        </div>

        <div>
          <span className="font-medium text-gray-600">Metadata: </span>
          <span className="font-mono text-gray-700 break-all text-xs">{tokenURI}</span>
        </div>
      </div>

      <a
        href={tokenUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        View on Polygonscan →
      </a>
    </div>
  );
}
