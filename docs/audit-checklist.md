# Pet360 — Pre-Audit Checklist

Adapted from [Cyfrin/audit-checklist](https://github.com/Cyfrin/audit-checklist) and
[Solodit](https://solodit.cyfrin.io/checklist), filtered to items relevant to
PetPassport.sol (ERC-721, UUPS proxy, AccessControl). DeFi-specific sections
(AMMs, lending, vaults, staking) are omitted.

Mark each item before submitting for third-party audit.

---

## Documentation

- [ ] NatSpec on all public/external functions (`@notice`, `@param`, `@return`)
- [ ] Contract-level `@title`, `@notice`, `@dev`, `@custom:security-contact`
- [ ] `README.md` describes all roles and who should hold them
- [ ] Architecture doc describes proxy pattern and upgrade process
- [ ] Storage layout documented — upgrade-safe ordering explained
- [ ] Known limitations or trust assumptions documented

---

## Access Control

- [ ] **A-01** Every privileged function has an explicit role check
- [ ] **A-02** `DEFAULT_ADMIN_ROLE` is held by a multisig, not an EOA
- [ ] **A-03** No missing access control on state-changing functions
- [ ] **A-04** Role grant/revoke events are emitted (OZ AccessControl does this)
- [ ] **A-05** Two-step role transfer considered for critical roles (admin hands off to multisig)
- [ ] **A-06** Centralisation risk documented — what happens if multisig is compromised?

---

## External / Public Functions

- [ ] **F-01** All function visibilities are correct and intentional
- [ ] **F-02** All inputs are validated before use (zero address, empty string)
- [ ] **F-03** Frontrunning considered — is mint order sensitive? (No for us)
- [ ] **F-04** External calls are last (CEI pattern enforced)
- [ ] **F-05** No unexpected ETH acceptance (`receive`/`fallback` absent — correct)
- [ ] **F-06** Return values are correct and match interface

---

## External Calls

- [ ] **E-01** `_safeMint` triggers `onERC721Received` — reentrancy guarded by `nonReentrant` ✅
- [ ] **E-02** No unbounded loops over user-controlled arrays
- [ ] **E-03** No ETH transfers (not a payment contract)
- [ ] **E-04** No `delegatecall` to untrusted contracts
- [ ] **E-05** DoS via revert in callback considered — `nonReentrant` already handles re-entry; malicious receivers that revert will cause mint to fail (acceptable — caller controls recipient)

---

## ERC-721 / NFT Specific

- [ ] **NFT-01** `_safeMint` used (not `_mint`) — triggers `onERC721Received` on contract recipients ✅
- [ ] **NFT-02** Reentrancy in `onERC721Received` callback blocked by `nonReentrant` ✅
- [ ] **NFT-03** `approve` and `setApprovalForAll` not overridden — standard ERC-721 behaviour preserved
- [ ] **NFT-04** Token ID 0 never minted — avoids zero-value ambiguity ✅

---

## Proxy / Upgradeable

- [ ] **P-01** No constructor logic — `_disableInitializers()` in constructor ✅
- [ ] **P-02** `initializer` modifier on `initialize()` — prevents re-initialisation ✅
- [ ] **P-03** All `__X_init()` functions called in `initialize()` ✅
- [ ] **P-04** No storage collisions — new variables appended only, never reordered
- [ ] **P-05** `_authorizeUpgrade` gated by `UPGRADER_ROLE` ✅
- [ ] **P-06** Storage layout verified with `forge inspect PetPassport storage`
- [ ] **P-07** Implementation contract itself cannot be initialised — `_disableInitializers()` ✅
- [ ] **P-08** Upgrade tested in test suite — state preserved after upgrade ✅
- [ ] **P-09** `.openzeppelin/` manifest committed — tracks proxy/impl addresses
- [ ] **P-10** No rug vector — upgrader is multisig, not a single EOA (pre-mainnet)

---

## Mathematics

- [ ] **M-01** Token ID counter starts at 1, not 0 ✅
- [ ] **M-02** No overflow possible — Solidity 0.8.x reverts on overflow by default ✅
- [ ] **M-03** No unchecked blocks introduced without explicit justification

---

## General

- [ ] **G-01** No force-feed ETH vulnerability (no ETH-dependent logic)
- [ ] **G-02** No `tx.origin` usage — `msg.sender` used throughout ✅
- [ ] **G-03** No `block.timestamp` dependency for security-critical logic
- [ ] **G-04** Events emitted on all state changes (`PassportMinted`, `TokenURIUpdated`) ✅
- [ ] **G-05** No self-destruct (`selfdestruct` deprecated in 0.8.x)
- [ ] **G-06** SPDX licence identifier present ✅
- [ ] **G-07** Fixed pragma for deployed contracts (`0.8.35`, not `^`) ✅
- [ ] **G-08** No magic numbers — named constants used (`MINTER_ROLE`, `_NOT_ENTERED`) ✅

---

## Tooling Checks (run before submitting)

- [ ] `make test` — all tests pass (31 Hardhat + 29 Foundry + 16 API)
- [x] `make coverage` — 100% line coverage on PetPassport.sol (97% total) ✅
- [ ] `make slither` — no high/medium findings in contract code
- [ ] `make fmt` — no formatting changes (code already formatted)
- [ ] `forge inspect PetPassport storage` — storage layout reviewed
- [ ] Deployed to Amoy testnet and end-to-end mint confirmed

---

## Before Mainnet

- [ ] `DEFAULT_ADMIN_ROLE` transferred to Gnosis Safe multisig
- [ ] `UPGRADER_ROLE` transferred to Gnosis Safe multisig
- [ ] Third-party audit completed and all findings resolved
- [ ] Emergency pause mechanism considered (currently absent — document decision)
