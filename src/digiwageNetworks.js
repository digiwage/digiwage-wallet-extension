// DigiWage network definitions for digiwagejs-wallet.
//
// digiwagejs-wallet's Wallet constructor unconditionally calls the *static*
// Insight.forNetwork(network), which looks up a module-private (not
// exported) INSIGHT_BASEURLS table keyed by network.name -- so there is no
// supported way to register a new network name from outside the package.
// Insight.forNetwork is a plain static method on an exported class, though,
// so we patch it once at startup: the library's own built-in network names
// still resolve through the original implementation, and this extension's
// own network names (digiwage_mainnet/testnet) resolve to our explorer's
// Insight-compatible API (see digiwage-explorer-api's /insight-api/*
// routes). This keeps digiwagejs-wallet itself completely unmodified.
import { Insight, Network } from 'digiwagejs-wallet';

export const NetworkNames = {
  DIGIWAGE_MAINNET: 'digiwage_mainnet',
  DIGIWAGE_TESTNET: 'digiwage_testnet',
};

// TODO: replace with the permanent production API domain before release.
const DIGIWAGE_INSIGHT_BASEURLS = {
  [NetworkNames.DIGIWAGE_MAINNET]: 'https://api.digiwage.org/insight-api',
  [NetworkNames.DIGIWAGE_TESTNET]: 'http://194.163.172.250:7021/insight-api',
};

const originalForNetwork = Insight.forNetwork.bind(Insight);
Insight.forNetwork = function digiwageAwareForNetwork(network) {
  const baseURL = DIGIWAGE_INSIGHT_BASEURLS[network.name];
  if (baseURL != null) {
    return new Insight(baseURL);
  }
  return originalForNetwork(network);
};

// Values verified directly against the DigiWage v3 chain params
// (digiwage/digiwage's src/kernel/chainparams.cpp), not guessed:
//  - pubKeyHash/scriptHash/wif/bech32 come from CMainParams' base58Prefixes
//    and bech32_hrp.
//  - bip32.public/private are CMainParams' EXT_PUBLIC_KEY/EXT_SECRET_KEY
//    byte arrays read as big-endian integers.
//  - messagePrefix is "DigiWage Signed Message:\n" -- util/signstr.h's
//    strMessageMagic was renamed along with the rest of the v3 rebrand, so
//    this must track that exact string or signmessage/verifymessage will
//    silently mismatch the chain's real behavior.
const digiwageMainnetInfo = {
  name: NetworkNames.DIGIWAGE_MAINNET,
  messagePrefix: 'DigiWage Signed Message:\n',
  bech32: 'dw',
  bip32: { public: 36513075, private: 35729707 },
  pubKeyHash: 30,
  scriptHash: 90,
  wif: 89,
};

// The v3 testnet (-testnet): its own genesis and CTestNetParams prefixes.
// Addresses start with 't' (P2SH 's'), bech32 'tdw', extended keys tdwp/tdws.
const digiwageTestnetInfo = {
  name: NetworkNames.DIGIWAGE_TESTNET,
  messagePrefix: 'DigiWage Signed Message:\n',
  bech32: 'tdw',
  bip32: { public: 0x043199df, private: 0x043199f4 },
  pubKeyHash: 127,
  scriptHash: 125,
  wif: 247,
};

export const networks = {
  digiwageMainnet: new Network(digiwageMainnetInfo),
  digiwageTestnet: new Network(digiwageTestnetInfo),
};

// Everything the popup needs per network, keyed by the value stored under
// chrome.storage.local 'network'.
// TODO: replace the IP-based test endpoints with permanent domains before release.
export const NETWORK_CONFIGS = {
  DIGIWAGE_MAINNET: {
    label: 'Mainnet',
    network: networks.digiwageMainnet,
    api: 'https://api.digiwage.org',
    explorer: 'https://explorer.digiwage.org',
  },
  DIGIWAGE_TESTNET: {
    label: 'Testnet',
    network: networks.digiwageTestnet,
    // Not running yet: the API answers once the testnet indexer is deployed.
    api: 'http://194.163.172.250:7021',
    explorer: 'http://194.163.172.250:3000',
    explorerQuery: '?network=testnet',
  },
};

export const DEFAULT_NETWORK = 'DIGIWAGE_TESTNET';

export const networkConfig = key => NETWORK_CONFIGS[key] || NETWORK_CONFIGS[DEFAULT_NETWORK];

export const normalizeNetworkKey = key => (NETWORK_CONFIGS[key] ? key : DEFAULT_NETWORK);
