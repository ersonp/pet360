// ERC-721 metadata JSON shape — stored on IPFS, referenced by tokenURI.
// Follows the OpenSea metadata standard so wallets and marketplaces render it correctly.
// https://docs.opensea.io/docs/metadata-standards

export interface PetAttribute {
  trait_type: string;
  value: string;
}

export interface PetMetadata {
  name: string;
  description: string;
  // ipfs://<photo-cid> — set after the photo is uploaded
  image: string;
  attributes: PetAttribute[];
}
