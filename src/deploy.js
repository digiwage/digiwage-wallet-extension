// Contract deployment helpers for the confirmation popup.
//
// Builds the create-contract transaction (OP_4 <gasLimit> <gasPrice>
// <bytecode> OP_CREATE) and derives the new contract's address the way the
// node does.
//
// The create output always carries value 0. This VM rejects a creation that
// carries value (receipt "excepted": "CreateWithValue") and, worse, consumes
// the whole gas limit doing so -- verified on the forktest chain -- so a
// non-zero value is refused up front instead of being sent.
import { TransactionBuilder, script as BTCScript, crypto as btcCrypto } from 'bitcoinjs-lib';
import { encode as encodeCScriptInt } from 'bitcoinjs-lib/src/script_number';
import BigNumber from 'bignumber.js';
import coinSelect from 'coinselect';
import { Buffer } from 'buffer';

const OP_4 = 0x54;
const OP_CREATE = 0xc1;

// Consensus script limits (script/script.h): a single push may be at most
// 128,000 bytes and a whole script at most 129,000 bytes.
export const MAX_SCRIPT_ELEMENT_SIZE = 128000;

export function cleanHex(hex) {
  const h = String(hex || '').trim().replace(/^0x/i, '');
  if (!/^([0-9a-fA-F]{2})*$/.test(h)) {
    throw new Error('bytecode must be an even-length hex string');
  }
  return h.toLowerCase();
}

// Mirrors createDigiWageAddress() in src/digiwage/digiwagestate.h:
//   RIPEMD160(SHA256(txid in internal byte order || vout as uint32 LE))
// The txid shown by RPC/explorers is the byte-reverse of the internal order.
export function contractAddressFromTx(txid, vout = 0) {
  const txidInternal = Buffer.from(txid, 'hex').reverse();
  const voutLE = Buffer.alloc(4);
  voutLE.writeUInt32LE(vout, 0);
  const preimage = Buffer.concat([txidInternal, voutLE]);
  return btcCrypto.ripemd160(btcCrypto.sha256(preimage)).toString('hex');
}

export function deployFeeBreakdown({ gasLimit, gasPriceSat, feeRate, scriptBytes, inputs = 1 }) {
  const gasFee = new BigNumber(gasLimit).times(gasPriceSat);
  // rough size: inputs (~148 B each) + create output (script + 9) + change (34) + 10
  const size = 10 + inputs * 148 + scriptBytes + 9 + 34;
  const txFee = new BigNumber(size).times(feeRate);
  return { gasFee: gasFee.toNumber(), txFee: txFee.toNumber(), maxTotal: gasFee.plus(txFee).toNumber() };
}

export async function buildDeployTx(wallet, { bytecode, gasLimit, gasPriceSat, amountSat = 0 }) {
  if (Math.round(Number(amountSat || 0)) !== 0) {
    throw new Error('Contracts cannot receive value during deployment on this network (it would burn all gas). Deploy with 0, then send funds afterwards.');
  }
  const code = cleanHex(bytecode);
  if (!code) throw new Error('bytecode is empty');
  if (code.length / 2 > MAX_SCRIPT_ELEMENT_SIZE) {
    throw new Error(`bytecode is ${code.length / 2} bytes; the network accepts at most ${MAX_SCRIPT_ELEMENT_SIZE}`);
  }
  gasLimit = Math.round(Number(gasLimit));
  gasPriceSat = Math.round(Number(gasPriceSat)); // callers pass WAGE*1e8, which can land a hair below an integer
  amountSat = Math.round(Number(amountSat || 0));
  if (!(gasLimit > 0) || !(gasPriceSat > 0)) throw new Error('gas limit and gas price must be positive');

  const utxos = await wallet.getBitcoinjsUTXOs();
  const feeRate = Math.ceil(await wallet.feeRatePerByte());
  const gasFee = new BigNumber(gasLimit).times(gasPriceSat).toNumber();

  const createScript = BTCScript.compile([
    OP_4,
    encodeCScriptInt(gasLimit),
    encodeCScriptInt(gasPriceSat),
    Buffer.from(code, 'hex'),
    OP_CREATE,
  ]);

  const { inputs, fee: txFee } = coinSelect(
    utxos,
    [{ value: gasFee }, { script: createScript, value: amountSat }],
    feeRate,
  );
  if (inputs == null) {
    throw new Error('Not enough spendable balance to cover the gas fee, network fee and value');
  }

  const txb = new TransactionBuilder(wallet.keyPair.getNetwork());
  let total = new BigNumber(0);
  inputs.forEach(input => {
    txb.addInput(input.hash, input.pos);
    total = total.plus(input.value);
  });
  // The create output MUST be first: the contract address is derived from
  // (txid, output index) and callers rely on index 0.
  txb.addOutput(createScript, amountSat);
  const change = total.minus(txFee).minus(gasFee).minus(amountSat).toNumber();
  if (change > 0) {
    txb.addOutput(wallet.keyPair.getAddress(), change);
  }
  inputs.forEach((_, i) => txb.sign(i, wallet.keyPair));

  return { rawTx: txb.build().toHex(), txFee, gasFee };
}

export async function deployContract(wallet, params) {
  const { rawTx } = await buildDeployTx(wallet, params);
  const result = await wallet.sendRawTx(rawTx);
  const txid = result.txid;
  return { txid, contractAddress: contractAddressFromTx(txid, 0) };
}
