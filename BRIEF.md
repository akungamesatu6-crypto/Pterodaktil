# PTERODAKTIL (NEW) — BRIEF

New Pterodaktil NFT project — pixel-art pterodactyl collection.
User-supplied artwork 2026-11-13 ~20:30 WIB (3 images, saved in `assets/`).

## Identity (user-confirmed 2026-11-13)
- **Name: Pterodaktil**
- **Token: $PTRO**
- Chain: BNB Chain, BSC BEP-721
- Artwork: pixel-art pterodactyl (user images):
  - `assets/hero-pterodaktil.png` — hero (cute pixel pterodactyl, goggles + bandana)
  - `assets/rarity-grid-16.png` — 4×4 grid of the 16 rarity variants
  - `assets/paragon-royal.png` — royal crowned pterodactyl (Paragon showcase)
  - `assets/variants/01-common.png` … `16-paragon.png` — grid sliced into 16 cells (384×256 each, + `-2x` upscales)
  - NOTE: sliced cells are small (384×256). For final metadata, generate full-res
    individual variants with Tania (hero as style reference) OR use the 2x upscales.
    User's call at build time.

## COLLISION FLAG — old Pterodaktil already exists
- Old PTERODAKTIL: contract `0xCb3b48e7b659FC62fb3BDA8FF992e63B3eB6fc1b`,
  supply 1,600, 16 specimens, random mint, 0.0005 BNB flat, 0 minted,
  page https://www.pterodaktil.fun/ (GitHub Pages), X https://x.com/ptrdktlnft.
- This new project reuses the SAME name + same 1,600 supply + 16 tiers.
  Treat as a REBOOT / new edition. Old contract stays untouched (0 mints,
  nothing lost). New contracts will be deployed fresh. Domain + X can be
  reused — confirm with user whether the old page gets replaced.
- Do NOT touch the old contract/page until he confirms reboot vs separate edition.

## Supply & rarity (PROPOSAL — user to confirm)
- **Supply 1,600 — 16 tiers × 100 each.** Random deck-draw mint (swap-and-pop,
  like old Pterodaktil + Snake/Duckie), NOT sequential.
- Tier order (grid order = rarity order, weakest → strongest):

| # | Tier | IDs | Count | $PTRO / paid mint |
|---|------|-----|-------|-------------------|
| 1 | Common | 1–100 | 100 | 1,000 |
| 2 | Uncommon | 101–200 | 100 | 1,000 |
| 3 | Rare | 201–300 | 100 | 2,000 |
| 4 | Epic | 301–400 | 100 | 2,000 |
| 5 | Legendary | 401–500 | 100 | 4,000 |
| 6 | Mythic | 501–600 | 100 | 4,000 |
| 7 | Divine | 601–700 | 100 | 8,000 |
| 8 | Celestial | 701–800 | 100 | 8,000 |
| 9 | Limited | 801–900 | 100 | 16,000 |
| 10 | Seasonal | 901–1000 | 100 | 16,000 |
| 11 | Event | 1001–1100 | 100 | 32,000 |
| 12 | Exclusive | 1101–1200 | 100 | 32,000 |
| 13 | Genesis | 1201–1300 | 100 | 64,000 |
| 14 | Apex | 1301–1400 | 100 | 64,000 |
| 15 | Ethereal | 1401–1500 | 100 | 128,000 |
| 16 | Paragon | 1501–1600 | 100 | 128,000 |

- Bonus accrues per PAID mint by the rarity drawn; **FREE mint accrues 10 PTRO**
  (user 2026-11-13 ~20:36: "Kasih Free mint 10 token" — literal 10 PTRO;
  if he meant 10,000, the pool must be resized).
- Pool check: 100 × sum(bonuses) = 100 × 510,000 = **51,000,000 PTRO** max mint accruals.

## Token $PTRO (PROPOSAL)
- **Total supply 100,000,000 PTRO. Rewards pool 55,000,000 / treasury 45,000,000.**
  (55M covers 51M paid-mint accruals + max 16,000 free-mint bonuses
  (1,600 × 10 PTRO) + 3.84M burn rewards + headroom.)
- **MAX_BONUS_PER_WALLET 1,200,000** (6 mints max 768,000 + 1 burn 384,000 = 1,152,000).
- Claim from token contract (claim/claimFor pattern, like MochiToken).

## Burn — 5 → 1 top rarity, 3x tokens (user order 2026-11-13)
- **Burn any 5 Pterodaktil NFTs → 1 Paragon (highest rarity) + 384,000 PTRO
  (3 × Paragon bonus 128,000).**
- Paragon via burn capped at **10 total** (Momo-special precedent, cap 9).
  The other 90 Paragons are in the random mint deck. If all 100 Paragons
  are gone, burn reverts.
- Burn is a separate function/contract (decided at build time).
- Pool check: 10 burns × 384,000 = 3,840,000. 51M + 3.84M = 54.84M ≤ 55M pool. ✓

## Pricing — LADDER (user-confirmed 2026-11-13 ~20:28)
- **#1 FREE via Agent ID** (any Agent ID holder, NO allowlist — MYCO lesson)
- **#2 0.0005 / #3 0.001 / #4 0.002 / #5 0.003 / #6 0.005 BNB**
- Max 6/wallet (1 free + 5 paid). Max cost/wallet **0.0115 BNB**.
- ALL mints Agent ID-gated (SPACE ID Agent ID registry
  `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`).
- Mint open time: TBD (user to set; display UTC only).

## Marketplace & royalty (standard — confirm per project)
- Own escrow marketplace, 0% fee. Royalty **5% → BAW** (standing default,
  user never separately confirmed for this project).
- BAW `0x36F3D56eAD5D1D6C2434F94DeFcEF732C5C3CbD2` = owner + royalty + revenue.

## Page — template (user asked 2026-11-13 ~20:31: best, most complete, neat, mobile-first)
- **Base template: Momo Mochi's page structure** (most complete of his pages,
  verified live 2026-11-13): hero, live-status visual, how-it-works, gallery,
  rarity section + table, special/mystery (Paragon showcase), mint panel with
  WORKING wallet flow + agent prompt copy + Agent ID checker + wallet display,
  token section, marketplace section, FAQ, details/contracts, footer/share,
  sticky-header Mint button, floating Mint button.
- Contracts from the **SnakeAgentNFT starter template**
  (`~/workspace/snakeagentnft/TEMPLATE.md` + `template/`), adapted:
  deck-draw random + ladder pricing + per-rarity bonus + burn.
- External template galleries searched 2026-11-13 (VictorFlow Framer, Webflow
  NFT templates): design-only, no wallet mint / Agent ID checker / on-chain
  counters — inspiration only, NOT a base. Do not copy their names/designs.
- Language: EN only (old Pterodaktil was EN only) — confirm.
- Hosting: **Vercel under akungamesatu6 team** (user 2026-11-13 ~20:38: "Fokus ke
  akungamesatu6@gmail.com nanti kita ubah hostinger nya"). GitHub repo under
  akungamesatu6-crypto. Hostinger DNS / pterodaktil.fun change comes LATER —
  do not touch the old domain now; old page stays as-is until he orders it.
- X: https://x.com/ptrdktlnft (existing — shared with old project).

## Still to confirm (before build)
1. Rarity/bonus/supply/burn numbers above — correct?
2. Reboot (replace old page) or separate new edition?
3. Hosting: new Vercel project (name?) or reuse pterodaktil.fun?
4. Mint open time (UTC).
5. Full-res artwork: generate 16 individual variants, or use grid slices?
6. Language: EN only, or add more?
7. Royalty 5% ok?

## BUILD STATUS — 2026-11-13 ~20:40 WIB (built, NOT deployed)
- Contracts in `contracts/`: PtroToken.sol, PterodaktilNft.sol,
  PterodaktilMarketplace.sol (0% fee, 5% royalty fallback), mocks.sol.
  Compiled clean (27 files). **Tests 15/15 PASS** (`test/pterodaktil.test.js`):
  ladder, tiers/bonuses, free 10 PTRO, paid accrual, burn 5→1 Paragon
  + 384,000 PTRO, burn cap 10 (11th reverts SoldOut), token split/claim,
  marketplace 5% royalty + fallback.
- CREATE2 predictions (baseURI https://pterodaktil-pixel.vercel.app/metadata/,
  working Vercel name — re-run simulation if the name changes):
  PTRO `0x2Fe05180f94A4377a7C67f8e7828EdC62D3cbB88`,
  NFT `0x35dfeF79f25660F63471Fae76833b1E7D8Dd9750`,
  Market `0x66581031426181DDc058Acf44e263e804f136806`.
  Gas: token 885,561 / NFT 2,801,326 / market 1,045,775 (≈ Rp 3,900 total at ~0.07 gwei).
- Metadata: 1,600 extensionless files in `push/metadata/` — 100/tier, boundaries
  spot-checked (1/100/101/500/1500/1501/1590/1591/1600).
- Page: `push/index.html` (45,440 bytes, EN only, pixel-art sunset theme) —
  full structure: preview banner, hero, live flight visual, how-it-works,
  16-tier gallery, rarity + table, Paragon burn spotlight, mint panel
  (wallet flow + agent prompt + Agent ID checker + wallet display + burn
  panel), $PTRO claim box, marketplace, FAQ, details/contracts, footer/share,
  sticky + floating Mint. JS passes node --check; all 38 JS ids present;
  no stale numbers (0 Momo/HATCHIE values). Page is in PREVIEW state
  (mint/burn/claim disabled until contracts deploy).
- Assets in `push/assets/`: 16 tier images (768×512, NEAREST 2x upscales of
  the user's grid slices) + hero.png + paragon-royal.png (1254×1254).
- NEXT: user creates GitHub repo under akungamesatu6-crypto (App cannot
  create repos) → push → Vercel project `pterodaktil-pixel` (team
  akungamesatu6-4875s-projects) → preview → DEPLOY only on his explicit
  same-turn confirmation. Old pterodaktil.fun / Hostinger untouched.
