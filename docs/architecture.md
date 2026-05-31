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

`DEFAULT_ADMIN_ROLE` controls who can grant and revoke all other roles (including
`MINTER_ROLE`). Before mainnet deployment this role must be held by a multisig
(e.g. Gnosis Safe) — a single compromised private key would otherwise let an
attacker grant themselves `MINTER_ROLE` and mint arbitrary NFTs.

An inline `nonReentrant` modifier is applied to `mint` and `updateTokenURI` to
prevent reentrancy via the `onERC721Received` callback that `_safeMint` triggers
on recipient contracts. OZ 5.x removed `ReentrancyGuardUpgradeable`; the inline
implementation uses a plain storage variable validated by the upgrades plugin.

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
| Staging | Polygon Amoy testnet | Public testnet, free MATIC from faucet |


## Future Infrastructure Additions

### Self-hosted IPFS node
Pinata is a managed IPFS node — the IPFS protocol is identical whether you use Pinata
or run your own daemon. Same CIDs, same content addressing, same `ipfs://` URIs. A file
pinned on Pinata and a file pinned on a self-hosted node produce the exact same CID for
the same content. The only difference is operational: who runs the hardware, who handles
uptime, and who pays the bill.

The API storage layer is abstracted behind `IIpfsService` — `PassportService` has no
direct dependency on Pinata. A `LocalIpfsService` can be added that talks to a local
IPFS daemon (`http://localhost:5001/api/v0/add`) instead of the Pinata SDK. An env
flag (`IPFS_PROVIDER=local|pinata`) would switch providers at startup with no changes
to `PassportService`.

Use cases:
- Local development without a Pinata account
- Production self-hosting for full storage control

### Filecoin backup
For production, a Filecoin integration can be layered on top of the IPFS node to
provide cryptographic proof of storage persistence. Filecoin miners are slashed if
they lose data — stronger guarantee than a managed pinning service alone. Pinata
remains the fast-access layer; Filecoin handles long-term durability.

---

## Deployed Addresses

| Network | Proxy | Implementation |
|---|---|---|
| Polygon Amoy testnet | [0xf78e7D...32BD](https://amoy.polygonscan.com/address/0xf78e7D03EC2cB4A9a152f904B7Cb5FD56b4E32BD) | [0x1F9126...809E](https://amoy.polygonscan.com/address/0x1F9126b16Fa41DEB3C60BFE83450E97E0383809E#code) |
