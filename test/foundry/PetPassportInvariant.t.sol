// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import "forge-std/Test.sol";
import "../../contracts/PetPassport.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// ─── Handler ──────────────────────────────────────────────────────────────────

/// @dev Handler constrains the call sequences Foundry's invariant engine explores.
///      Only valid, role-gated operations are exposed — the invariant engine
///      calls these in random order and checks invariants after every call.
///
///      Why a handler: without one, the engine calls arbitrary functions on the
///      contract directly, most of which revert immediately (wrong caller, wrong
///      args). Handlers guide the fuzzer toward meaningful state transitions.
contract PetPassportHandler is Test {
    PetPassport internal passport;

    address internal admin;
    address internal minter;
    address internal upgrader;

    // Ghost variables — mirror on-chain state for invariant assertions.
    // "Ghost" = tracked here in the handler, not read from the contract,
    // because some state (like total minted) is not exposed directly.
    uint256 public ghostMintCount;
    mapping(uint256 => address) public ghostOwners;
    mapping(uint256 => string) public ghostURIs;

    string internal constant BASE_URI = "ipfs://QmTest/metadata.json";
    string internal constant NEW_URI = "ipfs://QmUpdated/metadata.json";

    constructor(PetPassport _passport, address _admin, address _minter, address _upgrader) {
        passport = _passport;
        admin = _admin;
        minter = _minter;
        upgrader = _upgrader;
    }

    /// @dev Minter mints to a valid recipient. Records in ghost state.
    function mint(address to) external {
        // Discard inputs that would cause the contract to revert legitimately —
        // we want to test invariants on successful operations, not error paths.
        if (to == address(0)) return;

        vm.prank(minter);
        uint256 tokenId = passport.mint(to, BASE_URI);

        ghostMintCount++;
        ghostOwners[tokenId] = to;
        ghostURIs[tokenId] = BASE_URI;
    }

    /// @dev Minter updates an existing token's URI. No-ops on unminted tokens.
    function updateTokenURI(uint256 tokenId) external {
        if (tokenId == 0 || tokenId > ghostMintCount) return;

        vm.prank(minter);
        passport.updateTokenURI(tokenId, NEW_URI);

        ghostURIs[tokenId] = NEW_URI;
    }

    /// @dev Non-minter tries to mint — must always revert.
    ///      Called by the engine to ensure unauthorized mints never succeed.
    function unauthorizedMint(address caller, address to) external {
        if (caller == minter) return; // skip — this would be a valid mint
        if (to == address(0)) return;

        vm.prank(caller);
        try passport.mint(to, BASE_URI) {
            // If mint succeeded for a non-minter, flag it — the invariant
            // test will catch this via ghostMintCount vs ownerOf checks,
            // but we also revert here to surface the failure immediately.
            revert("unauthorizedMint: non-minter succeeded");
        } catch {
            // Expected — access control correctly rejected the call.
        }
    }
}

// ─── Invariant test ───────────────────────────────────────────────────────────

/// @title PetPassport Invariant Tests
/// @notice Handler-based invariant tests for PetPassport.sol.
///
///         Invariant testing differs from fuzz testing:
///         - Fuzz: random *inputs* to a single function call
///         - Invariant: random *sequences* of function calls, checking a
///           property that must hold after every step
///
///         These tests answer: "no matter what sequence of valid operations
///         is performed, do our core safety properties always hold?"
contract PetPassportInvariantTest is Test {
    PetPassport internal passport;
    PetPassportHandler internal handler;

    address internal admin = vm.addr(10);
    address internal minter = vm.addr(11);
    address internal upgrader = vm.addr(12);

    function setUp() public {
        // Deploy impl + proxy (same pattern as unit tests)
        PetPassport impl = new PetPassport();
        bytes memory initData = abi.encodeCall(PetPassport.initialize, (admin, minter, upgrader));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        passport = PetPassport(address(proxy));

        // Deploy handler and point the invariant engine at it.
        // targetContract tells Foundry: only call functions on this address.
        handler = new PetPassportHandler(passport, admin, minter, upgrader);
        targetContract(address(handler));
    }

    // ─── Invariants ───────────────────────────────────────────────────────────

    /// @notice Every token that the handler minted must have a non-zero owner.
    ///         Verifies that _safeMint always assigns ownership correctly and
    ///         that no token is ever burned or transferred to address(0).
    function invariant_allMintedTokensHaveOwner() public view {
        uint256 count = handler.ghostMintCount();
        for (uint256 i = 1; i <= count; i++) {
            assertNotEq(passport.ownerOf(i), address(0), "invariant: minted token has zero owner");
        }
    }

    /// @notice Owner recorded by the handler must match the contract's ownerOf.
    ///         Verifies that ghost state (handler's view of the world) stays in
    ///         sync with on-chain state — no phantom mints or ownership drift.
    function invariant_ghostOwnerMatchesContract() public view {
        uint256 count = handler.ghostMintCount();
        for (uint256 i = 1; i <= count; i++) {
            assertEq(passport.ownerOf(i), handler.ghostOwners(i), "invariant: ghost owner mismatch");
        }
    }

    /// @notice No token with ID 0 ever exists.
    ///         Token IDs start at 1 — ID 0 is intentionally skipped to avoid
    ///         zero-value ambiguity (e.g. uninitialized tokenId fields).
    function invariant_tokenZeroNeverMinted() public {
        vm.expectRevert();
        passport.ownerOf(0);
    }

    /// @notice tokenURI for every minted token is never empty.
    ///         Verifies that mint and updateTokenURI always store a non-empty URI,
    ///         and that no operation accidentally clears it.
    function invariant_tokenURINeverEmpty() public view {
        uint256 count = handler.ghostMintCount();
        for (uint256 i = 1; i <= count; i++) {
            assertGt(bytes(passport.tokenURI(i)).length, 0, "invariant: tokenURI is empty");
        }
    }

    /// @notice The minter role is always held by the original minter address.
    ///         Verifies that no call sequence causes the minter role to be
    ///         silently revoked or reassigned without admin action.
    function invariant_minterRoleIntact() public view {
        assertTrue(passport.hasRole(passport.MINTER_ROLE(), minter), "invariant: minter lost MINTER_ROLE");
    }
}
