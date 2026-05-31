# Pet360 — Pre-Audit Checklist

Adapted from [Cyfrin/audit-checklist](https://github.com/Cyfrin/audit-checklist) and
[Solodit](https://solodit.cyfrin.io/checklist), filtered to items relevant to
PetPassport.sol (ERC-721, UUPS proxy, AccessControl). DeFi-specific sections
(AMMs, lending, vaults, staking) are omitted.

Mark each item before submitting for third-party audit.

---

## Documentation

- [ ] NatSpec on all public/external functions (`@notice`, `@param`, `@return`)
- [x] Contract-level `@title`, `@notice`, `@dev`, `@custom:security-contact` ✅
- [x] `README.md` describes all roles and who should hold them ✅
- [x] Architecture doc describes proxy pattern and upgrade process ✅
- [x] Storage layout documented — upgrade-safe ordering explained ✅
- [x] Known limitations or trust assumptions documented ✅

> **NatSpec note:** `mint` and `updateTokenURI` use `@inheritdoc IPetPassport` which
> is correct — tags are inherited from the interface. All other public functions have
> full NatSpec. ✅

---

## Access Control

- [x] **A-01** Every privileged function has an explicit role check ✅
- [ ] **A-02** `DEFAULT_ADMIN_ROLE` is held by a multisig, not an EOA ← pre-mainnet
- [x] **A-03** No missing access control on state-changing functions ✅
- [x] **A-04** Role grant/revoke events are emitted (OZ AccessControl does this) ✅
- [ ] **A-05** Two-step role transfer considered for critical roles ← **decision needed**
- [x] **A-06** Centralisation risk documented ✅

> **A-05 decision:** OZ AccessControl does not include two-step role transfer by
> default. Current approach: admin directly grants/revokes roles. For mainnet, the
> risk is mitigated by using a multisig as DEFAULT_ADMIN_ROLE — a multisig requires
> multiple signers so a single compromised key cannot unilaterally change roles.
> Acceptable for this contract's threat model.

---

## External / Public Functions

- [x] **F-01** All function visibilities are correct and intentional ✅
- [x] **F-02** All inputs are validated before use (zero address, empty string) ✅
- [x] **F-03** Frontrunning considered — mint order is not sensitive ✅
- [x] **F-04** External calls are last (CEI pattern enforced) ✅
- [x] **F-05** No unexpected ETH acceptance (`receive`/`fallback` absent) ✅
- [x] **F-06** Return values are correct and match interface ✅

---

## External Calls

- [x] **E-01** `_safeMint` triggers `onERC721Received` — guarded by `nonReentrant` ✅
- [x] **E-02** No unbounded loops over user-controlled arrays ✅
- [x] **E-03** No ETH transfers ✅
- [x] **E-04** No `delegatecall` to untrusted contracts ✅
- [x] **E-05** DoS via revert in callback — malicious receivers that revert cause mint to fail (acceptable — caller controls recipient) ✅

---

## ERC-721 / NFT Specific

- [x] **NFT-01** `_safeMint` used (not `_mint`) ✅
- [x] **NFT-02** Reentrancy in `onERC721Received` callback blocked by `nonReentrant` ✅
- [x] **NFT-03** `approve` and `setApprovalForAll` not overridden — standard ERC-721 behaviour preserved ✅
- [x] **NFT-04** Token ID 0 never minted ✅

---

## Proxy / Upgradeable

- [x] **P-01** No constructor logic — `_disableInitializers()` in constructor ✅
- [x] **P-02** `initializer` modifier on `initialize()` ✅
- [x] **P-03** All `__X_init()` functions called — `__ERC721_init`, `__AccessControl_init` ✅
- [x] **P-04** No storage collisions — new variables append only, never reordered ✅
- [x] **P-05** `_authorizeUpgrade` gated by `UPGRADER_ROLE` ✅
- [x] **P-06** Storage layout verified — 3 slots: `_nextTokenId` (0), `_tokenURIs` (1), `_reentrancyStatus` (2) ✅
- [x] **P-07** Implementation contract cannot be initialised — `_disableInitializers()` ✅
- [x] **P-08** Upgrade tested — state preserved after upgrade ✅
- [x] **P-09** `.openzeppelin/` manifest committed — 1 proxy tracked ✅
- [ ] **P-10** No rug vector — upgrader is multisig, not EOA ← pre-mainnet

---

## Mathematics

- [x] **M-01** Token ID counter starts at 1, not 0 ✅
- [x] **M-02** No overflow — Solidity 0.8.x reverts on overflow ✅
- [x] **M-03** No `unchecked` blocks ✅

---

## General

- [x] **G-01** No force-feed ETH vulnerability (no ETH-dependent logic) ✅
- [x] **G-02** No `tx.origin` — `msg.sender` used throughout ✅
- [x] **G-03** No `block.timestamp` dependency for security-critical logic ✅
- [x] **G-04** Events emitted on all state changes ✅
- [x] **G-05** No `selfdestruct` ✅
- [x] **G-06** SPDX licence identifier present ✅
- [x] **G-07** Fixed pragma (`0.8.35`) ✅
- [x] **G-08** No magic numbers — named constants used ✅

---

## Tooling Checks

- [x] `make test` — 31 Hardhat + 29 Foundry + 16 API, all passing ✅
- [x] `make coverage` — 100% line coverage on PetPassport.sol (97% total) ✅
- [x] `make slither` — 1 informational finding (pragma mismatch in OZ deps, not our code) ✅
- [x] `make fmt` — applied, no outstanding formatting changes ✅
- [x] `forge inspect PetPassport storage` — 3 clean slots, no collisions ✅
- [x] Deployed to Amoy testnet ✅

---

## Open Items (must resolve before audit)

| Item | Status | Action |
|---|---|---|
| README roles section | ✅ Done | — |
| Emergency pause mechanism | ✅ Documented in `docs/architecture.md` | — |

---

## Before Mainnet (not blocking audit)

- [ ] `DEFAULT_ADMIN_ROLE` transferred to Gnosis Safe multisig
- [ ] `UPGRADER_ROLE` transferred to Gnosis Safe multisig
- [ ] Third-party audit completed and all findings resolved
- [ ] A-05 re-evaluated — two-step role transfer if threat model requires it
