import abiCoder from 'ethereumjs-abi';
import bs58 from 'bs58';
import abi from './FreelanceHub.abi.json';

// Deployed on the DigiWage forktest chain -- see ../contracts/deployment.json
export const CONTRACT_ADDRESS = '74068ff826fc060dfeea3a3b9e6870c8e7470732';

function findFn(name) {
  const fn = abi.find(entry => entry.type === 'function' && entry.name === name);
  if (!fn) {
    throw new Error(`No ABI entry for function "${name}"`);
  }
  return fn;
}

function typesOf(fn, key) {
  return fn[key].map(param => param.type);
}

export function encodeCall(name, values) {
  const fn = findFn(name);
  const types = typesOf(fn, 'inputs');
  const id = abiCoder.methodID(name, types).toString('hex');
  const params = values.length ? abiCoder.rawEncode(types, values).toString('hex') : '';
  return id + params;
}

// ethereumjs-abi decodes uintN/intN (including enums, which Solidity's ABI
// represents as uint8) as BN.js instances and address as a plain hex string
// -- normalized here so call sites don't need to know the decoder's
// quirks. Fine to collapse BN -> Number for this demo's realistic amounts;
// a contract expecting genuinely huge uint256 values would need to keep BN.
function normalize(type, value) {
  if (/^u?int\d*$/.test(type)) {
    return Number(value.toString());
  }
  return value;
}

export function decodeResult(name, outputHex) {
  const fn = findFn(name);
  const types = typesOf(fn, 'outputs');
  const buf = Buffer.from(outputHex, 'hex');
  const decoded = abiCoder.rawDecode(types, buf);
  const named = {};
  fn.outputs.forEach((output, i) => {
    if (output.name) {
      named[output.name] = normalize(types[i], decoded[i]);
    }
  });
  // Solidity's auto-generated public-variable getters (jobCount,
  // serviceCount, orderCount) produce a single unnamed output -- expose it
  // as .value so call sites don't have to guess a name that doesn't exist.
  if (fn.outputs.length === 1) {
    named.value = normalize(types[0], decoded[0]);
  }
  named.__raw = decoded;
  return named;
}

// DigiWage base58 address (q...) -> 20-byte hex hash160, the form the
// EVM and this contract's `address` type expect. Skips the base58check
// checksum verification (fine for a demo tool operating on your own
// address, not a security boundary) but does sanity-check the decoded
// length so an obviously-wrong paste fails loudly instead of silently
// encoding garbage.
export function addressToHex(address) {
  const decoded = bs58.decode(address.trim());
  if (decoded.length !== 25) {
    throw new Error(`"${address}" doesn't decode to a 25-byte address payload`);
  }
  return Buffer.from(decoded.slice(1, 21)).toString('hex');
}

export const ZERO_ADDRESS = '0000000000000000000000000000000000000000';
