# DigiWage Freelance Hub (example dApp)

A hybrid worked example of building a dApp against the DigiWage Light
Wallet extension, combining two models:

- **Job board** (Upwork/Freelancer.com-style): an employer posts a job with
  a WAGE budget escrowed in the contract, freelancers apply publicly
  (anyone can see who applied to a job, not just the employer), the
  employer hires one, and completing the job releases the escrow.
- **Service marketplace** (Fiverr-style): a freelancer lists a fixed-price
  service ("gig"), a buyer orders it (escrowing the price), the freelancer
  marks it delivered, and the buyer releases payment. Either party can
  cancel an unfulfilled order for a refund.

Plus on-chain profiles -- any address can set a display name, bio, and
avatar image URL for itself, shown wherever that address appears (job
poster, applicant, service listing, order party).

This is a teaching example, not an audited production contract -- no
platform fee, no dispute resolution, no rating system. See the comments in
`contracts/FreelanceHub.sol`.

## Layout

- `contracts/FreelanceHub.sol` -- the contract source. Solidity 0.8.26
  targeting `--evm-version shanghai` on purpose: this chain's evmone
  activates Shanghai (PUSH0, warm/cold access lists, everything through
  April 2023's hardfork) at `consensus.digiwage_contract_height`, block 30
  on forktest (see `kernel/chainparams.cpp`) -- there's no reason to target
  an older EVM version here just because some other contract examples
  predate Shanghai's activation.
- `contracts/FreelanceHub.abi.json` -- compiled ABI, used directly by the
  frontend (no build step needed to read it).
- `contracts/deployment.json` -- where it's currently deployed.
- `app/` -- a Vite + React frontend with four tabs (Jobs / Marketplace /
  Orders / Profile) that talks to the contract entirely through
  `window.digiwageLight` (the extension's injected SDK, see
  `../../public/integration/inpage/index.js`). No wallet/private-key code
  lives in this app at all -- reading state goes through `callContract`,
  and every state-changing action goes through `sendToContract`, which
  opens the extension's own confirmation popup.

## Running it

Needs the DigiWage Light Wallet extension installed and unlocked, pointed
at the `forktest` network (this contract is only deployed there).

```
cd app
npm install
npm run dev   # binds 0.0.0.0:5173 by default
```

Then open the printed URL. `npm run build` produces a static `dist/` you
can host anywhere; it's a plain client-side app, no server component.

To poke at the read path (jobs, services, orders, profiles) without
installing the extension at all, open `test-stub.html` from the dev server
instead of `index.html` -- it stubs `window.digiwageLight` and proxies
`callContract` to the real deployed contract through a running
digiwage-explorer-api. Posting/applying/hiring/ordering won't work there since
those need a real wallet to sign.

## Redeploying the contract

If you change `FreelanceHub.sol`, recompile with solc 0.8.26+ (`--evm-version
shanghai`, matching this chain's actual activated EVM revision) and
redeploy via `digiwage-cli createcontract`, then update:
- `contracts/FreelanceHub.abi.json` (new ABI if the interface changed)
- `contracts/deployment.json`
- `app/src/contract.js`'s `CONTRACT_ADDRESS`
