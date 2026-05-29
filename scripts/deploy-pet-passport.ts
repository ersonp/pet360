import { ethers, upgrades, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeploymentRecord {
  proxy: string;
  implementation: string;
  deployer: string;
  txHash: string;
  deployedAt: string;
  network: string;
  chainId: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readEnvAddress(varName: string, fallback?: string): string {
  const value = process.env[varName] ?? fallback ?? "";
  if (!value) {
    throw new Error(`Missing env variable: ${varName}`);
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${varName} is not a valid Ethereum address: ${value}`);
  }
  return value;
}

function writeDeployment(networkName: string, record: DeploymentRecord): void {
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`Addresses written to deployments/${networkName}.json`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log(`\nDeploying PetPassport to ${networkName} (chainId: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);

  // MINTER_ADDRESS — the NestJS API wallet that will have MINTER_ROLE.
  // Defaults to deployer for local dev; must be set explicitly for testnet/mainnet.
  const minterAddress = readEnvAddress("MINTER_ADDRESS", deployer.address);

  // UPGRADER_ADDRESS — the multisig or admin wallet that can upgrade the contract.
  // Defaults to deployer for local dev; should be a multisig for production.
  const upgraderAddress = readEnvAddress("UPGRADER_ADDRESS", deployer.address);

  console.log(`Minter:   ${minterAddress}`);
  console.log(`Upgrader: ${upgraderAddress}`);

  // Deploy implementation + proxy in one call.
  // upgrades.deployProxy handles:
  //   1. Compiling and deploying the implementation contract
  //   2. Deploying an ERC1967Proxy pointing at the implementation
  //   3. Calling initialize() on the proxy with the provided args
  const PetPassport = await ethers.getContractFactory("PetPassport");
  const proxy = await upgrades.deployProxy(
    PetPassport,
    [deployer.address, minterAddress, upgraderAddress],
    { kind: "uups" }
  );

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  // Get the implementation address from the ERC1967 storage slot.
  const implementationAddress =
    await upgrades.erc1967.getImplementationAddress(proxyAddress);

  // Grab the deployment tx hash from the provider.
  const deployTx = proxy.deploymentTransaction();
  const txHash = deployTx?.hash ?? "unknown";

  console.log(`\nProxy deployed:          ${proxyAddress}`);
  console.log(`Implementation deployed: ${implementationAddress}`);
  console.log(`Transaction hash:        ${txHash}`);

  // Persist addresses for the upgrade script and the NestJS API to consume.
  const record: DeploymentRecord = {
    proxy: proxyAddress,
    implementation: implementationAddress,
    deployer: deployer.address,
    txHash,
    deployedAt: new Date().toISOString(),
    network: networkName,
    chainId,
  };

  writeDeployment(networkName, record);

  // Polygonscan verification — only on public networks, skipped on localhost.
  if (networkName === "amoy" || networkName === "polygon") {
    console.log("\nWaiting for block confirmations before verifying...");
    await deployTx?.wait(5);
    await verifyOnPolygonscan(implementationAddress);
  }
}

async function verifyOnPolygonscan(implementationAddress: string): Promise<void> {
  // We verify the implementation, not the proxy.
  // Polygonscan automatically links the proxy to the verified implementation.
  const { run } = await import("hardhat");
  try {
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("Contract verified on Polygonscan.");
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Already Verified")) {
      console.log("Contract already verified.");
    } else {
      console.warn("Verification failed:", err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
