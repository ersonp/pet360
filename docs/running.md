# Pet360 Web3 — Running & Deployment Guide

## Editor Setup

### Solidity format on save (VS Code)

1. Install the **Solidity by Nomic Foundation** extension (`NomicFoundation.hardhat-solidity`)
2. The project's `.vscode/settings.json` is already configured — no further action needed

This routes format-on-save through `forge fmt`, keeping editor formatting consistent
with `make fmt`.

## Running Tests

All tests run locally — no network connection required.

```bash
make test
```

> **Note on `make test-fork`:** Not included in `make test`. Amoy testnet does
> not maintain full archive state — fork tests against it will fail with
> "historical state not available" even on paid RPC tiers. This target is
> reserved for mainnet forking when a mainnet archive endpoint is available.

Or individually:

```bash
make test-contracts   # Hardhat (31) + Foundry (29) + invariant tests
make test-api         # API unit tests (16)
make test-fork        # Foundry tests forked against Amoy (requires private RPC — see note below)
make slither          # Slither static analysis (requires: pip install slither-analyzer)
```

---

## Option A — Local Hardhat Node

Use this for development and iteration. No MATIC, no external accounts needed.
The Polygonscan link in MintResult will not resolve (no public explorer for localhost).

### 1 — Start a local node (terminal 1)

```bash
make local-node
```

Keeps running in the foreground. Leave this terminal open.

### 2 — Deploy and configure env files (terminal 2)

```bash
make local-deploy
```

This runs the deploy script and then `scripts/setup-local-env.sh` which:
- Reads the proxy address from `deployments/localhost.json`
- Sets `CONTRACT_ADDRESS`, `POLYGON_RPC_URL`, `MINTER_PRIVATE_KEY` in `api/.env`
- Sets `NEXT_PUBLIC_CONTRACT_ADDRESS` in `frontend/.env.local`
- Uses Hardhat account 0 as the minter (deterministic key, no real funds)

> **Pinata required for full mint flow:** `setup-local-env.sh` sets a fake JWT so
> the API starts without error, but minting will fail at the IPFS upload step.
> To fix: sign up at [app.pinata.cloud](https://app.pinata.cloud) (free) →
> Developers → API Keys → New Key → copy JWT and gateway, then set in `api/.env`:
> ```
> PINATA_JWT=<your-jwt>
> PINATA_GATEWAY=<your-gateway>.mypinata.cloud
> ```
> Restart `make dev-api` after updating.

### 4 — Start the API (terminal 3)

```bash
make dev-api
```

API runs on `http://localhost:3000`.

### 5 — Start the frontend (terminal 4)

```bash
make dev-frontend
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

## Option B — Amoy Testnet

Use this for the full demo. Real public transaction, real Polygonscan link, NFT visible on-chain.

### Prerequisites

- Pinata account with JWT + gateway (free)
- Polygonscan API key for contract verification (free)
- MATIC from the [Polygon Amoy faucet](https://faucet.polygon.technology/) (free)

### 1 — Create env files

```bash
make env
```

This creates root `.env`, `api/.env`, and `frontend/.env.local` from examples if they don't exist.

### 2 — Configure root `.env`

```
PRIVATE_KEY=             # deployer wallet private key (no 0x prefix)
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGONSCAN_API_KEY=     # from polygonscan.com/myapikey
MINTER_ADDRESS=          # wallet address that gets MINTER_ROLE
UPGRADER_ADDRESS=        # wallet address that gets UPGRADER_ROLE
```

> Root `.env` is only needed for Amoy/mainnet deploy. Local dev does not use it.

### 3 — Deploy PetPassport

```bash
make amoy-deploy
```

This will:
- Deploy the implementation + UUPS proxy
- Write addresses to `deployments/amoy.json`
- Verify the contract on Polygonscan automatically
- Auto-set in `api/.env`: `CONTRACT_ADDRESS`, `POLYGON_RPC_URL`
- Auto-set in `frontend/.env.local`: `NEXT_PUBLIC_CONTRACT_ADDRESS`

### 4 — Set `MINTER_PRIVATE_KEY` in `api/.env`

This is the only value that cannot be automated — it is your private key.

```
MINTER_PRIVATE_KEY=    # private key of the wallet set as MINTER_ADDRESS
```

Get it from MetaMask → account avatar → Account details → Show private key.
MetaMask shows the key listed per chain (Ethereum, Polygon, Base, etc.) —
they are all the same value, copy any of them. Remove the `0x` prefix.

> `PINATA_JWT` and `PINATA_GATEWAY` are already in `api/.env` from local dev setup.
> If starting fresh, set them from [app.pinata.cloud](https://app.pinata.cloud).

### 5 — Start the API

```bash
make dev-api
```

API runs on `http://localhost:3000`.

### 6 — Start the frontend

```bash
make dev-frontend
```

Frontend runs on `http://localhost:3001`.

### 7 — Demo flow (Amoy)

1. Open `http://localhost:3001`
2. Click **Connect Wallet** → MetaMask opens (select Amoy testnet)
3. Fill in pet details: name, species, breed, date of birth, pet ID
4. Upload a pet photo (JPEG or PNG, max 10 MB)
5. Click **Mint Pet Passport**
6. Wait 10–30 seconds for Amoy confirmation
7. **MintResult** appears with:
   - Token ID
   - Transaction hash
   - Link to the NFT on Polygonscan

---

## Upgrading the Contract

If the contract is changed and redeployed:

```bash
npx hardhat run scripts/upgrade-pet-passport.ts --network amoy
```

Reads the proxy address from `deployments/amoy.json`, deploys the new implementation,
and updates the JSON with the new implementation address. All existing NFT state is preserved.

For localhost:

```bash
npx hardhat run scripts/upgrade-pet-passport.ts --network localhost
```
