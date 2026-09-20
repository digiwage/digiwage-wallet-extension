# DigiWage Light Wallet

A Chrome extension light wallet for DigiWage, adapted for DigiWage's mainnet
and `forktest` rehearsal network. Talks to the DigiWage explorer's
Insight-API-compatible endpoints (see `digiwage-explorer-api`'s
`/insight-api/*` routes) rather than running its own node.

# Install from local build

Clone the repo

```git clone https://github.com/digiwage/digiwage-wallet-extension```

Add dependencies

```yarn```

Build the source to generate `/build` folder

```yarn build```

Install

Go to Chrome Extension, turn on developer mode, click `Load Unpacked`, select the `build` folder.

# Networks

The network switcher (Mainnet / Forktest) is backed by `src/digiwageNetworks.js`,
which defines DigiWage's address version bytes, BIP32 prefixes, and the
Insight-API base URL each network talks to. Update the `DIGIWAGE_INSIGHT_BASEURLS`
placeholders there before shipping a production build.

# Security

User credentials are encrypted with SHA256 encrypted value of initial wallet password, and encrypted credentials are stored in Chrome localstorage that is only retrievable to unlocked wallet instance.
