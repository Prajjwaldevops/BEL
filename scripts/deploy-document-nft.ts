import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DocumentNFT with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy DocumentNFT
  const DocumentNFT = await ethers.getContractFactory("DocumentNFT");
  const documentNFT = await DocumentNFT.deploy();
  await documentNFT.waitForDeployment();

  const address = await documentNFT.getAddress();
  console.log("\n=== DocumentNFT Deployed ===");
  console.log("Contract Address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("Deployer:", deployer.address);
  
  const deployTx = documentNFT.deploymentTransaction();
  if (deployTx) {
    console.log("Deploy TX Hash:", deployTx.hash);
    const receipt = await deployTx.wait();
    if (receipt) {
      console.log("Block Number:", receipt.blockNumber);
      console.log("Gas Used:", receipt.gasUsed.toString());
    }
  }

  // Grant MINTER_ROLE to deployer (already done in constructor, but log it)
  const MINTER_ROLE = await documentNFT.MINTER_ROLE();
  const hasMinterRole = await documentNFT.hasRole(MINTER_ROLE, deployer.address);
  console.log("\nDeployer has MINTER_ROLE:", hasMinterRole);

  console.log("\n=== Configuration ===");
  console.log(`Set in .env.local:`);
  console.log(`NEXT_PUBLIC_DOCUMENT_NFT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
