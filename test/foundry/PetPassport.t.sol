// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

// Foundry's test primitives: Test base class, assertion helpers, and cheatcodes.
// vm = cheatcodes (prank, expectRevert, etc.)
import "forge-std/Test.sol";

// The contract under test
import "../../contracts/PetPassport.sol";

// ERC1967Proxy is the standard proxy contract that UUPS sits on top of.
// In production, hardhat-upgrades deploys this automatically.
// In Foundry tests, we deploy it manually to stay framework-agnostic.
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @dev Malicious ERC-721 receiver that re-enters mint() inside onERC721Received.
///      Used to verify nonReentrant blocks the second call.
contract ReentrantReceiver {
    PetPassport private _target;
    string private constant URI = "ipfs://QmEvil/metadata.json";
    bool public attacked;

    constructor(PetPassport target) {
        _target = target;
    }

    /// @dev Called by _safeMint when this contract receives an NFT.
    ///      Attempts to mint again — should revert due to nonReentrant.
    function onERC721Received(address, address, uint256, bytes calldata) external returns (bytes4) {
        attacked = true;
        // This call must revert — nonReentrant is locked for this call stack.
        _target.mint(address(this), URI);
        return this.onERC721Received.selector;
    }
}

/// @title PetPassport Foundry Tests
/// @notice Unit + fuzz tests for PetPassport.sol.
///         Complements the Hardhat TypeScript tests (27 deterministic cases).
///         Foundry adds fuzz testing: Foundry generates hundreds of random
///         inputs automatically to find edge cases we wouldn't think to write.
contract PetPassportTest is Test {
    // ─── State ────────────────────────────────────────────────────────────────

    /// @dev The proxy address cast to PetPassport — all calls go through this.
    ///      This mirrors how production works: users interact with the proxy, not impl.
    PetPassport internal passport;

    // Test accounts — vm.addr(n) derives a deterministic address from a private key.
    address internal admin = vm.addr(1);
    address internal minter = vm.addr(2);
    address internal upgrader = vm.addr(3);
    address internal user = vm.addr(4);
    address internal other = vm.addr(5); // no roles

    string internal constant BASE_URI = "ipfs://QmTestHash/metadata.json";

    // ─── Setup ────────────────────────────────────────────────────────────────

    /// @dev Runs before every test function.
    ///      Deploys impl → wraps in ERC1967Proxy → calls initialize().
    function setUp() public {
        // 1. Deploy the implementation contract (logic only, no state).
        PetPassport impl = new PetPassport();

        // 2. Encode the initialize() call — this is what the proxy executes
        //    on construction, equivalent to a constructor for the proxy.
        bytes memory initData = abi.encodeCall(PetPassport.initialize, (admin, minter, upgrader));

        // 3. Wrap in ERC1967Proxy — this is the permanent contract address.
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);

        // 4. Cast the proxy to PetPassport so our tests can call contract methods.
        passport = PetPassport(address(proxy));
    }

    // ─── Initialization guards ────────────────────────────────────────────────

    function test_CannotReinitializeProxy() public {
        // The initializer modifier allows initialize() to be called only once.
        // Any subsequent call must revert — prevents privilege escalation.
        vm.expectRevert();
        passport.initialize(other, other, other);
    }

    function test_ImplementationCannotBeInitialized() public {
        // Deploy a bare implementation (not wrapped in a proxy).
        // Calling initialize() on it directly must revert — prevents an attacker
        // from taking ownership of the implementation contract.
        PetPassport impl = new PetPassport();
        vm.expectRevert();
        impl.initialize(other, other, other);
    }

    // ─── Deployment ───────────────────────────────────────────────────────────

    function test_NameAndSymbol() public view {
        assertEq(passport.name(), "PetPassport");
        assertEq(passport.symbol(), "PET");
    }

    function test_RolesAssigned() public view {
        assertTrue(passport.hasRole(passport.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(passport.hasRole(passport.MINTER_ROLE(), minter));
        assertTrue(passport.hasRole(passport.UPGRADER_ROLE(), upgrader));
    }

    // ─── Mint — unit tests ────────────────────────────────────────────────────

    function test_MinterCanMint() public {
        // vm.prank makes the next call come from `minter` instead of address(this)
        vm.prank(minter);
        uint256 tokenId = passport.mint(user, BASE_URI);

        assertEq(tokenId, 1);
        assertEq(passport.ownerOf(1), user);
        assertEq(passport.tokenURI(1), BASE_URI);
    }

    function test_MintEmitsPassportMinted() public {
        // vm.expectEmit: check that the next call emits this exact event.
        // Arguments: (checkTopic1, checkTopic2, checkTopic3, checkData, emitter)
        vm.expectEmit(true, true, false, true, address(passport));
        emit IPetPassport.PassportMinted(user, 1, BASE_URI);

        vm.prank(minter);
        passport.mint(user, BASE_URI);
    }

    function test_MintTokenIdIncrementsSequentially() public {
        vm.startPrank(minter);
        uint256 id1 = passport.mint(user, BASE_URI);
        uint256 id2 = passport.mint(user, BASE_URI);
        uint256 id3 = passport.mint(user, BASE_URI);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(id3, 3);
    }

    function test_NonMinterCannotMint() public {
        // vm.expectRevert: assert that the next call reverts.
        // AccessControl reverts with a specific bytes error — check selector only.
        vm.expectRevert();
        vm.prank(other);
        passport.mint(user, BASE_URI);
    }

    function test_MintRevertsOnZeroAddress() public {
        vm.expectRevert(PetPassport.PetPassport__MintToZeroAddress.selector);
        vm.prank(minter);
        passport.mint(address(0), BASE_URI);
    }

    function test_MintRevertsOnEmptyURI() public {
        vm.expectRevert(PetPassport.PetPassport__EmptyTokenURI.selector);
        vm.prank(minter);
        passport.mint(user, "");
    }

    // ─── Mint — fuzz tests ────────────────────────────────────────────────────
    //
    // Foundry automatically generates `runs` (default: 256) random inputs for
    // each fuzz test. This catches edge cases we wouldn't think to write manually.

    /// @notice Any valid recipient + non-empty URI should succeed.
    /// @dev `assume` discards inputs that violate preconditions (foundry skips them).
    function testFuzz_MintAnyValidRecipientAndURI(address to, string calldata uri) public {
        vm.assume(to != address(0));
        vm.assume(bytes(uri).length > 0);
        // _safeMint calls onERC721Received on contract recipients — exclude
        // contracts that don't implement IERC721Receiver (they revert correctly,
        // but that's not what this test is checking).
        vm.assume(to.code.length == 0);

        vm.prank(minter);
        uint256 tokenId = passport.mint(to, uri);

        assertEq(passport.ownerOf(tokenId), to);
        assertEq(passport.tokenURI(tokenId), uri);
    }

    /// @notice Non-zero address with any URI from a non-minter should always revert.
    function testFuzz_NonMinterAlwaysReverts(address caller, string calldata uri) public {
        vm.assume(caller != minter);
        vm.assume(bytes(uri).length > 0);

        vm.expectRevert();
        vm.prank(caller);
        passport.mint(user, uri);
    }

    // ─── updateTokenURI — unit tests ─────────────────────────────────────────

    function test_MinterCanUpdateTokenURI() public {
        vm.prank(minter);
        passport.mint(user, BASE_URI);

        string memory newURI = "ipfs://QmUpdatedHash/metadata.json";
        vm.prank(minter);
        passport.updateTokenURI(1, newURI);

        assertEq(passport.tokenURI(1), newURI);
    }

    function test_UpdateTokenURIEmitsEvent() public {
        vm.prank(minter);
        passport.mint(user, BASE_URI);

        string memory newURI = "ipfs://QmUpdatedHash/metadata.json";
        vm.expectEmit(true, false, false, true, address(passport));
        emit IPetPassport.TokenURIUpdated(1, newURI);

        vm.prank(minter);
        passport.updateTokenURI(1, newURI);
    }

    function test_NonMinterCannotUpdateTokenURI() public {
        vm.prank(minter);
        passport.mint(user, BASE_URI);

        vm.expectRevert();
        vm.prank(other);
        passport.updateTokenURI(1, "ipfs://QmEvil/metadata.json");
    }

    function test_UpdateTokenURIRevertsOnNonExistentToken() public {
        vm.expectRevert(abi.encodeWithSelector(PetPassport.PetPassport__TokenDoesNotExist.selector, 999));
        vm.prank(minter);
        passport.updateTokenURI(999, "ipfs://QmHash/metadata.json");
    }

    function test_UpdateTokenURIRevertsOnEmptyURI() public {
        vm.prank(minter);
        passport.mint(user, BASE_URI);

        vm.expectRevert(PetPassport.PetPassport__EmptyTokenURI.selector);
        vm.prank(minter);
        passport.updateTokenURI(1, "");
    }

    // ─── updateTokenURI — fuzz tests ─────────────────────────────────────────

    /// @notice Any non-empty URI should be storable and retrievable.
    function testFuzz_UpdateTokenURIAnyValidURI(string calldata newURI) public {
        vm.assume(bytes(newURI).length > 0);

        vm.prank(minter);
        passport.mint(user, BASE_URI);

        vm.prank(minter);
        passport.updateTokenURI(1, newURI);

        assertEq(passport.tokenURI(1), newURI);
    }

    // ─── Access control ───────────────────────────────────────────────────────

    function test_AdminCanGrantMinterRole() public {
        // Read role constant before pranking — passport.MINTER_ROLE() is an
        // external call that would consume the vm.prank if called inline.
        bytes32 minterRole = passport.MINTER_ROLE();
        vm.prank(admin);
        passport.grantRole(minterRole, other);

        assertTrue(passport.hasRole(minterRole, other));
    }

    function test_AdminCanRevokeMinterRole() public {
        bytes32 minterRole = passport.MINTER_ROLE();
        vm.prank(admin);
        passport.revokeRole(minterRole, minter);

        assertFalse(passport.hasRole(minterRole, minter));
    }

    function test_RevokedMinterCannotMint() public {
        bytes32 minterRole = passport.MINTER_ROLE();
        vm.prank(admin);
        passport.revokeRole(minterRole, minter);

        vm.expectRevert();
        vm.prank(minter);
        passport.mint(user, BASE_URI);
    }

    function test_NonAdminCannotGrantRoles() public {
        bytes32 minterRole = passport.MINTER_ROLE();
        vm.expectRevert();
        vm.prank(other);
        passport.grantRole(minterRole, other);
    }

    // ─── Upgrades ─────────────────────────────────────────────────────────────

    function test_UpgraderCanUpgrade() public {
        // Deploy a new implementation (same contract = valid upgrade for testing).
        PetPassport newImpl = new PetPassport();

        // upgradeToAndCall with empty calldata = upgrade without re-init.
        vm.prank(upgrader);
        passport.upgradeToAndCall(address(newImpl), "");

        // Contract should still work after upgrade.
        vm.prank(minter);
        uint256 tokenId = passport.mint(user, BASE_URI);
        assertEq(tokenId, 1);
    }

    function test_NonUpgraderCannotUpgrade() public {
        PetPassport newImpl = new PetPassport();

        vm.expectRevert();
        vm.prank(other);
        passport.upgradeToAndCall(address(newImpl), "");
    }

    function test_StatePreservedAfterUpgrade() public {
        // Mint before upgrade
        vm.prank(minter);
        passport.mint(user, BASE_URI);

        // Upgrade
        PetPassport newImpl = new PetPassport();
        vm.prank(upgrader);
        passport.upgradeToAndCall(address(newImpl), "");

        // State must survive the upgrade — proxy storage is untouched.
        assertEq(passport.ownerOf(1), user);
        assertEq(passport.tokenURI(1), BASE_URI);
    }

    // ─── tokenURI edge cases ──────────────────────────────────────────────────

    function test_TokenURIRevertsForNonExistentTokenId() public {
        vm.expectRevert(abi.encodeWithSelector(PetPassport.PetPassport__TokenDoesNotExist.selector, 999));
        passport.tokenURI(999);
    }

    // ─── supportsInterface ────────────────────────────────────────────────────

    function test_SupportsERC721Interface() public view {
        // ERC-721 interface ID — wallets use this to verify NFT support.
        assertTrue(passport.supportsInterface(0x80ac58cd));
    }

    function test_SupportsAccessControlInterface() public view {
        // IAccessControl interface ID
        assertTrue(passport.supportsInterface(0x7965db0b));
    }

    // ─── Reentrancy guard ─────────────────────────────────────────────────────

    function test_MintBlocksReentrancy() public {
        // Deploy a malicious receiver that re-enters mint() inside onERC721Received.
        ReentrantReceiver attacker = new ReentrantReceiver(passport);

        // Grant minter role to the attacker contract so the re-entrant call
        // would succeed if nonReentrant were absent.
        bytes32 minterRole = passport.MINTER_ROLE();
        vm.prank(admin);
        passport.grantRole(minterRole, address(attacker));

        // The outer mint triggers onERC721Received → attacker re-enters mint().
        // nonReentrant must cause the inner call to revert, which bubbles up.
        vm.expectRevert();
        vm.prank(minter);
        passport.mint(address(attacker), "ipfs://QmFirst/metadata.json");
    }
}
