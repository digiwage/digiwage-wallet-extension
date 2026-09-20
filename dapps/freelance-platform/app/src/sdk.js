import { CONTRACT_ADDRESS, encodeCall, decodeResult } from './contract.js';

export const SATOSHI = 100000000;

export function toSatoshi(wage) {
  return Math.round(Number(wage) * SATOSHI);
}

export function fromSatoshi(satoshi) {
  return Number(satoshi) / SATOSHI;
}

export async function readContract(method, args = []) {
  const data = encodeCall(method, args);
  const result = await window.digiwageLight.callContract(CONTRACT_ADDRESS, data);
  if (result.executionResult && result.executionResult.excepted && result.executionResult.excepted !== 'None') {
    throw new Error(`Contract call reverted: ${result.executionResult.excepted}`);
  }
  return decodeResult(method, result.executionResult.output);
}

export async function writeContract({ method, args = [], amountWage = 0, gasLimit = 400000, gasPrice = 0.0000004 }) {
  const data = encodeCall(method, args);
  return window.digiwageLight.sendToContract({
    contractAddress: CONTRACT_ADDRESS,
    methodLabel: method,
    encodedData: data,
    amount: toSatoshi(amountWage),
    gasLimit,
    gasPrice
  });
}
