# DigiWage Light Wallet

A Chrome extension light wallet for DigiWage, adapted for DigiWage's mainnet,
the `forktest` rehearsal network and the legacy testnet (`legacytest`). Talks to the DigiWage explorer's
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

The network switcher (Mainnet / Forktest / Legacy Testnet) is backed by
`src/digiwageNetworks.js`, which defines DigiWage's address version bytes, BIP32
prefixes, and the API and explorer each network talks to (`NETWORK_CONFIGS`).
`public/integration/background/index.js` keeps its own copy of the version bytes
and Insight base URLs for the service worker; keep the two in sync. Update the
IP-based test endpoints before shipping a production build.

| | Mainnet | Forktest | Legacy Testnet |
|---|---|---|---|
| Storage key / dApp name | `DIGIWAGE_MAINNET` / `digiwage_mainnet` | `DIGIWAGE_FORKTEST` / `digiwage_forktest` | `DIGIWAGE_LEGACYTEST` / `digiwage_legacytest` |
| Node chain | `main` | `-chain=forktest` | `-chain=legacytest` |
| Bech32 HRP | `dw` | `qcrt` | `dwt` |
| P2PKH / P2SH / WIF | 30 / 90 / 89 | 120 / 110 / 239 | 139 / 19 / 239 |
| BIP32 pub / prv | `0x022d2533` / `0x0221312b` | `0x043587cf` / `0x04358394` | `0x3a8061a0` / `0x3a805837` |
| Address starts with | `D` | `q` | `x` / `y` |
| Explorer API | api.digiwage.org | :7001 | :7011 |

# Security

User credentials are encrypted with SHA256 encrypted value of initial wallet password, and encrypted credentials are stored in Chrome localstorage that is only retrievable to unlocked wallet instance.
