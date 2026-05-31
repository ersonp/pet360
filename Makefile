.PHONY: install env test test-contracts test-api test-fork slither local-node local-deploy amoy-deploy dev-api dev-frontend help

help:
	@echo "Pet360 Web3 — available targets"
	@echo ""
	@echo "  Setup"
	@echo "    make install         Install deps for all layers (contracts, api, frontend)"
	@echo "    make env             Create .env files from examples (run once)"
	@echo ""
	@echo "  Tests"
	@echo "    make test            Run all tests"
	@echo "    make test-contracts  Run Hardhat + Foundry contract tests"
	@echo "    make test-api        Run API unit tests"
	@echo "    make test-fork       Run Foundry tests forked against Amoy testnet"
	@echo "    make slither         Run Slither static analysis (requires: pip install slither-analyzer)"
	@echo ""
	@echo "  Local development (run each in a separate terminal)"
	@echo "    make local-node      Start Hardhat local node"
	@echo "    make local-deploy    Deploy to localhost + configure env files"
	@echo "    make dev-api         Start API  (http://localhost:3000)"
	@echo "    make dev-frontend    Start frontend (http://localhost:3001)"
	@echo ""
	@echo "  Amoy testnet"
	@echo "    make amoy-deploy     Deploy to Amoy (requires root .env with PRIVATE_KEY + AMOY_RPC_URL)"

install:
	npm install
	npm install --prefix api
	npm install --prefix frontend

# Creates .env files from examples if they don't exist yet.
# Root .env is needed for Amoy/mainnet deploy (PRIVATE_KEY, AMOY_RPC_URL).
# api/.env and frontend/.env.local are created automatically by local-deploy.
env:
	@[ -f .env ] && echo ".env already exists" || (cp .env.example .env && echo "Created .env")
	@[ -f api/.env ] && echo "api/.env already exists" || (cp api/.env.example api/.env && echo "Created api/.env")
	@[ -f frontend/.env.local ] && echo "frontend/.env.local already exists" || (cp frontend/.env.example frontend/.env.local && echo "Created frontend/.env.local")

test: test-contracts test-api

test-contracts:
	npx hardhat test
	forge test --match-path "test/foundry/*" -v

test-api:
	npm test --prefix api

# Runs Foundry tests against a live fork of a mainnet-class network.
# NOT included in `make test` — testnets (Amoy) do not maintain archive state
# reliably enough for fork testing. Use a mainnet archive RPC (Alchemy/Infura).
# Set AMOY_RPC_URL to a mainnet archive endpoint in root .env before running.
test-fork:
	forge test --fork-url $(shell grep AMOY_RPC_URL .env | cut -d '=' -f2) -v

# Static analysis — catches common vulnerabilities automatically.
# Install once: pip install slither-analyzer
slither:
	slither contracts/ --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/" --exclude-dependencies

local-node:
	npx hardhat node

local-deploy:
	npx hardhat run scripts/deploy-pet-passport.ts --network localhost
	bash scripts/setup-local-env.sh

amoy-deploy:
	npx hardhat run scripts/deploy-pet-passport.ts --network amoy
	bash scripts/setup-local-env.sh amoy

dev-api:
	npm run start:dev --prefix api

dev-frontend:
	npm run dev --prefix frontend
