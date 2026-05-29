// Response body for POST /passport/mint (HTTP 201).

export interface MintPassportResponseDto {
  tokenId: string;  // bigint serialised as string — safe for JSON (no precision loss)
  txHash: string;
  tokenURI: string; // ipfs://<cid>
}
