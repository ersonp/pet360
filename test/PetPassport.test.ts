import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { PetPassport } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

// ─── Constants ────────────────────────────────────────────────────────────────

// Role hashes must match what the contract computes via keccak256("ROLE_NAME")
const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE is always bytes32(0)

const SAMPLE_URI = "ipfs://QmSampleMetadataCID";
const UPDATED_URI = "ipfs://QmUpdatedMetadataCID";

// ─── Fixture ─────────────────────────────────────────────────────────────────

// deployFixture runs once and snapshots the chain state.
// loadFixture restores from that snapshot for each test — much faster than
// redeploying from scratch every time.
async function deployFixture() {
  // Get test wallets — Hardhat provides 20 pre-funded accounts
  const [admin, minter, upgrader, petOwner, stranger] =
    await ethers.getSigners();

  // Get the contract factory — the object that knows how to deploy PetPassport
  const PetPassportFactory = await ethers.getContractFactory("PetPassport");

  // Deploy via UUPS proxy — this creates two contracts:
  //   1. The proxy (permanent address, holds state)
  //   2. The implementation (holds logic, can be swapped)
  // We interact only with the proxy address in all tests.
  const petPassport = (await upgrades.deployProxy(
    PetPassportFactory,
    [admin.address, minter.address, upgrader.address], // matches initialize() params
    { kind: "uups" }
  )) as unknown as PetPassport;

  await petPassport.waitForDeployment();

  return { petPassport, admin, minter, upgrader, petOwner, stranger };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("PetPassport", () => {

  // ── Initialization guards ──────────────────────────────────────────────────

  describe("Initialization guards", () => {
    it("reverts if initialize is called again on the proxy", async () => {
      const { petPassport, stranger } = await loadFixture(deployFixture);

      await expect(
        petPassport.initialize(stranger.address, stranger.address, stranger.address)
      ).to.be.reverted;
    });

    it("reverts if initialize is called directly on the implementation", async () => {
      const { stranger } = await loadFixture(deployFixture);

      // Get the implementation address from the EIP-1967 storage slot
      const PetPassportFactory = await ethers.getContractFactory("PetPassport");
      const impl = await PetPassportFactory.deploy();
      await impl.waitForDeployment();

      await expect(
        impl.initialize(stranger.address, stranger.address, stranger.address)
      ).to.be.reverted;
    });
  });

  // ── Deployment ─────────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("sets the correct NFT name and symbol", async () => {
      const { petPassport } = await loadFixture(deployFixture);

      // ERC-721 standard requires name() and symbol()
      expect(await petPassport.name()).to.equal("PetPassport");
      expect(await petPassport.symbol()).to.equal("PET");
    });

    it("grants DEFAULT_ADMIN_ROLE to admin", async () => {
      const { petPassport, admin } = await loadFixture(deployFixture);
      expect(await petPassport.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("grants MINTER_ROLE to minter", async () => {
      const { petPassport, minter } = await loadFixture(deployFixture);
      expect(await petPassport.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("grants UPGRADER_ROLE to upgrader", async () => {
      const { petPassport, upgrader } = await loadFixture(deployFixture);
      expect(await petPassport.hasRole(UPGRADER_ROLE, upgrader.address)).to.be.true;
    });

    it("supports ERC-721 interface", async () => {
      const { petPassport } = await loadFixture(deployFixture);
      // 0x80ac58cd is the ERC-721 interface ID — wallets use this to confirm NFT support
      expect(await petPassport.supportsInterface("0x80ac58cd")).to.be.true;
    });
  });

  // ── Minting ────────────────────────────────────────────────────────────────

  describe("mint", () => {
    it("minter can mint a new token", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      // connect(minter) = send this transaction signed by the minter wallet
      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      // Token ID 1 should now be owned by petOwner
      expect(await petPassport.ownerOf(1)).to.equal(petOwner.address);
    });

    it("returns the correct tokenId on mint", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      // staticCall simulates the transaction locally and returns the Solidity return value.
      // Valid for test assertions — in production the API reads tokenId from the
      // PassportMinted event in the tx receipt instead (committed txs don't expose
      // return values over JSON-RPC).
      const tokenId = await petPassport
        .connect(minter)
        .mint.staticCall(petOwner.address, SAMPLE_URI);

      expect(tokenId).to.equal(1n); // first token is always ID 1
    });

    it("token IDs increment with each mint", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);
      const tokenId = await petPassport
        .connect(minter)
        .mint.staticCall(petOwner.address, SAMPLE_URI);

      expect(tokenId).to.equal(2n);
    });

    it("sets tokenURI correctly on mint", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);
      expect(await petPassport.tokenURI(1)).to.equal(SAMPLE_URI);
    });

    it("emits PassportMinted event on mint", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      // expect(...).to.emit checks the transaction emitted the correct event
      await expect(
        petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI)
      )
        .to.emit(petPassport, "PassportMinted")
        .withArgs(petOwner.address, 1n, SAMPLE_URI);
    });

    it("emits ERC-721 Transfer event on mint", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      // ERC-721 standard: mint emits Transfer from address(0) to owner
      await expect(
        petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI)
      )
        .to.emit(petPassport, "Transfer")
        .withArgs(ethers.ZeroAddress, petOwner.address, 1n);
    });

    it("reverts when non-minter tries to mint", async () => {
      const { petPassport, stranger, petOwner } = await loadFixture(deployFixture);

      // stranger has no MINTER_ROLE — should revert with AccessControl error
      await expect(
        petPassport.connect(stranger).mint(petOwner.address, SAMPLE_URI)
      ).to.be.revertedWithCustomError(petPassport, "AccessControlUnauthorizedAccount");
    });

    it("reverts when minting to zero address", async () => {
      const { petPassport, minter } = await loadFixture(deployFixture);

      await expect(
        petPassport.connect(minter).mint(ethers.ZeroAddress, SAMPLE_URI)
      ).to.be.revertedWithCustomError(petPassport, "PetPassport__MintToZeroAddress");
    });

    it("reverts when minting with empty tokenURI", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await expect(
        petPassport.connect(minter).mint(petOwner.address, "")
      ).to.be.revertedWithCustomError(petPassport, "PetPassport__EmptyTokenURI");
    });
  });

  // ── tokenURI update ────────────────────────────────────────────────────────

  describe("updateTokenURI", () => {
    it("minter can update tokenURI", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);
      await petPassport.connect(minter).updateTokenURI(1, UPDATED_URI);

      expect(await petPassport.tokenURI(1)).to.equal(UPDATED_URI);
    });

    it("emits TokenURIUpdated event on update", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      await expect(petPassport.connect(minter).updateTokenURI(1, UPDATED_URI))
        .to.emit(petPassport, "TokenURIUpdated")
        .withArgs(1n, UPDATED_URI);
    });

    it("reverts when non-minter tries to update tokenURI", async () => {
      const { petPassport, minter, stranger, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      await expect(
        petPassport.connect(stranger).updateTokenURI(1, UPDATED_URI)
      ).to.be.revertedWithCustomError(petPassport, "AccessControlUnauthorizedAccount");
    });

    it("reverts when updating non-existent token", async () => {
      const { petPassport, minter } = await loadFixture(deployFixture);

      await expect(
        petPassport.connect(minter).updateTokenURI(999, UPDATED_URI)
      ).to.be.revertedWithCustomError(petPassport, "PetPassport__TokenDoesNotExist");
    });

    it("reverts when updating with empty tokenURI", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      await expect(
        petPassport.connect(minter).updateTokenURI(1, "")
      ).to.be.revertedWithCustomError(petPassport, "PetPassport__EmptyTokenURI");
    });
  });

  // ── Reentrancy guard ───────────────────────────────────────────────────────

  describe("Reentrancy guard", () => {
    it("mint is protected by nonReentrant — sequential mints from minter succeed", async () => {
      // nonReentrant blocks re-entry within a single call stack, not sequential calls.
      // This test verifies the modifier does not break normal sequential usage.
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);
      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      expect(await petPassport.ownerOf(1)).to.equal(petOwner.address);
      expect(await petPassport.ownerOf(2)).to.equal(petOwner.address);
    });

    it("updateTokenURI is protected by nonReentrant — sequential calls succeed", async () => {
      const { petPassport, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);
      await petPassport.connect(minter).updateTokenURI(1, UPDATED_URI);
      await petPassport.connect(minter).updateTokenURI(1, SAMPLE_URI);

      expect(await petPassport.tokenURI(1)).to.equal(SAMPLE_URI);
    });
  });

  // ── tokenURI view ──────────────────────────────────────────────────────────

  describe("tokenURI", () => {
    it("reverts for non-existent token", async () => {
      const { petPassport } = await loadFixture(deployFixture);

      await expect(petPassport.tokenURI(999)).to.be.revertedWithCustomError(
        petPassport, "PetPassport__TokenDoesNotExist"
      );
    });
  });

  // ── Access control ─────────────────────────────────────────────────────────

  describe("Access control", () => {
    it("admin can grant MINTER_ROLE to a new address", async () => {
      const { petPassport, admin, stranger } = await loadFixture(deployFixture);

      await petPassport.connect(admin).grantRole(MINTER_ROLE, stranger.address);
      expect(await petPassport.hasRole(MINTER_ROLE, stranger.address)).to.be.true;
    });

    it("admin can revoke MINTER_ROLE", async () => {
      const { petPassport, admin, minter } = await loadFixture(deployFixture);

      await petPassport.connect(admin).revokeRole(MINTER_ROLE, minter.address);
      expect(await petPassport.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });

    it("revoked minter cannot mint", async () => {
      const { petPassport, admin, minter, petOwner } = await loadFixture(deployFixture);

      await petPassport.connect(admin).revokeRole(MINTER_ROLE, minter.address);

      await expect(
        petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI)
      ).to.be.revertedWithCustomError(petPassport, "AccessControlUnauthorizedAccount");
    });

    it("non-admin cannot grant roles", async () => {
      const { petPassport, stranger, petOwner } = await loadFixture(deployFixture);

      await expect(
        petPassport.connect(stranger).grantRole(MINTER_ROLE, petOwner.address)
      ).to.be.revertedWithCustomError(petPassport, "AccessControlUnauthorizedAccount");
    });
  });

  // ── Upgrades ───────────────────────────────────────────────────────────────

  describe("Upgrades", () => {
    it("UPGRADER_ROLE can upgrade the contract", async () => {
      const { petPassport, upgrader } = await loadFixture(deployFixture);

      const PetPassportV2Factory = await ethers.getContractFactory(
        "PetPassport",
        upgrader // the upgrade tx must be signed by upgrader
      );

      // upgradeProxy deploys a new implementation and points the proxy at it
      const upgraded = await upgrades.upgradeProxy(
        await petPassport.getAddress(),
        PetPassportV2Factory,
        { kind: "uups" }
      );

      // Proxy address must stay the same after upgrade
      expect(await upgraded.getAddress()).to.equal(await petPassport.getAddress());
    });

    it("state is preserved after upgrade", async () => {
      const { petPassport, minter, upgrader, petOwner } = await loadFixture(deployFixture);

      // Mint before upgrade
      await petPassport.connect(minter).mint(petOwner.address, SAMPLE_URI);

      // Upgrade
      const PetPassportV2Factory = await ethers.getContractFactory("PetPassport", upgrader);
      const upgraded = (await upgrades.upgradeProxy(
        await petPassport.getAddress(),
        PetPassportV2Factory,
        { kind: "uups" }
      )) as unknown as PetPassport;

      // Token minted before upgrade must still exist with correct data
      expect(await upgraded.ownerOf(1)).to.equal(petOwner.address);
      expect(await upgraded.tokenURI(1)).to.equal(SAMPLE_URI);
    });

    it("non-upgrader cannot upgrade", async () => {
      const { petPassport, stranger } = await loadFixture(deployFixture);

      const PetPassportV2Factory = await ethers.getContractFactory(
        "PetPassport",
        stranger // stranger has no UPGRADER_ROLE
      );

      await expect(
        upgrades.upgradeProxy(
          await petPassport.getAddress(),
          PetPassportV2Factory,
          { kind: "uups" }
        )
      ).to.be.revertedWithCustomError(petPassport, "AccessControlUnauthorizedAccount");
    });
  });
});
