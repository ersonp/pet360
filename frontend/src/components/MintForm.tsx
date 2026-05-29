'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { MintResult } from './MintResult';

interface MintResponse {
  tokenId: string;
  txHash: string;
  tokenURI: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '';

// MintForm — pet registration form that triggers NFT minting.
// Visible only when wallet is connected (ownerAddress = connected wallet).
// Submits multipart/form-data to POST /passport/mint on the NestJS API.
export function MintForm() {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MintResponse | null>(null);

  if (!address) {
    return (
      <p className="text-center text-gray-500 py-8">
        Connect your wallet to mint a pet passport.
      </p>
    );
  }

  if (result) {
    return (
      <MintResult
        tokenId={result.tokenId}
        txHash={result.txHash}
        tokenURI={result.tokenURI}
        contractAddress={CONTRACT_ADDRESS}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    data.set('ownerAddress', address as string);

    try {
      const res = await fetch(`${API_URL}/passport/mint`, {
        method: 'POST',
        body: data,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
      }

      const json = await res.json() as MintResponse;
      setResult(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Mint failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
        Minting to: <span className="font-mono">{address}</span>
      </div>

      <Field label="Pet Name" name="name" placeholder="Rex" required />
      <Field label="Species" name="species" placeholder="dog" required />
      <Field label="Breed" name="breed" placeholder="Golden Retriever" required />
      <Field label="Date of Birth" name="dob" type="date" required />
      <Field label="Pet ID" name="petId" placeholder="pet-001" required />

      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Photo <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className="block w-full text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700"
        />
      </div>

      {error && (
        <p className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Minting… (10–30s on Mumbai)' : 'Mint Pet Passport'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}
