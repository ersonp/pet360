// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

// OpenZeppelin upgradeable variants store state in EIP-7201 namespaced storage
// slots, which prevents storage collisions when the proxy delegates calls to
// the implementation contract.
import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {IPetPassport} from "./interfaces/IPetPassport.sol";

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
    Initializable, // prevents the implementation contract from being initialised directly
    ERC721Upgradeable, // standard NFT logic (transfer, approve, ownerOf, etc.)
    AccessControlUpgradeable, // role-based access control
    UUPSUpgradeable, // upgrade mechanism (only UPGRADER_ROLE can upgrade)
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

    // ─── Reentrancy guard constants ───────────────────────────────────────────

    /// @dev Status values for the inline reentrancy guard.
    ///      Using 1/2 instead of 0/1 avoids a cold SSTORE on first call
    ///      (non-zero → non-zero is cheaper than zero → non-zero on EVM).
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

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

    // ─── Errors ───────────────────────────────────────────────────────────────

    error PetPassport__MintToZeroAddress();
    error PetPassport__EmptyTokenURI();
    error PetPassport__TokenDoesNotExist(uint256 tokenId);
    error PetPassport__ReentrantCall();

    // ─── Modifiers ────────────────────────────────────────────────────────────

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
        if (_reentrancyStatus == _ENTERED) revert PetPassport__ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

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
    function initialize(address defaultAdmin, address minter, address upgrader) public initializer {
        // Initialise parent contracts — must call all __X_init functions
        // in the inheritance chain for upgradeable contracts.
        __ERC721_init("PetPassport", "PET");
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

    // ─── External functions ───────────────────────────────────────────────────

    /// @inheritdoc IPetPassport
    /// @dev Follows Checks-Effects-Interactions: all state is written before
    ///      _safeMint triggers the external onERC721Received callback.
    function mint(address to, string calldata uri) external onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        // Checks
        if (to == address(0)) revert PetPassport__MintToZeroAddress();
        if (bytes(uri).length == 0) revert PetPassport__EmptyTokenURI();

        // Effects — all state written before the external call
        uint256 tokenId = _nextTokenId++;
        _tokenURIs[tokenId] = uri;

        // Interactions — external call last
        _safeMint(to, tokenId);
        emit PassportMinted(to, tokenId, uri);
        return tokenId;
    }

    /// @inheritdoc IPetPassport
    function updateTokenURI(uint256 tokenId, string calldata newTokenURI) external onlyRole(MINTER_ROLE) nonReentrant {
        // Checks
        if (_ownerOf(tokenId) == address(0)) revert PetPassport__TokenDoesNotExist(tokenId);
        if (bytes(newTokenURI).length == 0) revert PetPassport__EmptyTokenURI();

        // Effects
        _tokenURIs[tokenId] = newTokenURI;
        emit TokenURIUpdated(tokenId, newTokenURI);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Returns the IPFS metadata URI for a given token.
    /// @dev    Overrides ERC721Upgradeable.tokenURI to use our custom storage.
    /// @param  tokenId The token to query.
    /// @return         The IPFS metadata URI.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert PetPassport__TokenDoesNotExist(tokenId);
        return _tokenURIs[tokenId];
    }

    /// @notice Declares which interfaces this contract supports.
    /// @dev    Overrides required because both ERC721 and AccessControl define supportsInterface.
    ///         Wallets call this to check if the contract is a valid ERC-721.
    /// @param  interfaceId The interface identifier to check.
    /// @return             True if the interface is supported.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    // ─── Internal functions ───────────────────────────────────────────────────

    /// @notice Guards the upgrade function — only UPGRADER_ROLE can upgrade.
    /// @dev    Required by UUPSUpgradeable. Called internally before any upgrade.
    ///         If this reverts, the upgrade is blocked.
    /// @param  newImplementation Address of the new implementation contract.
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
