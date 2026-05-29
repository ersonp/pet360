import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

// Minimal ABI — only the functions this service calls.
// Full ABI lives in the compiled contract artifacts; we only need mint here.
const PET_PASSPORT_ABI = [
  'function mint(address to, string calldata uri) external returns (uint256)',
  'event PassportMinted(address indexed to, uint256 indexed tokenId, string tokenURI)',
];

export interface MintResult {
  tokenId: bigint;
  txHash: string;
}

// Adapter for PetPassport.sol — wraps ethers.js so the passport service
// doesn't depend on ethers directly. Swap this for a different provider
// (e.g. viem, web3.js) without touching PassportService.
@Injectable()
export class ContractService {
  private readonly contract: ethers.Contract;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.getOrThrow<string>('POLYGON_RPC_URL');
    const privateKey = this.config.getOrThrow<string>('MINTER_PRIVATE_KEY');
    const contractAddress = this.config.getOrThrow<string>('CONTRACT_ADDRESS');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    this.contract = new ethers.Contract(contractAddress, PET_PASSPORT_ABI, wallet);
  }

  // Calls PetPassport.mint(ownerAddress, tokenURI), waits for 1 confirmation,
  // then reads the tokenId from the PassportMinted event in the receipt.
  async mintPassport(ownerAddress: string, tokenURI: string): Promise<MintResult> {
    const tx: ethers.ContractTransactionResponse = await this.contract.mint(
      ownerAddress,
      tokenURI,
    );

    const receipt = await tx.wait(1);
    if (!receipt) {
      throw new Error('Transaction receipt not received');
    }

    const tokenId = this.parseTokenIdFromReceipt(receipt);
    return { tokenId, txHash: tx.hash };
  }

  // Parses the tokenId from the PassportMinted event in the tx receipt.
  // Using the event log is the correct approach — tx.wait() return value
  // does not reliably carry the return value of a state-changing function.
  private parseTokenIdFromReceipt(receipt: ethers.TransactionReceipt): bigint {
    const iface = new ethers.Interface(PET_PASSPORT_ABI);

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === 'PassportMinted') {
          return parsed.args[1] as bigint;
        }
      } catch {
        // Log belongs to a different contract — skip
      }
    }

    throw new Error('PassportMinted event not found in transaction receipt');
  }
}
