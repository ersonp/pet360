// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/// @title IPetPassport
/// @notice Interface for the PetPassport NFT contract.
///         Defines the public API that the NestJS API and other contracts interact with.
///         Keeping logic behind an interface lets us swap implementations without
///         breaking callers — core hexagonal architecture principle.
interface IPetPassport {
    /// @notice Emitted when a new pet passport NFT is minted.
    /// @param to      The wallet address that receives the NFT (pet owner).
    /// @param tokenId The unique ID assigned to this pet's passport.
    /// @param tokenURI The IPFS URI pointing to the pet's metadata JSON.
    event PassportMinted(address indexed to, uint256 indexed tokenId, string tokenURI);

    /// @notice Emitted when a pet's metadata URI is updated.
    /// @param tokenId    The token whose URI changed.
    /// @param newTokenURI The new IPFS URI (e.g. after a medical record update).
    event TokenURIUpdated(uint256 indexed tokenId, string newTokenURI);

    /// @notice Mint a new pet passport NFT.
    /// @dev Only callable by addresses with MINTER_ROLE.
    /// @param to  The pet owner's wallet address.
    /// @param uri IPFS URI pointing to the pet's metadata JSON.
    /// @return tokenId The ID of the newly minted token.
    function mint(address to, string calldata uri) external returns (uint256 tokenId);

    /// @notice Update the metadata URI for an existing passport.
    /// @dev Only callable by addresses with MINTER_ROLE.
    ///      Used when medical records evolve — new IPFS CID is set here.
    /// @param tokenId    The token to update.
    /// @param newTokenURI The new IPFS URI.
    function updateTokenURI(uint256 tokenId, string calldata newTokenURI) external;
}
