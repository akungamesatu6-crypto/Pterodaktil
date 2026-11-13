// SPDX-License-Identifier: MIT
// Pterodaktil (NEW) — BSC BEP-721, pixel-art pterodactyl NFT. Reboot of the
// 2026-11-04 Pterodaktil (old contract 0xCb3b48e7b659FC62fb3BDA8FF992e63B3eB6fc1b,
// 0 minted — untouched). New economics, new art, new contracts.
// Spec (user-confirmed 2026-11-13, brief ~/workspace/pterodaktil-new/BRIEF.md):
//   Supply 1,600 — 16 tiers x 100 each (pixel-art variants, user-supplied):
//   Common 1-100 / Uncommon 101-200 / Rare 201-300 / Epic 301-400 /
//   Legendary 401-500 / Mythic 501-600 / Divine 601-700 /
//   Celestial 701-800 / Limited 801-900 / Seasonal 901-1000 /
//   Event 1001-1100 / Exclusive 1101-1200 / Genesis 1201-1300 /
//   Apex 1301-1400 / Ethereal 1401-1500 / Paragon 1501-1600.
//   RANDOM token ids (swap-and-pop single deck, NOT VRF). Deck holds ids
//   1-1590 (tiers 1-15 fully + 90 of the 100 Paragons); the last 10
//   Paragon ids (1591-1600) are reserved for the burn and can ONLY be
//   minted via burnForParagon — never via normal mint.
//   PRICE LADDER (user 2026-11-13 "Buatkan anak tangga saja, mulai dari
//   0,0005 - 0,005 sampai max 5 paid 1 free via AGENT ID"):
//   #1 FREE, #2 @ 0.0005, #3 @ 0.001, #4 @ 0.002, #5 @ 0.003,
//   #6 @ 0.005 BNB. Max 6/wallet (1 free + 5 paid), max cost 0.0115 BNB.
//   Per-transaction paid cap 5 (full paid ladder in one tx).
//   GATE: BOTH free AND paid mints need an Agent ID (msg.sender ==
//   tx.origin + SPACE ID Agent ID registry balance > 0). Public wallets
//   CAN connect to the page to browse — they just cannot mint without
//   an Agent ID. NO allowlist (MYCO lesson — allowlist-gated free mint
//   left MYCO at 0 mints).
//   $PTRO BONUS: FREE mint accrues 10 PTRO (user 2026-11-13, confirmed
//   "Iya 10 ptro"); per PAID mint by tier drawn — Common/Uncommon 1,000
//   / Rare/Epic 2,000 / Legendary/Mythic 4,000 / Divine/Celestial 8,000
//   / Limited/Seasonal 16,000 / Event/Exclusive 32,000 / Genesis/Apex
//   64,000 / Ethereal/Paragon 128,000. Max 1,200,000 PTRO per wallet.
//   BURN (user 2026-11-13): burn ANY 5 Pterodaktil NFTs -> 1 Paragon
//   (next reserved id 1591-1600, cap 10 total via burn) + 384,000 PTRO
//   (3x the Paragon bonus). No BNB cost — the 5 burned NFTs are the price.
//   Mint money: forwarded to the owner (project wallet) in the same tx;
//   the contract does not hold mint revenue.
//   Royalty 5% (ERC-2981, standing default — NOT separately confirmed
//   for this project).
//   Owner can ONLY: open/close mint, set base URI, withdraw stuck funds.
//   Prices, supply and limits are immutable after deploy.
//   baseURI: set at deploy (new Vercel project under akungamesatu6 team;
//   Hostinger DNS change comes later — user 2026-11-13).
//   Language: EN only (old Pterodaktil was EN only).
//   Official X: https://x.com/ptrdktlnft (shared with old project).
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentID {
    function balanceOf(address) external view returns (uint256);
}

interface IPtroToken {
    function accrue(address wallet, uint256 amount) external;
}

/// @title Pterodaktil
contract PterodaktilNft is ERC721, ERC2981, Ownable, ReentrancyGuard {
    IAgentID public immutable AGENT_ID;
    IPtroToken public immutable TOKEN;

    uint256 public constant MAX_SUPPLY = 1600; // 16 tiers x 100
    uint256 public constant MAX_PER_WALLET = 6;
    uint256 public constant FREE_PER_WALLET = 1;
    uint256 public constant MAX_PAID_PER_WALLET = 5;
    uint256 public constant MAX_PER_TX = 5;
    uint256 public constant DECK_SIZE = 1590; // ids 1-1590 in the random deck
    uint256 public constant BURN_PARAGON_BASE = 1591; // burn Paragons 1591-1600
    uint256 public constant BURN_CAP = 10;

    // $PTRO bonus per mint.
    uint256 public constant BONUS_FREE = 10 ether;
    uint256 public constant BONUS_BURN = 384_000 ether; // 3x Paragon bonus

    uint256 public totalMinted;
    uint256 public paidMinted;
    uint256 public freeMinted;
    uint256 public burnParagonMinted;
    bool public mintOpen;
    string private _base;

    uint256 private _deckRemaining = DECK_SIZE;
    mapping(uint256 => uint256) private _deckAtIndex; // 0 = identity (id = index + 1)

    mapping(address => uint256) public mintedOf;
    mapping(address => uint256) public freeMintedOf;
    mapping(address => uint256) public paidMintedOf;

    event Minted(address indexed minter, uint256 indexed id, bool paid, uint256 priceWei);
    event Burned(address indexed owner, uint256 indexed paragonId, uint256[5] burnedIds);

    error NotAgent();
    error MintClosed();
    error SoldOut();
    error OverLimit();
    error Underpaid(uint256 required);
    error FreeClaimed();
    error NotOwner();
    error BadSet();

    constructor(
        string memory baseURI_,
        address owner_,
        address agentId_,
        address token_
    ) ERC721("Pterodaktil", "PTRO") Ownable(owner_) {
        _base = baseURI_;
        AGENT_ID = IAgentID(agentId_);
        TOKEN = IPtroToken(token_);
        mintOpen = false; // mint starts CLOSED until owner opens it
        _setDefaultRoyalty(owner_, 500); // 5%
    }

    modifier onlyAgent() {
        if (msg.sender != tx.origin || AGENT_ID.balanceOf(msg.sender) == 0) revert NotAgent();
        if (!mintOpen) revert MintClosed();
        _;
    }

    /// @notice BNB cost of mint number `n` (1 = free, 2-6 = paid ladder).
    function priceFor(uint256 n) public pure returns (uint256) {
        if (n <= 1) return 0;
        if (n == 2) return 0.0005 ether;
        if (n == 3) return 0.001 ether;
        if (n == 4) return 0.002 ether;
        if (n == 5) return 0.003 ether;
        return 0.005 ether;
    }

    /// @notice BNB cost of paid-mint number `n` (1-5). Paid #1 @ 0.0005,
    /// #2 @ 0.001, #3 @ 0.002, #4 @ 0.003, #5 @ 0.005. Priced by PAID
    /// count (not total mints) so a wallet pays the right ladder step
    /// whether it claims the free mint first or mints paid first.
    function priceForPaid(uint256 n) public pure returns (uint256) {
        if (n == 1) return 0.0005 ether;
        if (n == 2) return 0.001 ether;
        if (n == 3) return 0.002 ether;
        if (n == 4) return 0.003 ether;
        return 0.005 ether;
    }

    /// @notice BNB cost for `qty` further PAID mints by `wallet`.
    function quotePaidFor(address wallet, uint256 qty) public view returns (uint256) {
        if (qty == 0 || qty > MAX_PER_TX) revert OverLimit();
        if (paidMintedOf[wallet] + qty > MAX_PAID_PER_WALLET) revert OverLimit();
        if (mintedOf[wallet] + qty > MAX_PER_WALLET) revert OverLimit();
        if (_deckRemaining < qty) revert SoldOut();
        uint256 start = paidMintedOf[wallet] + 1; // next PAID mint number
        uint256 total;
        for (uint256 i; i < qty; i++) total += priceForPaid(start + i);
        return total;
    }

    /// @notice $PTRO bonus for a token id, by tier drawn.
    function bonusForId(uint256 id) public pure returns (uint256) {
        if (id <= 200) return 1_000 ether; // Common / Uncommon
        if (id <= 400) return 2_000 ether; // Rare / Epic
        if (id <= 600) return 4_000 ether; // Legendary / Mythic
        if (id <= 800) return 8_000 ether; // Divine / Celestial
        if (id <= 1000) return 16_000 ether; // Limited / Seasonal
        if (id <= 1200) return 32_000 ether; // Event / Exclusive
        if (id <= 1400) return 64_000 ether; // Genesis / Apex
        return 128_000 ether; // Ethereal / Paragon
    }

    /// @notice Tier name for a token id (for the page/metadata).
    function tierNameOf(uint256 id) public pure returns (string memory) {
        if (id <= 100) return "Common";
        if (id <= 200) return "Uncommon";
        if (id <= 300) return "Rare";
        if (id <= 400) return "Epic";
        if (id <= 500) return "Legendary";
        if (id <= 600) return "Mythic";
        if (id <= 700) return "Divine";
        if (id <= 800) return "Celestial";
        if (id <= 900) return "Limited";
        if (id <= 1000) return "Seasonal";
        if (id <= 1100) return "Event";
        if (id <= 1200) return "Exclusive";
        if (id <= 1300) return "Genesis";
        if (id <= 1400) return "Apex";
        if (id <= 1500) return "Ethereal";
        return "Paragon";
    }

    /// @notice Rarity for a token id (same as tier name — 16 distinct tiers).
    function rarityOf(uint256 id) public pure returns (string memory) {
        return tierNameOf(id);
    }

    function totalSupply() external view returns (uint256) {
        return totalMinted;
    }

    function exists(uint256 id) external view returns (bool) {
        return _ownerOf(id) != address(0);
    }

    function deckRemaining() external view returns (uint256) {
        return _deckRemaining;
    }

    /// @notice Draw one token id from the deck (swap-and-pop).
    function _draw(uint256 seed) internal returns (uint256) {
        uint256 index = seed % _deckRemaining;
        uint256 tokenId = _deckAtIndex[index] == 0 ? index + 1 : _deckAtIndex[index];
        uint256 lastIndex = _deckRemaining - 1;
        uint256 lastTokenId = _deckAtIndex[lastIndex] == 0 ? lastIndex + 1 : _deckAtIndex[lastIndex];
        _deckAtIndex[index] = lastTokenId;
        _deckRemaining -= 1;
        return tokenId;
    }

    /// @notice FREE lane: the wallet's one free pterodactyl. Agent ID ONLY.
    /// No payment, accrues 10 PTRO. Draws from the same deck as paid.
    function mintFree() external nonReentrant onlyAgent {
        if (freeMintedOf[msg.sender] >= FREE_PER_WALLET) revert FreeClaimed();
        if (totalMinted + 1 > MAX_SUPPLY) revert SoldOut();
        if (_deckRemaining == 0) revert SoldOut();
        uint256 seed = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp, msg.sender, totalMinted, uint256(0)))
        );
        uint256 id = _draw(seed);
        totalMinted++;
        freeMinted++;
        freeMintedOf[msg.sender]++;
        mintedOf[msg.sender]++;
        _safeMint(msg.sender, id);
        TOKEN.accrue(msg.sender, BONUS_FREE);
        emit Minted(msg.sender, id, false, 0);
    }

    /// @notice PAID lane: mint `qty` pterodactyls. Agent ID ONLY (public
    /// wallets can connect to the page to browse, but cannot mint without
    /// an Agent ID). Price follows the ladder by paid-mint number:
    /// #1 @ 0.0005, #2 @ 0.001, #3 @ 0.002, #4 @ 0.003, #5 @ 0.005 BNB.
    /// Each paid mint accrues $PTRO by the tier actually drawn.
    function mintPaid(uint256 qty) external payable nonReentrant onlyAgent {
        if (qty == 0 || qty > MAX_PER_TX) revert OverLimit();
        if (paidMintedOf[msg.sender] + qty > MAX_PAID_PER_WALLET) revert OverLimit();
        if (mintedOf[msg.sender] + qty > MAX_PER_WALLET) revert OverLimit();
        if (totalMinted + qty > MAX_SUPPLY) revert SoldOut();
        if (_deckRemaining < qty) revert SoldOut();
        uint256 cost = quotePaidFor(msg.sender, qty);
        if (msg.value < cost) revert Underpaid(cost);

        uint256 totalBonus;
        uint256 start = paidMintedOf[msg.sender] + 1; // next PAID mint number
        for (uint256 i; i < qty; i++) {
            uint256 seed = uint256(
                keccak256(abi.encodePacked(blockhash(block.number - 1), block.timestamp, msg.sender, totalMinted, i))
            );
            uint256 id = _draw(seed);
            totalMinted++;
            paidMinted++;
            totalBonus += bonusForId(id);
            _safeMint(msg.sender, id);
            emit Minted(msg.sender, id, true, priceForPaid(start + i));
        }
        paidMintedOf[msg.sender] += qty;
        mintedOf[msg.sender] += qty;

        TOKEN.accrue(msg.sender, totalBonus);

        // Mint money goes straight to the project wallet.
        if (cost > 0) {
            (bool ok, ) = owner().call{value: cost}("");
            require(ok, "forward");
        }
        if (msg.value > cost) {
            (bool ok, ) = msg.sender.call{value: msg.value - cost}("");
            require(ok, "refund");
        }
    }

    /// @notice BURN: burn ANY 5 Pterodaktil NFTs to mint 1 Paragon
    /// (next reserved id 1591-1600, cap 10 total via burn) + 384,000 PTRO
    /// (3x the Paragon bonus). No BNB cost — the 5 burned NFTs are the
    /// price. Caller must own all 5 (distinct ids, any tiers).
    function burnForParagon(uint256[5] calldata ids) external nonReentrant whenOpen {
        if (burnParagonMinted >= BURN_CAP) revert SoldOut();
        if (totalMinted + 1 > MAX_SUPPLY) revert SoldOut();
        for (uint256 i; i < 5; i++) {
            uint256 id = ids[i];
            if (id < 1 || id > MAX_SUPPLY) revert BadSet();
            if (ownerOf(id) != msg.sender) revert NotOwner();
            for (uint256 j; j < i; j++) {
                if (ids[j] == id) revert BadSet(); // duplicates
            }
        }
        for (uint256 i; i < 5; i++) _burn(ids[i]);
        uint256 paragonId = BURN_PARAGON_BASE + burnParagonMinted;
        burnParagonMinted++;
        totalMinted++;
        mintedOf[msg.sender]++; // the Paragon counts toward the wallet total
        _safeMint(msg.sender, paragonId);
        TOKEN.accrue(msg.sender, BONUS_BURN);
        emit Burned(msg.sender, paragonId, ids);
    }

    modifier whenOpen() {
        if (!mintOpen) revert MintClosed();
        _;
    }

    /// @notice tokenURI returns the metadata file immediately, from mint time.
    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat(_base, Strings.toString(id));
    }

    // ── owner: only these switches exist ──
    function setMintOpen(bool v) external onlyOwner {
        mintOpen = v;
    }

    function setBaseURI(string calldata b) external onlyOwner {
        _base = b;
    }

    function withdraw() external onlyOwner nonReentrant {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "withdraw");
    }

    function supportsInterface(bytes4 i) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(i);
    }
}
