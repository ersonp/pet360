# Pet360 Web3

Blockchain layer for Pet360 — the first blockchain-based pet ecosystem in Latin America.
Adds NFT pet passports, vaccine certificates, and smart contract adoptions to the
existing Pet360 Web2 SaaS platform (Vercel, 75% complete).

**Chain:** Polygon (Amoy testnet → mainnet)
**Stack:** Solidity · Hardhat · Foundry · NestJS · ethers.js · Next.js · Wagmi · RainbowKit

---

## Deployed Contracts

| Network | Proxy | Implementation |
|---|---|---|
| Polygon Amoy testnet | [0xf78e7D...32BD](https://amoy.polygonscan.com/address/0xf78e7D03EC2cB4A9a152f904B7Cb5FD56b4E32BD) | [0x1F9126...809E](https://amoy.polygonscan.com/address/0x1F9126b16Fa41DEB3C60BFE83450E97E0383809E#code) |
| Polygon mainnet | — (post-audit) | — |

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
│   ├── PetPassport.test.ts # Hardhat TypeScript tests (31)
│   └── foundry/
│       └── PetPassport.t.sol  # Foundry fuzz + unit tests (29)
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
- [Polygonscan](https://polygonscan.com/myapikey) — free API key for contract verification
- [WalletConnect Cloud](https://cloud.walletconnect.com) — free project ID (optional — local dev works without it)

---

## Setup

```bash
make install   # installs root, api, and frontend dependencies
make env       # creates .env, api/.env, frontend/.env.local from examples
```

Edit the generated files — see [`docs/running.md`](docs/running.md) for what each variable does.

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
proxy pattern, on-chain vs off-chain data decisions, security model, and feature roadmap.
