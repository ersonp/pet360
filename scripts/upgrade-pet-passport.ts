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
  upgradedAt?: string;
  previousImplementation?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readDeployment(networkName: string): DeploymentRecord {
  const filePath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `No deployment found for network "${networkName}". Run deploy-pet-passport.ts first.`
    );
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as DeploymentRecord;
}

function writeDeployment(networkName: string, record: DeploymentRecord): void {
  const filePath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`deployments/${networkName}.json updated.`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const networkName = network.name;
  const [deployer] = await ethers.getSigners();

  console.log(`\nUpgrading PetPassport on ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  // Read the proxy address written by deploy-pet-passport.ts.
  const deployment = readDeployment(networkName);
  const proxyAddress = deployment.proxy;
  const previousImpl = deployment.implementation;

  console.log(`Proxy address:            ${proxyAddress}`);
  console.log(`Current implementation:   ${previousImpl}`);

  // Deploy new implementation and point the proxy at it.
  // upgrades.upgradeProxy:
  //   1. Compiles and deploys the new implementation contract
  //   2. Calls upgradeToAndCall() on the proxy (requires UPGRADER_ROLE on the caller)
  //   3. Storage layout compatibility is checked automatically — reverts if unsafe
  const PetPassport = await ethers.getContractFactory("PetPassport");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, PetPassport, {
    kind: "uups",
  });

  await upgraded.waitForDeployment();

  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log(`New implementation:       ${newImpl}`);

  // Update the deployment record with the new implementation address.
  const updatedRecord: DeploymentRecord = {
    ...deployment,
    implementation: newImpl,
    previousImplementation: previousImpl,
    upgradedAt: new Date().toISOString(),
  };

  writeDeployment(networkName, updatedRecord);

  // Verify new implementation on Polygonscan.
  if (networkName === "mumbai" || networkName === "polygon") {
    console.log("\nWaiting for block confirmations before verifying...");
    const upgradeTx = upgraded.deploymentTransaction();
    await upgradeTx?.wait(5);
    await verifyOnPolygonscan(newImpl);
  }
}

async function verifyOnPolygonscan(implementationAddress: string): Promise<void> {
  const { run } = await import("hardhat");
  try {
    await run("verify:verify", {
      address: implementationAddress,
      constructorArguments: [],
    });
    console.log("New implementation verified on Polygonscan.");
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
