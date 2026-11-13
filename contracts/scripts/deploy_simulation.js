// Pterodaktil (NEW) deploy SIMULATION ONLY — no mainnet transaction is sent.
// Computes CREATE2 predicted addresses exactly as the deterministic-proxy
// route did for BNTB/SAKURA/Momo/MYCO, and measures gas on the local network.
// Deploy order: PTRO token first (constructor: owner only), then the
// Pterodaktil NFT (constructor: baseURI, owner, Agent ID registry,
// predicted PTRO address), then the marketplace (constructor: predicted
// NFT address). After deploy the owner must call token.setMinter(nft).
// Mint stays CLOSED (mintOpen=false) until the owner calls setMintOpen(true).
// Model (user-confirmed 2026-11-13): supply 1,600, 16 tiers x 100,
// random deck-draw (ids 1-1590 in deck, 10 Paragons 1591-1600 burn-only);
// price ladder #1 FREE (10 PTRO), #2 @ 0.0005, #3 @ 0.001, #4 @ 0.002,
// #5 @ 0.003, #6 @ 0.005 BNB; max 6/wallet; Agent ID gate on BOTH free
// and paid mints; NO allowlist. Bonus per paid mint by tier 1,000-128,000
// PTRO. Burn 5 any -> 1 Paragon (cap 10) + 384,000 PTRO (3x).
// Royalty 5%. baseURI below is the WORKING Vercel name
// (pterodaktil-pixel) — if the project name changes, re-run this script:
// the predicted addresses change with the baseURI (it is a ctor arg).
// Run: npx hardhat run scripts/deploy_simulation.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

const BASE_URI = "https://pterodaktil-pixel.vercel.app/metadata/";
const OWNER = "0x36F3D56eAD5D1D6C2434F94DeFcEF732C5C3CbD2";
const AGENT_ID = "0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"; // SPACE ID Agent ID registry
const PROXY = "0x4e59b44847b379578588920cA78FbF26c0B4956C"; // deterministic deployment proxy
const PROXY_CREATION =
  "0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3";

function predict(artifact, argTypes, argValues) {
  const args = ethers.AbiCoder.defaultAbiCoder().encode(argTypes, argValues);
  const creation = artifact.bytecode + args.slice(2);
  const predicted = ethers.getCreate2Address(PROXY, ethers.ZeroHash, ethers.keccak256(creation));
  const inputData = "0x" + "00".repeat(32) + creation.slice(2);
  return { creation, predicted, inputData };
}

async function main() {
  const outDir = path.join(__dirname, "..");
  const [deployer, agent] = await ethers.getSigners();

  // --- PTRO token: predict first (constructor args: owner) ---
  const tokenArtifact = await hre.artifacts.readArtifact("PtroToken");
  const tokenPred = predict(tokenArtifact, ["address"], [OWNER]);

  // --- NFT: predict (constructor args: baseURI, owner, agentId, token=<redacted>) ---
  const nftArtifact = await hre.artifacts.readArtifact("PterodaktilNft");
  const nftPred = predict(
    nftArtifact,
    ["string", "address", "address", "address"],
    [BASE_URI, OWNER, AGENT_ID, tokenPred.predicted]
  );

  // --- Marketplace: predict (constructor args: nft=predicted) ---
  const marketFactory = await ethers.getContractFactory("PterodaktilMarketplace");
  const marketDeployTx = await marketFactory.getDeployTransaction(nftPred.predicted);
  const marketCreation = marketDeployTx.data;
  const marketPredicted = ethers.getCreate2Address(PROXY, ethers.ZeroHash, ethers.keccak256(marketCreation));
  const marketInputData = ethers.hexlify(ethers.concat([ethers.ZeroHash, marketCreation]));

  fs.writeFileSync(path.join(outDir, "token_creation.txt"), tokenPred.creation);
  fs.writeFileSync(path.join(outDir, "token_inputdata.txt"), tokenPred.inputData);
  fs.writeFileSync(path.join(outDir, "token_predicted.txt"), tokenPred.predicted);
  fs.writeFileSync(path.join(outDir, "nft_creation.txt"), nftPred.creation);
  fs.writeFileSync(path.join(outDir, "nft_inputdata.txt"), nftPred.inputData);
  fs.writeFileSync(path.join(outDir, "nft_predicted.txt"), nftPred.predicted);
  fs.writeFileSync(path.join(outDir, "market_creation.txt"), marketCreation);
  fs.writeFileSync(path.join(outDir, "market_inputdata.txt"), marketInputData);
  fs.writeFileSync(path.join(outDir, "market_predicted.txt"), marketPredicted);

  console.log("PTRO token predicted:", tokenPred.predicted);
  console.log("Pterodaktil NFT predicted:", nftPred.predicted);
  console.log("Marketplace predicted:", marketPredicted);

  // --- Local deploy + gas measurements ---
  const Token = await ethers.getContractFactory("PtroToken");
  const token = await Token.deploy(OWNER);
  const tokenReceipt = await token.deploymentTransaction().wait();
  console.log("token gas:", tokenReceipt.gasUsed.toString());

  const NFT = await ethers.getContractFactory("PterodaktilNft");
  const nft = await NFT.deploy(BASE_URI, OWNER, AGENT_ID, await token.getAddress());
  const nftReceipt = await nft.deploymentTransaction().wait();
  console.log("nft gas:", nftReceipt.gasUsed.toString());

  const Market = await ethers.getContractFactory("PterodaktilMarketplace");
  const market = await Market.deploy(await nft.getAddress());
  const marketReceipt = await market.deploymentTransaction().wait();
  console.log("market gas:", marketReceipt.gasUsed.toString());

  // --- Wire token minter ---
  // In production BAW (the token owner) calls setMinter(nft) after deploy.
  // Locally the deployer is not BAW, so this reverts here — expected.
  try {
    await token.setMinter(await nft.getAddress());
    console.log("token minter set to NFT");
  } catch (e) {
    console.log("setMinter skipped locally (owner is BAW in production, not the local deployer)");
  }

  // --- Sanity checks ---
  console.log("NFT name:", await nft.name(), "symbol:", await nft.symbol());
  console.log("MAX_SUPPLY:", (await nft.MAX_SUPPLY()).toString());
  console.log("DECK_SIZE:", (await nft.DECK_SIZE()).toString());
  console.log("royaltyInfo(1, 10000):", await nft.royaltyInfo(1, 10000));
  console.log("priceFor(1..6):", [1, 2, 3, 4, 5, 6].map((n) => ethers.formatEther(0)).join(", "));
  for (const n of [1, 2, 3, 4, 5, 6]) {
    console.log("  priceFor(" + n + "):", ethers.formatEther(await nft.priceFor(n)));
  }
  console.log("quotePaidFor(5):", ethers.formatEther(await nft.quotePaidFor(deployer.address, 5)));
  console.log("bonusForId(1):", ethers.formatEther(await nft.bonusForId(1)));
  console.log("bonusForId(1501):", ethers.formatEther(await nft.bonusForId(1501)));
  console.log("tierNameOf(1):", await nft.tierNameOf(1), "| tierNameOf(1600):", await nft.tierNameOf(1600));
  console.log("token totalSupply:", ethers.formatEther(await token.totalSupply()));
  console.log("token BONUS_POOL:", ethers.formatEther(await token.BONUS_POOL()));

  fs.writeFileSync(
    path.join(outDir, "deploy_simulation.json"),
    JSON.stringify(
      {
        baseURI: BASE_URI,
        token: tokenPred.predicted,
        nft: nftPred.predicted,
        market: marketPredicted,
        tokenGas: tokenReceipt.gasUsed.toString(),
        nftGas: nftReceipt.gasUsed.toString(),
        marketGas: marketReceipt.gasUsed.toString(),
      },
      null,
      2
    )
  );
  console.log("simulation done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
