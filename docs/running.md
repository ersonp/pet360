# Pet360 Web3 — Running & Deployment Guide

## Running Tests

All tests run locally — no network connection required.

### Hardhat (TypeScript) — 27 tests

```bash
npx hardhat test
```

### Foundry (Solidity fuzz) — 26 tests, 768 fuzz runs

```bash
forge test --match-path "test/foundry/*" -v
```

### API unit tests — 16 tests

```bash
npm test --prefix api
```

---

## Option A — Local Hardhat Node

Use this for development and iteration. No MATIC, no external accounts needed.
The Polygonscan link in MintResult will not resolve (no public explorer for localhost).

### 1 — Start a local node

```bash
npx hardhat node
```

Keeps running in the foreground. Leave this terminal open.

### 2 — Deploy to localhost

```bash
npx hardhat run scripts/deploy-pet-passport.ts --network localhost
```

Writes addresses to `deployments/localhost.json`.

### 3 — Copy proxy address to env files

```bash
cat deployments/localhost.json
```

Copy the `proxy` address into:
- `api/.env` → `CONTRACT_ADDRESS`
- `frontend/.env.local` → `NEXT_PUBLIC_CONTRACT_ADDRESS`

Also set in `api/.env`:

```
POLYGON_RPC_URL=http://localhost:8545
MINTER_PRIVATE_KEY=  # use one of the pre-funded Hardhat accounts printed by `npx hardhat node`
```

### 4 — Start the API

```bash
npm run start:dev --prefix api
```

API runs on `http://localhost:3000`.

### 5 — Start the frontend

```bash
npm run dev --prefix frontend
```

Frontend runs on `http://localhost:3001`.

### 6 — Demo flow (local)

1. Open `http://localhost:3001`
2. Click **Connect Wallet** → MetaMask opens (add localhost network: RPC `http://localhost:8545`, chain ID `31337`)
3. Import a Hardhat test account into MetaMask using one of the private keys printed by `npx hardhat node`
4. Fill in pet details: name, species, breed, date of birth, pet ID
5. Upload a pet photo (JPEG or PNG, max 10 MB)
6. Click **Mint Pet Passport**
7. **MintResult** appears with token ID and transaction hash

---

## Option B — Mumbai Testnet

Use this for the full demo. Real public transaction, real Polygonscan link, NFT visible on-chain.

### Prerequisites

- Alchemy or Infura account with a Mumbai RPC URL
- Pinata account with JWT + gateway
- WalletConnect Cloud project ID
- Polygonscan API key (for contract verification)

All free tier. See README prerequisites section.

### 1 — Get test MATIC

Get free MATIC from the [Polygon Mumbai faucet](https://faucet.polygon.technology/).

### 2 — Configure root `.env`

```
PRIVATE_KEY=             # deployer wallet private key (no 0x prefix)
MUMBAI_RPC_URL=          # e.g. https://polygon-mumbai.g.alchemy.com/v2/<key>
POLYGONSCAN_API_KEY=     # from polygonscan.com/myapikey
MINTER_ADDRESS=          # wallet address that gets MINTER_ROLE
UPGRADER_ADDRESS=        # wallet address that gets UPGRADER_ROLE
```

### 3 — Deploy PetPassport

```bash
npx hardhat run scripts/deploy-pet-passport.ts --network mumbai
```

This will:
- Deploy the implementation + UUPS proxy
- Write addresses to `deployments/mumbai.json`
- Verify the contract on Polygonscan automatically

### 4 — Copy proxy address to env files

```bash
cat deployments/mumbai.json
```

Copy the `proxy` address into:
- `api/.env` → `CONTRACT_ADDRESS`
- `frontend/.env.local` → `NEXT_PUBLIC_CONTRACT_ADDRESS`

Also set in `api/.env`:

```
POLYGON_RPC_URL=          # same as MUMBAI_RPC_URL
MINTER_PRIVATE_KEY=       # private key of the wallet with MINTER_ROLE
```

### 5 — Start the API

```bash
npm run start:dev --prefix api
```

API runs on `http://localhost:3000`.

### 6 — Start the frontend

```bash
npm run dev --prefix frontend
```

Frontend runs on `http://localhost:3001`.

### 7 — Demo flow (Mumbai)

1. Open `http://localhost:3001`
2. Click **Connect Wallet** → MetaMask opens (select Mumbai testnet)
3. Fill in pet details: name, species, breed, date of birth, pet ID
4. Upload a pet photo (JPEG or PNG, max 10 MB)
5. Click **Mint Pet Passport**
6. Wait 10–30 seconds for Mumbai confirmation
7. **MintResult** appears with:
   - Token ID
   - Transaction hash
   - Link to the NFT on Polygonscan

---

## Upgrading the Contract

If the contract is changed and redeployed:

```bash
npx hardhat run scripts/upgrade-pet-passport.ts --network mumbai
```

Reads the proxy address from `deployments/mumbai.json`, deploys the new implementation,
and updates the JSON with the new implementation address. All existing NFT state is preserved.

For localhost:

```bash
npx hardhat run scripts/upgrade-pet-passport.ts --network localhost
```
