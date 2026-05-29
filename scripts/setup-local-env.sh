#!/usr/bin/env bash
set -euo pipefail

# Sets up api/.env and frontend/.env.local for local Hardhat development.
# Run this after: npx hardhat run scripts/deploy-pet-passport.ts --network localhost

# Hardhat account 0 — deterministic, same private key every time.
# Safe to hardcode here: these keys are public knowledge, hold no real funds.
HARDHAT_ACCOUNT_0_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

DEPLOYMENTS_FILE="deployments/localhost.json"
API_ENV="api/.env"
FRONTEND_ENV="frontend/.env.local"

# --- Validation ---

if [ ! -f "$DEPLOYMENTS_FILE" ]; then
  echo "Error: $DEPLOYMENTS_FILE not found."
  echo "Run: npx hardhat run scripts/deploy-pet-passport.ts --network localhost"
  exit 1
fi

if [ ! -f "$API_ENV" ]; then
  cp api/.env.example "$API_ENV"
  echo "Created $API_ENV from example"
fi

if [ ! -f "$FRONTEND_ENV" ]; then
  cp frontend/.env.example "$FRONTEND_ENV"
  echo "Created $FRONTEND_ENV from example"
fi

# --- Read proxy address ---

PROXY=$(node -e "const d=require('./$DEPLOYMENTS_FILE'); console.log(d.proxy)")

if [ -z "$PROXY" ]; then
  echo "Error: proxy address not found in $DEPLOYMENTS_FILE"
  exit 1
fi

echo "Proxy address: $PROXY"

# --- Helper: set or replace a key=value line in an env file ---

set_env() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    echo "${key}=${value}" >> "$file"
  fi
}

# --- api/.env ---

set_env "$API_ENV" "CONTRACT_ADDRESS"  "$PROXY"
set_env "$API_ENV" "POLYGON_RPC_URL"   "http://localhost:8545"
set_env "$API_ENV" "MINTER_PRIVATE_KEY" "$HARDHAT_ACCOUNT_0_KEY"

# Pinata is not called in local dev — fake values let the API start without error.
# Replace with real credentials (or build LocalIpfsService) for full mint flow.
set_env "$API_ENV" "PINATA_JWT"        "local-dev-fake-jwt"
set_env "$API_ENV" "PINATA_GATEWAY"    "local.mypinata.cloud"

# --- frontend/.env.local ---

set_env "$FRONTEND_ENV" "NEXT_PUBLIC_CONTRACT_ADDRESS" "$PROXY"

# --- Done ---

echo ""
echo "Local env configured:"
echo "  api/.env              CONTRACT_ADDRESS, POLYGON_RPC_URL, MINTER_PRIVATE_KEY"
echo "  frontend/.env.local   NEXT_PUBLIC_CONTRACT_ADDRESS"
echo ""
echo "Note: PINATA_JWT is fake — minting will fail at the IPFS upload step."
echo "      Set a real PINATA_JWT in api/.env for full local testing,"
echo "      or see docs/architecture.md for the LocalIpfsService option."
