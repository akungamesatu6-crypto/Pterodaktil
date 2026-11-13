// SPDX-License-Identifier: MIT
// PTRO — BEP-20 bonus token for Pterodaktil (new) paid mints.
// Economics (user-confirmed 2026-11-13 — ladder + burn, brief
// ~/workspace/pterodaktil-new/BRIEF.md):
//   Total supply 100,000,000 PTRO (18 decimals), fixed at deploy —
//   NO further minting ever. Bonus pool 55,000,000 PTRO is held by this
//   token contract itself; the remaining 45,000,000 PTRO is minted to the
//   owner at deploy (treasury — owner-controlled, not part of the bonus
//   pool). Bonus accrues per mint BY THE TIER ACTUALLY DRAWN, recorded
//   by the NFT contract via accrue() (only the NFT contract — set by
//   the owner with setMinter() after the NFT deploys — can accrue):
//   FREE mint 10 PTRO (user 2026-11-13: "Kasih Free mint 10 token");
//   paid mint by tier: Common/Uncommon 1,000 / Rare/Epic 2,000 /
//   Legendary/Mythic 4,000 / Divine/Celestial 8,000 /
//   Limited/Seasonal 16,000 / Event/Exclusive 32,000 /
//   Genesis/Apex 64,000 / Ethereal/Paragon 128,000.
//   Burn 5 NFTs for a Paragon accrues 384,000 PTRO (3x Paragon bonus).
//   Max 1,200,000 PTRO per wallet (covers realistic max 5 paid draws
//   5x128,000 + 10 free + 384,000 burn = 1,024,010);
//   accrue() enforces both the per-wallet cap and the pool cap
//   (total accrued can never exceed 55,000,000).
//   Worst case the whole deck (1,590 mints) pays out at most
//   51,000,000 PTRO, plus 10 burns x 384,000 = 3,840,000, plus
//   1,600 free mints x 10 = 16,000 — total 54,856,000 PTRO <
//   55,000,000 pool.
//   Claims are retroactive: claim() pays the caller's claimable balance;
//   claimFor(address) pays a beneficiary's claimable balance and can be
//   called by any wallet (e.g. an agent claiming for its user).
//   claimable(address) shows what is waiting. No staking, no tax, no
//   pausing, no blacklist — plain ERC-20 + accrual ledger.
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PTRO
contract PtroToken is ERC20, Ownable {
    uint256 public constant BONUS_POOL = 55_000_000 ether; // held by this contract
    uint256 public constant MAX_BONUS_PER_WALLET = 1_200_000 ether; // realistic max 1,024,010

    address public minter; // the Pterodaktil NFT contract; set by owner after NFT deploy
    uint256 public totalAccrued; // sum of all accrue() amounts; never exceeds BONUS_POOL

    mapping(address => uint256) public accrued; // lifetime bonus earned
    mapping(address => uint256) public claimed; // lifetime bonus claimed

    event Accrued(address indexed wallet, uint256 amount, uint256 totalAccruedForWallet);
    event Claimed(address indexed wallet, uint256 amount);
    event MinterSet(address indexed minter);

    error NotMinter();
    error NothingToClaim();
    error OverPoolCap();
    error OverWalletCap();

    constructor(address owner_) ERC20("PTRO", "PTRO") Ownable(owner_) {
        // Pool stays in this contract for claims; remainder goes to the owner.
        _mint(address(this), BONUS_POOL);
        _mint(owner_, 45_000_000 ether);
    }

    /// @notice Claimable PTRO for a wallet (accrued minus already claimed).
    function claimable(address wallet) public view returns (uint256) {
        return accrued[wallet] - claimed[wallet];
    }

    /// @notice Record a bonus for a wallet. Only the NFT contract can call this.
    function accrue(address wallet, uint256 amount) external {
        if (msg.sender != minter) revert NotMinter();
        if (totalAccrued + amount > BONUS_POOL) revert OverPoolCap();
        if (accrued[wallet] + amount > MAX_BONUS_PER_WALLET) revert OverWalletCap();
        accrued[wallet] += amount;
        totalAccrued += amount;
        emit Accrued(wallet, amount, accrued[wallet]);
    }

    /// @notice Claim your own waiting PTRO.
    function claim() external {
        _claim(msg.sender);
    }

    /// @notice Claim a beneficiary's waiting PTRO to that beneficiary. Callable by anyone.
    function claimFor(address beneficiary) external {
        _claim(beneficiary);
    }

    function _claim(address wallet) internal {
        uint256 amount = claimable(wallet);
        if (amount == 0) revert NothingToClaim();
        claimed[wallet] += amount;
        _transfer(address(this), wallet, amount);
        emit Claimed(wallet, amount);
    }

    /// @notice Point accrual at the Pterodaktil NFT contract (called once, by owner, after NFT deploy).
    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
        emit MinterSet(minter_);
    }
}
