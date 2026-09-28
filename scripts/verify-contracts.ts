import { run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Starting contract verification process...");

  const addresses = {
    identityRegistry: process.env.IDENTITY_REGISTRY_ADDRESS,
    roleManager: process.env.ROLE_MANAGER_ADDRESS,
    assetNFT: process.env.ASSET_NFT_ADDRESS,
    documentNFT: process.env.DOCUMENT_NFT_ADDRESS,
    auditRegistry: process.env.AUDIT_REGISTRY_ADDRESS,
  };

  const toVerify = Object.entries(addresses).filter(([_, addr]) => addr);

  if (toVerify.length === 0) {
    console.log("No contract addresses found in environment to verify.");
    return;
  }

  console.log(`Found ${toVerify.length} contracts to verify.`);

  for (const [name, address] of toVerify) {
    console.log(`\nVerifying ${name} at ${address}...`);
    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [], // Adjust based on contract arguments if needed
      });
      console.log(`✅ ${name} verified successfully.`);
    } catch (error: any) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log(`✅ ${name} is already verified.`);
      } else {
        console.error(`❌ Failed to verify ${name}:`, error.message);
      }
    }
  }

  console.log("\nVerification process completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
