/**
 * BEL SENTINEL — Full Contract Deployment Script
 *
 * Deploys all BEL Sentinel smart contracts in order:
 * 1. IdentityRegistry
 * 2. RoleManager (depends on IdentityRegistry)
 * 3. AssetNFT (depends on RoleManager)
 * 4. DocumentNFT (standalone)
 * 5. AuditRegistry (standalone)
 *
 * Outputs all contract addresses for .env.local configuration.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-all.ts --network localhost
 *   npx hardhat run scripts/deploy-all.ts --network sepolia
 */

import hre from "hardhat";

async function main() {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║     BEL SENTINEL — Full Contract Deployment          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
  console.log("  Deployer:", deployer.address);
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());
  console.log("  Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  const deployed: Record<string, string> = {};
  const gasUsed: Record<string, bigint> = {};

  // ===== 1. IdentityRegistry =====
  console.log("┌─ [1/5] Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddr = await identityRegistry.getAddress();
  deployed.IdentityRegistry = identityAddr;

  const idTx = identityRegistry.deploymentTransaction();
  if (idTx) {
    const receipt = await idTx.wait();
    if (receipt) gasUsed.IdentityRegistry = receipt.gasUsed;
  }
  console.log(`│  Address: ${identityAddr}`);
  console.log("└─ IdentityRegistry ✓\n");

  // ===== 2. RoleManager =====
  console.log("┌─ [2/5] Deploying RoleManager...");
  const RoleManager = await ethers.getContractFactory("RoleManager");
  const roleManager = await RoleManager.deploy(identityAddr);
  await roleManager.waitForDeployment();
  const roleAddr = await roleManager.getAddress();
  deployed.RoleManager = roleAddr;

  const rmTx = roleManager.deploymentTransaction();
  if (rmTx) {
    const receipt = await rmTx.wait();
    if (receipt) gasUsed.RoleManager = receipt.gasUsed;
  }
  console.log(`│  Address: ${roleAddr}`);
  console.log(`│  Identity Registry: ${identityAddr}`);
  console.log("└─ RoleManager ✓\n");

  // ===== 3. AssetNFT =====
  console.log("┌─ [3/5] Deploying AssetNFT...");
  const AssetNFT = await ethers.getContractFactory("AssetNFT");
  const assetNFT = await AssetNFT.deploy(roleAddr);
  await assetNFT.waitForDeployment();
  const assetAddr = await assetNFT.getAddress();
  deployed.AssetNFT = assetAddr;

  const aTx = assetNFT.deploymentTransaction();
  if (aTx) {
    const receipt = await aTx.wait();
    if (receipt) gasUsed.AssetNFT = receipt.gasUsed;
  }
  console.log(`│  Address: ${assetAddr}`);
  console.log(`│  Role Manager: ${roleAddr}`);
  console.log("└─ AssetNFT ✓\n");

  // ===== 4. DocumentNFT =====
  console.log("┌─ [4/5] Deploying DocumentNFT...");
  const DocumentNFT = await ethers.getContractFactory("DocumentNFT");
  const documentNFT = await DocumentNFT.deploy();
  await documentNFT.waitForDeployment();
  const docAddr = await documentNFT.getAddress();
  deployed.DocumentNFT = docAddr;

  const dTx = documentNFT.deploymentTransaction();
  if (dTx) {
    const receipt = await dTx.wait();
    if (receipt) gasUsed.DocumentNFT = receipt.gasUsed;
  }

  // Verify deployer has MINTER_ROLE
  const MINTER_ROLE = await documentNFT.MINTER_ROLE();
  const hasMinter = await documentNFT.hasRole(MINTER_ROLE, deployer.address);
  console.log(`│  Address: ${docAddr}`);
  console.log(`│  Deployer has MINTER_ROLE: ${hasMinter}`);
  console.log("└─ DocumentNFT ✓\n");

  // ===== 5. AuditRegistry =====
  console.log("┌─ [5/5] Deploying AuditRegistry...");
  const AuditRegistry = await ethers.getContractFactory("AuditRegistry");
  const auditRegistry = await AuditRegistry.deploy();
  await auditRegistry.waitForDeployment();
  const auditAddr = await auditRegistry.getAddress();
  deployed.AuditRegistry = auditAddr;

  const arTx = auditRegistry.deploymentTransaction();
  if (arTx) {
    const receipt = await arTx.wait();
    if (receipt) gasUsed.AuditRegistry = receipt.gasUsed;
  }
  console.log(`│  Address: ${auditAddr}`);
  console.log("└─ AuditRegistry ✓\n");

  // ===== Summary =====
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║           DEPLOYMENT COMPLETE                        ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  console.log("Contract Addresses:");
  for (const [name, address] of Object.entries(deployed)) {
    const gas = gasUsed[name] ? ` (gas: ${gasUsed[name].toString()})` : '';
    console.log(`  ${name}: ${address}${gas}`);
  }

  // Gas summary
  const totalGas = Object.values(gasUsed).reduce((sum, g) => sum + g, 0n);
  console.log(`\n  Total Gas Used: ${totalGas.toString()}`);

  // .env output
  console.log("\n═══ Copy to .env.local ═══\n");
  console.log(`NEXT_PUBLIC_IDENTITY_NFT_ADDRESS=${deployed.IdentityRegistry}`);
  console.log(`NEXT_PUBLIC_ROLE_MANAGER_ADDRESS=${deployed.RoleManager}`);
  console.log(`NEXT_PUBLIC_ASSET_NFT_ADDRESS=${deployed.AssetNFT}`);
  console.log(`NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS=${deployed.DocumentNFT}`);
  console.log(`NEXT_PUBLIC_AUDIT_REGISTRY_ADDRESS=${deployed.AuditRegistry}`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
