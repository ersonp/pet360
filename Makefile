.PHONY: install test test-contracts test-api local-node local-deploy dev-api dev-frontend help

help:
	@echo "Pet360 Web3 — available targets"
	@echo ""
	@echo "  Setup"
	@echo "    make install         Install deps for all layers (contracts, api, frontend)"
	@echo ""
	@echo "  Tests"
	@echo "    make test            Run all tests"
	@echo "    make test-contracts  Run Hardhat + Foundry contract tests"
	@echo "    make test-api        Run API unit tests"
	@echo ""
	@echo "  Local development (run each in a separate terminal)"
	@echo "    make local-node      Start Hardhat local node"
	@echo "    make local-deploy    Deploy to localhost + configure env files"
	@echo "    make dev-api         Start API  (http://localhost:3000)"
	@echo "    make dev-frontend    Start frontend (http://localhost:3001)"

install:
	npm install
	npm install --prefix api
	npm install --prefix frontend

test: test-contracts test-api

test-contracts:
	npx hardhat test
	forge test --match-path "test/foundry/*" -v

test-api:
	npm test --prefix api

local-node:
	npx hardhat node

local-deploy:
	npx hardhat run scripts/deploy-pet-passport.ts --network localhost
	bash scripts/setup-local-env.sh

dev-api:
	npm run start:dev --prefix api

dev-frontend:
	npm run dev --prefix frontend
