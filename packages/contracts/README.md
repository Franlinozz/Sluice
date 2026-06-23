# @sluice/contracts

Foundry workspace for Sluice's on-chain pieces. **Stubs only in Phase 0.**

Planned (later phases):

- **ERC-8004** — Identity / Reputation / Validation registries (minimal reference impl).
- **RoyaltySplitter** — recursive royalty splits from attribution metadata.
- **Bond / Escrow** — reputation bonds for the broker agent (staked → slashed on failed delivery).

Deploy + verify to Arc testnet (`chainId 5042002`) on https://testnet.arcscan.app.

```bash
forge build
forge test
```
