const { expect } = require("chai");
const { ethers } = require("hardhat");

const BASE_URI = "https://pterodaktil-new.vercel.app/metadata/";
const OWNER = "0x36F3D56eAD5D1D6C2434F94DeFcEF732C5C3CbD2";
const E = ethers.parseEther;

describe("Pterodaktil (NEW)", function () {
  let token, nft, owner, agent, stranger, agentIdMock;

  before(async function () {
    [owner, agent, stranger] = await ethers.getSigners();
    // Mock Agent ID registry: agent has an Agent ID, stranger does not.
    const Mock = await ethers.getContractFactory("MockAgentID");
    agentIdMock = await Mock.deploy();
    await agentIdMock.mint(agent.address);

    const Token = await ethers.getContractFactory("PtroToken");
    token = await Token.deploy(owner.address);
    const NFT = await ethers.getContractFactory("PterodaktilNft");
    nft = await NFT.deploy(BASE_URI, owner.address, await agentIdMock.getAddress(), await token.getAddress());
    await token.setMinter(await nft.getAddress());
  });

  // Helper: redeploy with the local signer as owner so tests can open mint.
  async function fresh() {
    const Token = await ethers.getContractFactory("PtroToken");
    const t = await Token.deploy(owner.address);
    const NFT = await ethers.getContractFactory("PterodaktilNft");
    const n = await NFT.deploy(BASE_URI, owner.address, await agentIdMock.getAddress(), await t.getAddress());
    await t.setMinter(await n.getAddress());
    await n.setMintOpen(true);
    return { t, n };
  }

  // Collect the token ids a wallet minted (from Minted events).
  async function mintedIds(n, wallet) {
    const events = await n.queryFilter(n.filters.Minted(wallet.address));
    return events.map((e) => Number(e.args.id));
  }

  it("constructor: name/symbol/supply/royalty 5%", async function () {
    expect(await nft.name()).to.equal("Pterodaktil");
    expect(await nft.symbol()).to.equal("PTRO");
    expect(await nft.MAX_SUPPLY()).to.equal(1600);
    expect(await nft.DECK_SIZE()).to.equal(1590);
    expect(await nft.MAX_PER_WALLET()).to.equal(6);
    expect(await nft.BURN_CAP()).to.equal(10);
    expect(await nft.mintOpen()).to.equal(false);
    expect(await nft.deckRemaining()).to.equal(1590);
    const [receiver, amount] = await nft.royaltyInfo(1, 10000);
    expect(receiver).to.equal(owner.address);
    expect(amount).to.equal(500); // 5%
  });

  it("priceFor ladder: 1 free, 2 @ 0.0005, 3 @ 0.001, 4 @ 0.002, 5 @ 0.003, 6 @ 0.005", async function () {
    expect(await nft.priceFor(1)).to.equal(0);
    expect(await nft.priceFor(2)).to.equal(E("0.0005"));
    expect(await nft.priceFor(3)).to.equal(E("0.001"));
    expect(await nft.priceFor(4)).to.equal(E("0.002"));
    expect(await nft.priceFor(5)).to.equal(E("0.003"));
    expect(await nft.priceFor(6)).to.equal(E("0.005"));
    expect(await nft.priceForPaid(1)).to.equal(E("0.0005"));
    expect(await nft.priceForPaid(2)).to.equal(E("0.001"));
    expect(await nft.priceForPaid(3)).to.equal(E("0.002"));
    expect(await nft.priceForPaid(4)).to.equal(E("0.003"));
    expect(await nft.priceForPaid(5)).to.equal(E("0.005"));
  });

  it("tierNameOf / rarityOf / bonusForId by id ranges", async function () {
    expect(await nft.tierNameOf(1)).to.equal("Common");
    expect(await nft.tierNameOf(100)).to.equal("Common");
    expect(await nft.tierNameOf(101)).to.equal("Uncommon");
    expect(await nft.tierNameOf(201)).to.equal("Rare");
    expect(await nft.tierNameOf(301)).to.equal("Epic");
    expect(await nft.tierNameOf(401)).to.equal("Legendary");
    expect(await nft.tierNameOf(501)).to.equal("Mythic");
    expect(await nft.tierNameOf(601)).to.equal("Divine");
    expect(await nft.tierNameOf(701)).to.equal("Celestial");
    expect(await nft.tierNameOf(801)).to.equal("Limited");
    expect(await nft.tierNameOf(901)).to.equal("Seasonal");
    expect(await nft.tierNameOf(1001)).to.equal("Event");
    expect(await nft.tierNameOf(1101)).to.equal("Exclusive");
    expect(await nft.tierNameOf(1201)).to.equal("Genesis");
    expect(await nft.tierNameOf(1301)).to.equal("Apex");
    expect(await nft.tierNameOf(1401)).to.equal("Ethereal");
    expect(await nft.tierNameOf(1501)).to.equal("Paragon");
    expect(await nft.tierNameOf(1600)).to.equal("Paragon");
    expect(await nft.rarityOf(1501)).to.equal("Paragon");
    expect(await nft.bonusForId(1)).to.equal(E("1000"));
    expect(await nft.bonusForId(200)).to.equal(E("1000"));
    expect(await nft.bonusForId(201)).to.equal(E("2000"));
    expect(await nft.bonusForId(401)).to.equal(E("4000"));
    expect(await nft.bonusForId(601)).to.equal(E("8000"));
    expect(await nft.bonusForId(801)).to.equal(E("16000"));
    expect(await nft.bonusForId(1001)).to.equal(E("32000"));
    expect(await nft.bonusForId(1201)).to.equal(E("64000"));
    expect(await nft.bonusForId(1401)).to.equal(E("128000"));
    expect(await nft.bonusForId(1600)).to.equal(E("128000"));
  });

  it("quotePaidFor: 5 paid from scratch = 0.0115 BNB", async function () {
    expect(await nft.quotePaidFor(agent.address, 5)).to.equal(E("0.0115"));
    expect(await nft.quotePaidFor(agent.address, 1)).to.equal(E("0.0005"));
    expect(await nft.quotePaidFor(agent.address, 2)).to.equal(E("0.0015")); // 0.0005 + 0.001
    await expect(nft.quotePaidFor(agent.address, 6)).to.be.revertedWithCustomError(nft, "OverLimit");
  });

  it("mint closed: free and paid revert MintClosed before open", async function () {
    await expect(nft.connect(agent).mintFree()).to.be.revertedWithCustomError(nft, "MintClosed");
    await expect(
      nft.connect(agent).mintPaid(1, { value: E("0.0005") })
    ).to.be.revertedWithCustomError(nft, "MintClosed");
  });

  it("non-agent cannot mint free or paid", async function () {
    const { n } = await fresh();
    await expect(n.connect(stranger).mintFree()).to.be.revertedWithCustomError(n, "NotAgent");
    await expect(
      n.connect(stranger).mintPaid(1, { value: E("0.0005") })
    ).to.be.revertedWithCustomError(n, "NotAgent");
  });

  it("agent free mint works, accrues 10 PTRO, draws a deck id 1-1590", async function () {
    const { t, n } = await fresh();
    await n.connect(agent).mintFree();
    expect(await n.totalMinted()).to.equal(1);
    expect(await n.freeMintedOf(agent.address)).to.equal(1);
    expect(await n.balanceOf(agent.address)).to.equal(1);
    expect(await t.accrued(agent.address)).to.equal(E("10")); // free accrues 10 PTRO
    const ids = await mintedIds(n, agent);
    expect(ids.length).to.equal(1);
    expect(ids[0]).to.be.gte(1).and.lte(1590);
    expect(await n.deckRemaining()).to.equal(1589);
    await expect(n.connect(agent).mintFree()).to.be.revertedWithCustomError(n, "FreeClaimed");
  });

  it("agent paid mint: correct cost, accrues tier bonus, max 6/wallet", async function () {
    const { t, n } = await fresh();
    await n.connect(agent).mintFree();
    // 5 paid = 0.0005 + 0.001 + 0.002 + 0.003 + 0.005 = 0.0115
    await n.connect(agent).mintPaid(5, { value: E("0.0115") });
    expect(await n.paidMintedOf(agent.address)).to.equal(5);
    expect(await n.mintedOf(agent.address)).to.equal(6);
    // accrued = 10 (free) + sum of bonusForId over the 5 paid draws
    const ids = await mintedIds(n, agent);
    expect(ids.length).to.equal(6);
    let expected = E("10");
    for (const id of ids.slice(1)) expected += await n.bonusForId(id);
    expect(await t.accrued(agent.address)).to.equal(expected);
    // underpaid reverts (fresh wallet check below uses a new wallet)
    const signers = await ethers.getSigners();
    const other = signers[3];
    await agentIdMock.mint(other.address);
    await expect(
      n.connect(other).mintPaid(1, { value: E("0.0001") })
    ).to.be.revertedWithCustomError(n, "Underpaid");
    // exceed 6/wallet reverts
    await expect(
      n.connect(agent).mintPaid(1, { value: E("0.005") })
    ).to.be.revertedWithCustomError(n, "OverLimit");
  });

  it("burnForParagon: burn 5 -> 1 Paragon (id 1591) + 384,000 PTRO", async function () {
    const { t, n } = await fresh();
    await n.connect(agent).mintFree();
    await n.connect(agent).mintPaid(4, { value: E("0.0065") }); // 0.0005+0.001+0.002+0.003
    const ids = await mintedIds(n, agent);
    expect(ids.length).to.equal(5);
    const accruedBefore = await t.accrued(agent.address);
    await expect(n.connect(agent).burnForParagon(ids))
      .to.emit(n, "Burned");
    expect(await n.burnParagonMinted()).to.equal(1);
    expect(await n.ownerOf(1591)).to.equal(agent.address);
    expect(await n.tierNameOf(1591)).to.equal("Paragon");
    expect(await t.accrued(agent.address)).to.equal(accruedBefore + E("384000"));
    // the 5 burned NFTs no longer exist
    for (const id of ids) await expect(n.ownerOf(id)).to.be.reverted;
  });

  it("burnForParagon rejects duplicates, non-owned and out-of-range ids", async function () {
    const { n } = await fresh();
    await n.connect(agent).mintFree();
    const ids = await mintedIds(n, agent);
    const id = ids[0];
    const dup = [id, id, id, id, id];
    await expect(n.connect(agent).burnForParagon(dup)).to.be.revertedWithCustomError(n, "BadSet");
    // ids owned by another wallet -> NotOwner (mint 5 with a second agent wallet)
    const signers = await ethers.getSigners();
    const other = signers[3];
    await agentIdMock.mint(other.address);
    await n.connect(other).mintFree();
    await n.connect(other).mintPaid(4, { value: E("0.0065") });
    const otherIds = await mintedIds(n, other);
    await expect(n.connect(agent).burnForParagon(otherIds)).to.be.revertedWithCustomError(n, "NotOwner");
    // unminted ids -> ownerOf reverts ERC721NonexistentToken (OpenZeppelin)
    const notMinted = [id, 2, 3, 4, 5];
    await expect(n.connect(agent).burnForParagon(notMinted)).to.be.revertedWithCustomError(
      n,
      "ERC721NonexistentToken"
    );
    const outOfRange = [id, 0, 3, 4, 5];
    await expect(n.connect(agent).burnForParagon(outOfRange)).to.be.revertedWithCustomError(n, "BadSet");
    // non-owner cannot burn someone else's NFTs
    await expect(n.connect(stranger).burnForParagon(otherIds)).to.be.revertedWithCustomError(n, "NotOwner");
  });

  it("burn cap: 10 Paragons via burn, 11th reverts SoldOut", async function () {
    const { n } = await fresh();
    const signers = await ethers.getSigners();
    const wallets = signers.slice(1, 12); // 11 agent wallets
    await agentIdMock.mintBatch(wallets.map((s) => s.address));
    for (let w = 0; w < 10; w++) {
      const m = wallets[w];
      await n.connect(m).mintFree();
      await n.connect(m).mintPaid(4, { value: E("0.0065") });
      const ids = await mintedIds(n, m);
      await n.connect(m).burnForParagon(ids);
      expect(await n.burnParagonMinted()).to.equal(w + 1);
    }
    expect(await n.ownerOf(1600)).to.equal(wallets[9].address); // 10th Paragon = id 1600
    // 11th wallet burns 5 -> cap reached
    const m11 = wallets[10];
    await n.connect(m11).mintFree();
    await n.connect(m11).mintPaid(4, { value: E("0.0065") });
    const ids11 = await mintedIds(n, m11);
    await expect(n.connect(m11).burnForParagon(ids11)).to.be.revertedWithCustomError(n, "SoldOut");
  });

  it("token: pool/treasury split, claim flow, minter gate", async function () {
    expect(await token.totalSupply()).to.equal(E("100000000"));
    expect(await token.balanceOf(await token.getAddress())).to.equal(E("55000000"));
    expect(await token.balanceOf(owner.address)).to.equal(E("45000000"));
    expect(await token.MAX_BONUS_PER_WALLET()).to.equal(E("1200000"));
    await expect(token.accrue(agent.address, E("1000"))).to.be.revertedWithCustomError(token, "NotMinter");
    await expect(token.connect(agent).claim()).to.be.revertedWithCustomError(token, "NothingToClaim");
  });

  it("token: claim pays accrued PTRO after mints", async function () {
    const { t, n } = await fresh();
    await n.connect(agent).mintFree();
    expect(await t.claimable(agent.address)).to.equal(E("10"));
    await t.connect(agent).claim();
    expect(await t.balanceOf(agent.address)).to.equal(E("10"));
    expect(await t.claimable(agent.address)).to.equal(0);
  });

  it("marketplace: list/buy enforces 5% royalty, 0% fee", async function () {
    const { n } = await fresh();
    const Market = await ethers.getContractFactory("PterodaktilMarketplace");
    const m = await Market.deploy(await n.getAddress());
    await n.connect(agent).mintFree();
    const ids = await mintedIds(n, agent);
    const id = ids[0];
    await n.connect(agent).setApprovalForAll(await m.getAddress(), true);
    await m.connect(agent).list(id, E("1"));
    const sellerBefore = await ethers.provider.getBalance(agent.address);
    await m.connect(stranger).buy(id, { value: E("1") });
    expect(await n.ownerOf(id)).to.equal(stranger.address);
    // seller receives 0.95 (5% royalty to owner wallet)
    const sellerAfter = await ethers.provider.getBalance(agent.address);
    expect(sellerAfter - sellerBefore).to.equal(E("0.95"));
  });

  it("marketplace: royalty fallback 5% for a no-royalty NFT", async function () {
    const Mock = await ethers.getContractFactory("MockERC721NoRoyalty");
    const mock = await Mock.deploy();
    const Market = await ethers.getContractFactory("PterodaktilMarketplace");
    const m = await Market.deploy(await mock.getAddress());
    await mock.mint(agent.address, 7);
    await mock.connect(agent).setApprovalForAll(await m.getAddress(), true);
    await m.connect(agent).list(7, E("1"));
    const sellerBefore = await ethers.provider.getBalance(agent.address);
    await m.connect(stranger).buy(7, { value: E("1") });
    const sellerAfter = await ethers.provider.getBalance(agent.address);
    expect(sellerAfter - sellerBefore).to.equal(E("0.95")); // 5% fallback
  });
});
