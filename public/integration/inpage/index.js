// DigiWage Light Wallet dApp SDK, injected into every page by the content
// script. Talks to the extension's background service worker through
// window.postMessage, relayed by contentScript/index.js -- this file never
// touches chrome.* APIs directly (inpage scripts run in the page's own
// context, not the extension's).
(function () {
  let serialNumberCounter = 0;
  const pending = {};

  function nextSerialNumber() {
    serialNumberCounter += 1;
    return `${Date.now()}-${serialNumberCounter}`;
  }

  function send(method, data) {
    return new Promise((resolve, reject) => {
      const serialNumber = nextSerialNumber();
      pending[serialNumber] = { resolve, reject };
      window.postMessage({
        route: { wallet: 'digiwage', source: 'SDK', target: 'contentscript' },
        data: { method, serialNumber, data }
      }, '*');
    });
  }

  window.addEventListener('message', event => {
    const { data } = event;
    if (!data || !data.route || data.route.wallet !== 'digiwage'
      || data.route.source !== 'contentscript' || data.route.target !== 'SDK') {
      return;
    }

    const message = data.data || {};

    // Wallet-initiated notification (no request pending): accountsChanged /
    // networkChanged. Delivered to every registered listener.
    if (message.event) {
      (listeners[message.event] || []).slice().forEach(cb => {
        try { cb(message.payload); } catch (err) { console.error(err); }
      });
      return;
    }

    const { serialNumber } = message;
    const waiting = pending[serialNumber];
    if (!waiting) {
      return;
    }
    delete pending[serialNumber];

    const result = message.data;
    if (result && result.error) {
      waiting.reject(new Error(result.error));
    } else {
      waiting.resolve(result);
    }
  });

  const listeners = { accountsChanged: [], networkChanged: [] };

  const stripHex = value => String(value || '').replace(/^0x/i, '');

  window.digiwageLight = {
    // Identifies this provider so dApps can feature-detect it.
    isDigiWageLight: true,
    version: 2,

    // Resolves to 'digiwage_mainnet' or 'digiwage_forktest', the network the
    // wallet is currently switched to.
    getNetwork: () => send('getNetwork', {}),

    // Subscribe to wallet events. Supported: 'accountsChanged' (payload: new
    // address or null when the wallet locks) and 'networkChanged' (payload:
    // the new network name). Returns an unsubscribe function.
    on: (event, callback) => {
      if (!listeners[event]) {
        throw new Error(`Unknown event "${event}"`);
      }
      listeners[event].push(callback);
      return () => window.digiwageLight.off(event, callback);
    },
    off: (event, callback) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      }
    },

    // Deploys a contract. Opens the wallet's confirmation popup.
    //   bytecode: creation bytecode (hex, 0x optional)
    //   encodedConstructorArgs: ABI-encoded constructor arguments (hex),
    //     appended to the bytecode
    //   name: display-only contract name shown in the popup
    //   (a creation cannot carry value on this network: deploy first, then
    //   send funds with sendToContract)
    //   gasLimit: gas units
    //   gasPrice: whole WAGE per gas unit (same units as sendToContract)
    // Resolves to { txid, contractAddress } (contractAddress is the 20-byte
    // hex address, valid once the transaction confirms) or rejects if the
    // user cancels or the broadcast fails.
    deployContract: ({ bytecode, encodedConstructorArgs = '', name = 'Contract', amount = 0, gasLimit = 2500000, gasPrice = 0.0000004 }) =>
      Number(amount) !== 0
        ? Promise.reject(new Error('A contract cannot receive value while it is being deployed on this network; deploy it, then send funds with sendToContract'))
        : send('deployContract', {
        name,
        bytecode: stripHex(bytecode) + stripHex(encodedConstructorArgs),
        amount: 0,
        txData: { gasLimit, gasPrice }
        }).then(result => ({
        txid: result.tx && result.tx.txid,
        contractAddress: result.contractAddress
      })),

    // Resolves to the unlocked wallet's current address, or null if the
    // wallet is locked/has no account yet.
    getCurrentAddress: () => send('getCurrentAddress', {}),

    // Read-only contract call (no transaction, no signing, no popup).
    // contractAddress is the 20-byte hex contract address; encodedData is
    // the ABI-encoded call (hex, no 0x prefix). Resolves to the raw
    // callcontract RPC result -- read executionResult.output yourself.
    callContract: (contractAddress, encodedData) =>
      send('callContract', { address: contractAddress, encodedData }),

    // Opens the wallet's confirmation popup for a state-changing contract
    // call. Returns a promise that resolves once the user confirms (with
    // the broadcast tx) or rejects if they cancel / it fails.
    //   contractAddress: 20-byte hex contract address
    //   methodLabel: display-only string shown in the confirmation popup
    //   encodedData: ABI-encoded call (hex, no 0x prefix)
    //   amount: satoshis to send with the call (0 for a plain method call)
    //   gasLimit: gas units
    //   gasPrice: gas price in whole WAGE per gas unit (e.g. 0.0000004 for
    //     the network minimum of 40 satoshi/gas) -- matches the units the
    //     wallet's own Send screen uses internally, not satoshis directly.
    sendToContract: ({ contractAddress, methodLabel, encodedData, amount = 0, gasLimit = 250000, gasPrice = 0.0000004 }) =>
      send('sendToContract', {
        address: contractAddress,
        method: methodLabel,
        encodedData,
        amount,
        txData: { gasLimit, gasPrice }
      })
  };
})();
