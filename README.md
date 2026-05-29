# Pet360 Web3

Blockchain layer for Pet360 — the first blockchain-based pet ecosystem in Latin America.
Adds NFT pet passports, vaccine certificates, and smart contract adoptions to the
existing Pet360 Web2 SaaS platform (Vercel, 75% complete).

**Chain:** Polygon (Amoy testnet → mainnet)
**Stack:** Solidity · Hardhat · Foundry · NestJS · ethers.js · Next.js · Wagmi · RainbowKit

---

## Repo Structure

```
pet360/
├── contracts/              # Solidity smart contracts
│   ├── PetPassport.sol     # ERC-721 UUPS — one NFT per pet
│   └── interfaces/
├── scripts/                # Deploy and upgrade scripts
│   ├── deploy-pet-passport.ts
│   └── upgrade-pet-passport.ts
├── test/
│   ├── PetPassport.test.ts # Hardhat TypeScript tests (27)
│   └── foundry/
│       └── PetPassport.t.sol  # Foundry fuzz + unit tests (26)
├── deployments/            # Per-network deployed addresses (JSON)
├── api/                    # NestJS blockchain bridge API
│   └── src/
│       ├── ipfs/           # Pinata IPFS upload service
│       ├── passport/       # POST /passport/mint endpoint
│       └── blockchain/     # ethers.js contract wrapper
├── frontend/               # Next.js demo (wallet connect + mint UI)
│   └── src/
│       ├── app/            # Next.js App Router pages
│       ├── components/     # WalletConnectButton, MintForm, MintResult
│       ├── providers/      # Wagmi + RainbowKit Web3Provider
│       └── lib/            # wagmi config
└── docs/
    └── architecture.md     # Full architecture reference
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22.x | https://nodejs.org |
| npm | ≥ 11.10.0 | `npm install -g npm@latest` |
| Foundry | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| MetaMask | browser extension | https://metamask.io |

**Accounts needed for full demo:**
- [Pinata](https://app.pinata.cloud) — free account, get JWT + gateway
- [WalletConnect Cloud](https://cloud.walletconnect.com) — free project ID
- [Alchemy](https://alchemy.com) or [Infura](https://infura.io) — free Amoy RPC URL
- [Polygonscan](https://polygonscan.com/myapikey) — free API key for contract verification

---

## Setup

### 1 — Install root dependencies (contracts + scripts)

```bash
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
PRIVATE_KEY=             # deployer wallet private key (no 0x prefix)
AMOY_RPC_URL=          # e.g. https://polygon-amoy.g.alchemy.com/v2/<key>
POLYGONSCAN_API_KEY=     # from polygonscan.com/myapikey
MINTER_ADDRESS=          # wallet address that gets MINTER_ROLE
UPGRADER_ADDRESS=        # wallet address that gets UPGRADER_ROLE (can be same as deployer for dev)
```

### 3 — Install API dependencies

```bash
npm install --prefix api
```

Configure `api/.env`:

```bash
cp api/.env.example api/.env
```

```
PORT=3000
PINATA_JWT=              # from app.pinata.cloud/developers/api-keys
PINATA_GATEWAY=          # e.g. example-gateway.mypinata.cloud
CONTRACT_ADDRESS=        # filled after deploy (step 6)
MINTER_PRIVATE_KEY=      # private key of the wallet with MINTER_ROLE
POLYGON_RPC_URL=         # same as AMOY_RPC_URL above
```

### 4 — Install frontend dependencies

```bash
npm install --prefix frontend
```

Configure `frontend/.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_CONTRACT_ADDRESS=   # filled after deploy (step 6)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=   # from cloud.walletconnect.com
```

---

## Running & Deployment

See [`docs/running.md`](docs/running.md) for:
- Running tests (Hardhat, Foundry, API)
- Local Hardhat node setup and demo flow
- Amoy testnet deploy and demo flow
- Upgrading the contract

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for full technical details:
proxy pattern, on-chain vs off-chain data decisions, team structure, and feature roadmap.
