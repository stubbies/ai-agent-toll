# AI Agent Toll

Stop blocking AI agents and start charging them. This sdk enforces **HTTP 402 Payment Required** at the Cloudflare Edge using USDC on Base.

## Features

*   **99% Agent Detection**: Uses TLS Fingerprinting (JA4), Cloudflare Bot Scores, and behavioral heuristics (OpenClaw/Markdown detection).
*   **Zero-Latency**: Performs all checks locally on the Edge. No third-party API round-trips.
*   **EIP-712 AccessGrants**: Cryptographically secure off-chain signatures for machine-to-machine payments.
*   **Multi-Chain Support**: Native support for **Base (USDC)**, Polygon, and Solana.
*   **Universal**: Native support for **Hono** and **Vanilla Workers**.

## Installation

```bash
npm install @stubbies/ai-agent-toll
```

## Usage (Hono)

```ts
import { Hono } from 'hono';
import { gatekeeper, TOKENS } from '@stubbies/ai-agent-toll';

const app = new Hono();

app.use('/api/premium/*', gatekeeper({
  paymentAddress: '0xYourWalletAddress',
  rules: [
    { 
      pattern: '^/api/premium/research/.*', 
      price: '1.00', 
      token: TOKENS.USDC_BASE, 
      strategy: 'PAY' ,
      duration: 3600 // 1 hour of access per payment
    },
    { 
      pattern: '^/api/premium/blog/.*', 
      price: '0.05', 
      token: TOKENS.USDC_BASE, 
      strategy: 'PAY' 
    }
  ]
}));

export default app;
```

## Usage (Vanilla Worker)

```ts
import { withGatekeeper } from '@stubbies/ai-agent-toll';

const worker = {
  async fetch(req, env, ctx) {
    return new Response("Welcome, Verified Agent.");
  }
};

// Wrap the default export
export default {
  fetch: withGatekeeper(worker.fetch, {
    paymentAddress: '0x...',
    rules: [...]
  })
};

```

## Privacy & Compliance

**"Dark"** by design.
- **No Data Exfiltration**: We never see your users' IPs, Headers, or Payloads.
- **Local Verification**: License keys and AccessGrants are verified cryptographically within your Worker.
- **GDPR Ready**: No PII is ever sent to our servers.

## How it Works for Agents
1. **Challenge**: Agent hits a protected path -> Proxy returns **402 Payment Required**.
3. **Payment**: Agent (or human) pays via the Link header or signs an **EIP-712** message.
4. **Access**: Agent retries with Authorization: Gatekeeper `<payload>.<signature>`.
5. **Verification**: SDK verifies the on-chain transaction and signature locally.

## Get your License Key
Visit {site} to get started.

## 🛠️ Roadmap & Development Status

### Incoming: TLS Fingerprinting (JA4)
We are currently implementing **JA4 Fingerprinting** to provide 99.9% detection accuracy against "Stealth" bots that spoof headers.

- [x] Header-based Agent Detection (User-Agent, Accept: markdown)
- [x] Cloudflare Bot Score Integration (v1.0)
- [ ] **TODO: JA4 TLS Fingerprinting** (Requires Cloudflare Enterprise/Business)
- [ ] **TODO: Global JA4 Reputation Database** (Crowdsourced bot signatures)

> **Note:** JA4 detection is currently in "Beta". If you are on a Cloudflare Free/Pro plan, the SDK will fallback to high-accuracy Header and Behavioral analysis.
