// MV3 service worker. Unlike the old persistent background page, this has no
// `window`/`document` and can be unloaded by Chrome between messages, so it
// must not rely on a DOM or on in-memory module state surviving between
// calls. Ephemeral unlock state (passwordHash / activeAccount /
// activePrivateKey) is kept in chrome.storage.session instead -- it's
// memory-only (never written to disk) and survives service worker restarts
// within the same browser session, same lifetime the old background page had.
importScripts('./lib/digiwage-wallet.js');

const { Network, Insight } = DigiWageWallet;

// This vendored browser bundle is built from this project's own
// digiwagejs-wallet package (see /package.json), independently from the
// popup UI's separate digiwagejs-wallet copy imported via npm in
// src/digiwageNetworks.js -- service workers can't share module state with
// the popup, so the background script needs its own copy. Both construct
// their own Network objects here rather than relying on the library's
// built-in NetworkNames, since this extension's network-name convention
// (digiwage_mainnet/digiwage_forktest) differs from the library's own
// (digiwage/digiwage_regtest).
const DIGIWAGE_NETWORK_NAMES = {
    MAINNET: 'digiwage_mainnet',
    FORKTEST: 'digiwage_forktest',
};
// TODO: replace with the permanent production explorer domain before release.
const DIGIWAGE_INSIGHT_BASEURLS = {
    [DIGIWAGE_NETWORK_NAMES.MAINNET]: 'https://api.digiwage.org/insight-api',
    [DIGIWAGE_NETWORK_NAMES.FORKTEST]: 'http://194.163.172.250:7001/insight-api',
};
// The vendored Insight class talks over axios, whose default browser
// adapter needs XMLHttpRequest -- which doesn't exist in a service worker
// (no DOM at all, XHR is a Window-only API, unlike this old axios version's
// only other adapter which is Node-only). Replacing .axios with a minimal
// fetch-based client covering the exact handful of methods Insight actually
// calls (get/post, matching axios's {data: ...} response shape) so the rest
// of the library is untouched.
function fetchHttpClient(baseURL) {
    const resolve = path => baseURL.replace(/\/$/, '') + path;
    return {
        async get(path, config) {
            let url = resolve(path);
            const params = config && config.params;
            if (params) {
                const qs = new URLSearchParams(params).toString();
                if (qs) {
                    url += (url.includes('?') ? '&' : '?') + qs;
                }
            }
            const response = await fetch(url);
            return { data: await response.json() };
        },
        async post(path, body) {
            const response = await fetch(resolve(path), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return { data: await response.json() };
        }
    };
}

const originalForNetwork = Insight.forNetwork.bind(Insight);
Insight.forNetwork = function digiwageAwareForNetwork(network) {
    const baseURL = DIGIWAGE_INSIGHT_BASEURLS[network.name];
    if (baseURL != null) {
        const insight = new Insight(baseURL);
        insight.axios = fetchHttpClient(baseURL);
        return insight;
    }
    return originalForNetwork(network);
};

// Values verified directly against the DigiWage v3 chain params, same
// as src/digiwageNetworks.js -- kept in sync with that file.
const networks = {
    digiwageMainnet: new Network({
        name: DIGIWAGE_NETWORK_NAMES.MAINNET,
        messagePrefix: 'DigiWage Signed Message:\n',
        bech32: 'dw',
        bip32: { public: 36513075, private: 35729707 },
        pubKeyHash: 30,
        scriptHash: 90,
        wif: 89,
    }),
    digiwageForktest: new Network({
        name: DIGIWAGE_NETWORK_NAMES.FORKTEST,
        messagePrefix: 'DigiWage Signed Message:\n',
        bech32: 'qcrt',
        bip32: { public: 70617039, private: 70615956 },
        pubKeyHash: 120,
        scriptHash: 110,
        wif: 239,
    }),
};

const getSessionState = keys => new Promise(resolve => {
    chrome.storage.session.get(keys, resolve);
});

const setSessionState = data => new Promise(resolve => {
    chrome.storage.session.set(data, resolve);
});

// A chrome.runtime.Port can't survive this -- the confirmation popup can sit
// open for as long as the user takes to review it, easily past MV3's ~30s
// service-worker idle timeout, which kills the worker and invalidates any
// open port along with whatever in-memory object it lived in. The tab id is
// a plain number, so it survives a restart via chrome.storage.session, and
// chrome.tabs.sendMessage doesn't need a live connection to begin with.
const pendingTxKey = serialNumber => `pendingTx_${serialNumber}`;
const pendingRequestKey = serialNumber => `pendingRequest_${serialNumber}`;

const getCurrentAddress = async () => {
    const { activeAccount, activePrivateKey } = await getSessionState(['activeAccount', 'activePrivateKey']);
    if (activeAccount && activeAccount.address) {
        return activeAccount.address;
    }
    // Unlocked but the account record is missing/incomplete: the key held in
    // session storage still identifies the account.
    if (activePrivateKey) {
        try {
            const network = await getActiveNetwork();
            const wallet = await network.fromWIF(activePrivateKey);
            return wallet.address || null;
        } catch (error) {
            return null;
        }
    }
    return null;
};

// Mirrors App.js's getNetwork(): reads the same 'network' key the popup
// writes to chrome.storage.local, defaulting to forktest when unset.
const getActiveNetwork = () => new Promise(resolve => {
    chrome.storage.local.get(['network'], ({network}) => {
        resolve(network === 'DIGIWAGE_MAINNET' ? networks.digiwageMainnet : networks.digiwageForktest);
    });
});

const getNetworkName = () => new Promise(resolve => {
    chrome.storage.local.get(['network'], ({network}) => {
        resolve(network === 'DIGIWAGE_MAINNET' ? DIGIWAGE_NETWORK_NAMES.MAINNET : DIGIWAGE_NETWORK_NAMES.FORKTEST);
    });
});

const callContract = async (contractAddress, encodedData) => {
    try {
        const { activePrivateKey } = await getSessionState(['activePrivateKey']);
        if (!activePrivateKey) {
            return { error: 'Please unlock DigiWage Light wallet!' };
        }
        const network = await getActiveNetwork();
        const wallet = network.fromWIF(activePrivateKey);
        const result = await wallet.contractCall(contractAddress, encodedData, {
            amount: 0
        });
        return result;
    } catch (error) {
        return { error: error.message };
    }
};

// Messages from contentscript
chrome.runtime.onConnect.addListener(port => {
    console.assert(port.name === 'digiwage-light-port');
    port.onMessage.addListener(async (message) => {
        const {route, data} = message;
        if (route.wallet !== 'digiwage' || route.source !== 'contentscript') {
            return;
        }

        if (data.method === 'getCurrentAddress') {
            const address = await getCurrentAddress();
            port.postMessage({
                route: { wallet: 'digiwage', source: 'background', target: 'contentscript' },
                data: {
                    serialNumber: data.serialNumber,
                    data: address
                }
            });
        } else if (data.method === 'callContract') {
            const resultData = await callContract(data.data.address, data.data.encodedData);
            port.postMessage({
                route: { wallet: 'digiwage', source: 'background', target: 'contentscript' },
                data: {
                    serialNumber: data.serialNumber,
                    data: resultData
                }
            });
        } else if (data.method === 'getNetwork') {
            const name = await getNetworkName();
            port.postMessage({
                route: { wallet: 'digiwage', source: 'background', target: 'contentscript' },
                data: { serialNumber: data.serialNumber, data: name }
            });
        } else if (data.method === 'deployContract') {
            // The payload can be tens of KB of bytecode, too large to carry
            // in a popup URL, so it is parked in session storage and the
            // popup fetches it by serial number.
            const updates = { [pendingRequestKey(data.serialNumber)]: data.data };
            if (port.sender && port.sender.tab) {
                updates[pendingTxKey(data.serialNumber)] = port.sender.tab.id;
            }
            await setSessionState(updates);
            const dataString = JSON.stringify({
                method: 'deployContract',
                serialNumber: data.serialNumber,
                data: { pending: true }
            });
            const url = `index.html?data=${encodeURIComponent(dataString)}`;
            chrome.windows.create({url, type: 'popup', height: 750, width: 480});
        } else if (data.method === 'sendToContract') {
            if (port.sender && port.sender.tab) {
                await setSessionState({ [pendingTxKey(data.serialNumber)]: port.sender.tab.id });
            }
            const dataString = JSON.stringify(data);
            const url = `index.html?data=${dataString}`;
            chrome.windows.create({url, type: 'popup', height: 750, width: 480});
        }
    });
});

// Messages from the popup (replaces the old direct window.sendTransaction /
// window.cancelTransaction calls into the background page, which have no
// equivalent against a service worker).
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== 'digiwage-background') {
        return false;
    }
    if (message.method === 'getPendingRequest') {
        const key = pendingRequestKey(message.serialNumber);
        getSessionState([key]).then(state => sendResponse({ request: state[key] || null }));
        return true;
    }
    if (message.method === 'sendTransaction' || message.method === 'cancelTransaction') {
        const { serialNumber, data } = message.data;
        (async () => {
            const key = pendingTxKey(serialNumber);
            const state = await getSessionState([key]);
            const tabId = state[key];
            if (tabId != null) {
                try {
                    await chrome.tabs.sendMessage(tabId, {
                        route: { wallet: 'digiwage', source: 'background', target: 'contentscript' },
                        data: { serialNumber, data }
                    });
                } catch (err) {
                    // Tab closed before the popup was answered -- nothing to deliver to.
                }
                chrome.storage.session.remove(key);
            }
            chrome.storage.session.remove(pendingRequestKey(serialNumber));
            sendResponse({ ok: true });
        })();
        return true; // keep the message channel open for the async sendResponse
    }
    return false;
});

// Tell every open page when the active account or network changes, so dApps
// can react without polling. chrome.storage.onChanged also wakes the service
// worker if Chrome had suspended it.
const broadcastEvent = async (event, payload) => {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            route: { wallet: 'digiwage', source: 'background', target: 'contentscript' },
            data: { event, payload }
        }).catch(() => {}); // tab without our content script (e.g. chrome:// pages)
    });
};

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.activeAccount) {
        const account = changes.activeAccount.newValue;
        broadcastEvent('accountsChanged', account ? account.address : null);
    }
    if (area === 'local' && changes.network) {
        broadcastEvent('networkChanged', changes.network.newValue === 'DIGIWAGE_MAINNET'
            ? DIGIWAGE_NETWORK_NAMES.MAINNET : DIGIWAGE_NETWORK_NAMES.FORKTEST);
    }
});

// Side panel (Chrome 114+). The panel loads the same wallet UI with a
// ?view=sidepanel flag so it renders full height; the "panelMode" setting
// decides whether clicking the toolbar icon opens the panel or the popup.
if (chrome.sidePanel) {
    const applyPanelMode = mode => {
        chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: mode === 'sidepanel' }).catch(() => {});
    };
    chrome.sidePanel.setOptions({ path: 'index.html?view=sidepanel', enabled: true }).catch(() => {});
    chrome.storage.local.get(['panelMode'], ({panelMode}) => applyPanelMode(panelMode));
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.panelMode) {
            applyPanelMode(changes.panelMode.newValue);
        }
    });
}
