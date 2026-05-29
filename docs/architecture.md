# Pet360 Web3 — Architecture

## Overview

Pet360 is a SaaS platform for pet businesses in Brazil, adding a Web3 layer to become
the first blockchain-based pet ecosystem in Latin America. Brazil has 160M pets and
zero blockchain pet infrastructure today.

The Web2 platform is 75% complete and running on Vercel. The Web3 layer is greenfield —
built from scratch on top of the existing platform.

---


## Feature Roadmap (priority order)

1. **Pet NFT Passports** — ERC-721. Every pet gets an immutable digital identity with medical history and ownership records.
2. **Vaccine Certificate NFTs** — ERC-1155. Veterinarians mint verified, unforgeable vaccination records.
3. **Smart Contract Adoptions** — Automated adoption process with 30-day cooldown and NGO fee collection.
4. **Pet Insurance on-chain**
5. **$PET token economy + NFT marketplace**

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Blockchain network | Polygon (EVM) | Low gas fees, MetaMask-native, dominant in Brazil |
| Smart contracts | Solidity | EVM standard |
| Dev / test / deploy | Hardhat + Foundry | Industry standard, replaces deprecated Truffle/Ganache |
| Base contracts | OpenZeppelin | ERC-721, ERC-1155, UUPS proxy, AccessControl |
| Backend bridge | NestJS + ethers.js | Connects Web2 platform to blockchain |
| Frontend Web3 | Wagmi + RainbowKit | Wallet connection, MetaMask support |
| Decentralized storage | IPFS via Pinata | Pet photos, metadata JSON, vaccine PDFs |
| Wallet | MetaMask | Dominant wallet in Brazil |

---

## Architecture Decisions

### Proxy Pattern — UUPS
All core contracts use the UUPS (Universal Upgradeable Proxy Standard) pattern.
Medical records and pet data evolve over a pet's lifetime, so contracts must be upgradeable.

### On-chain vs Off-chain Data
- **On-chain (minimal):** ownership, content hashes, tokenURI pointer
- **Off-chain (IPFS):** pet photos, metadata JSON, vaccine PDFs, mutable fields
- tokenURI is updatable and points to the current IPFS metadata CID

### Security
Mandatory third-party smart contract audit before any mainnet deployment.

---

## Smart Contracts

### `PetPassport.sol`
- Standard: ERC-721
- Proxy: UUPS upgradeable
- One NFT per pet
- Stores: owner address, pet ID, tokenURI → IPFS metadata
- Metadata includes: name, species, breed, date of birth, photo CID, medical record CIDs

---

## MVP Data Flow

```
Pet Registration (Web2)
        ↓
NestJS API — /mint endpoint
        ↓
PetPassport.sol — mint(owner, tokenURI)
        ↓
IPFS via Pinata — { name, photo, metadata }
        ↓
Frontend — "View on blockchain" button + wallet connect (Wagmi + RainbowKit)
```

---

## Network Configuration

| Environment | Network | Details |
|---|---|---|
| Development | Hardhat local node | Fast iteration, no gas cost |
| Staging | Polygon Mumbai testnet | Public testnet, free MATIC from faucet |
| Production | Polygon mainnet | Real MATIC, post-audit only |


## Deployed Addresses

| Network | Proxy | Implementation |
|---|---|---|
| Mumbai testnet | — | — |
| Polygon mainnet | — (post-audit) | — |

_Addresses populated after `npx hardhat run scripts/deploy-pet-passport.ts --network mumbai`_
