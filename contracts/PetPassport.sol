// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

// OpenZeppelin upgradeable variants store state in EIP-7201 namespaced storage
// slots, which prevents storage collisions when the proxy delegates calls to
// the implementation contract.
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./interfaces/IPetPassport.sol";

/// @title PetPassport
/// @notice ERC-721 NFT that represents a pet's digital identity on Pet360.
///         One token per pet. Immutable ownership, updatable metadata.
///
/// @dev Architecture notes:
///      - UUPS proxy pattern: logic is upgradeable, proxy address is permanent.
///      - AccessControl: role-based permissions instead of single owner.
///      - Minimal on-chain data: only tokenId → tokenURI mapping stored here.
///      - All rich metadata (photo, medical records) lives on IPFS.
///
/// @custom:security-contact security@pet360.com.br
contract PetPassport is
    Initializable,               // prevents the implementation contract from being initialised directly
    ERC721Upgradeable,           // standard NFT logic (transfer, approve, ownerOf, etc.)
    AccessControlUpgradeable,    // role-based access control
    UUPSUpgradeable,             // upgrade mechanism (only UPGRADER_ROLE can upgrade)
    IPetPassport
{
    // ─── Roles ───────────────────────────────────────────────────────────────

    /// @notice Role granted to the NestJS API wallet.
    ///         Allows minting new passports and updating tokenURIs.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role granted to the admin multisig.
    ///         Allows upgrading the contract implementation.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @dev DEFAULT_ADMIN_ROLE (inherited from AccessControl) controls who can
    ///      grant and revoke all other roles. This MUST be held by a multisig
    ///      (e.g. Gnosis Safe) before mainnet deployment — a compromised hot
    ///      wallet would allow an attacker to grant MINTER_ROLE to themselves.

    // ─── Reentrancy guard ─────────────────────────────────────────────────────

    /// @dev Status values for the inline reentrancy guard.
    ///      Using 1/2 instead of 0/1 avoids a cold SSTORE on first call
    ///      (non-zero → non-zero is cheaper than zero → non-zero on EVM).
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    /// @dev Prevents reentrant calls to mint and updateTokenURI.
    ///      _safeMint makes an external call to onERC721Received on recipient
    ///      contracts — a malicious receiver could re-enter mint before state
    ///      settles. This guard blocks that re-entry.
    ///
    ///      Note: OZ 5.x removed ReentrancyGuardUpgradeable. Their regular
    ///      ReentrancyGuard uses EIP-7201 storage (upgrade-safe), but
    ///      hardhat-upgrades still rejects its constructor. We inline the
    ///      same logic here using a plain storage variable, which the
    ///      upgrade validator handles correctly.
    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ReentrancyGuard: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ─── Storage ─────────────────────────────────────────────────────────────

    /// @dev Auto-incrementing counter for token IDs.
    ///      Starts at 1 — token 0 is never minted (avoids zero-value ambiguity).
    uint256 private _nextTokenId;

    /// @dev Maps tokenId → IPFS metadata URI.
    ///      Stored here rather than in ERC721 base so we can update it.
    mapping(uint256 => string) private _tokenURIs;

    /// @dev Reentrancy guard status — 1 = not entered, 2 = entered.
    ///      Must come after _nextTokenId and _tokenURIs to preserve storage
    ///      layout compatibility across upgrades.
    uint256 private _reentrancyStatus;

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @dev Disables direct initialization of the implementation contract.
    ///      Without this, anyone could call initialize() on the implementation
    ///      and claim DEFAULT_ADMIN_ROLE on it. The proxy is unaffected — it has
    ///      its own separate storage and is already initialized.
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ─────────────────────────────────────────────────────────

    /// @notice Initialises the contract. Called once by the proxy on deployment.
    /// @dev    Replaces the constructor for upgradeable contracts.
    ///         `initializer` modifier ensures this can only be called once.
    /// @param defaultAdmin  Address that receives DEFAULT_ADMIN_ROLE (can grant/revoke roles).
    /// @param minter        Address that receives MINTER_ROLE (the NestJS API wallet).
    /// @param upgrader      Address that receives UPGRADER_ROLE (admin multisig).
    function initialize(
        address defaultAdmin,
        address minter,
        address upgrader
    ) public initializer {
        // Initialise parent contracts — must call all __X_init functions
        // in the inheritance chain for upgradeable contracts.
        __ERC721_init("PetPassport", "PET");  // sets NFT name and symbol
        __AccessControl_init();

        // Initialise reentrancy guard — 0 → NOT_ENTERED avoids an extra SSTORE
        // on the first nonReentrant call.
        _reentrancyStatus = _NOT_ENTERED;

        // Start token IDs at 1
        _nextTokenId = 1;

        // Grant roles to the provided addresses
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);
        _grantRole(UPGRADER_ROLE, upgrader);
    }

    // ─── Core functions ───────────────────────────────────────────────────────

    /// @inheritdoc IPetPassport
    /// @dev onlyRole(MINTER_ROLE) ensures only the NestJS API wallet can mint.
    ///      The NestJS API uploads to IPFS first, gets the CID, then calls this.
    function mint(
        address to,
        string calldata uri  // renamed from tokenURI to avoid shadowing the view function
    ) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(to != address(0), "PetPassport: mint to zero address");
        require(bytes(uri).length > 0, "PetPassport: empty tokenURI");

        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        // Mint the NFT — transfers ownership from address(0) to `to`
        _safeMint(to, tokenId);

        // Store the IPFS URI pointing to pet metadata JSON
        _tokenURIs[tokenId] = uri;

        emit PassportMinted(to, tokenId, uri);
        return tokenId;
    }

    /// @inheritdoc IPetPassport
    /// @dev Called by the NestJS API when a pet's medical records are updated.
    ///      A new metadata JSON is uploaded to IPFS with updated records,
    ///      and the new CID is stored here.
    function updateTokenURI(
        uint256 tokenId,
        string calldata newTokenURI
    ) external onlyRole(MINTER_ROLE) nonReentrant {
        require(_ownerOf(tokenId) != address(0), "PetPassport: token does not exist");
        require(bytes(newTokenURI).length > 0, "PetPassport: empty tokenURI");

        _tokenURIs[tokenId] = newTokenURI;
        emit TokenURIUpdated(tokenId, newTokenURI);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Returns the IPFS metadata URI for a given token.
    /// @dev Overrides ERC721Upgradeable.tokenURI to use our custom storage.
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "PetPassport: token does not exist");
        return _tokenURIs[tokenId];
    }

    // ─── UUPS upgrade authorisation ───────────────────────────────────────────

    /// @notice Guards the upgrade function — only UPGRADER_ROLE can upgrade.
    /// @dev Required by UUPSUpgradeable. Called internally before any upgrade.
    ///      If this reverts, the upgrade is blocked.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    // ─── Interface support ────────────────────────────────────────────────────

    /// @notice Declares which interfaces this contract supports.
    /// @dev Overrides required because both ERC721 and AccessControl define supportsInterface.
    ///      Wallets call this to check if the contract is a valid ERC-721.
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
