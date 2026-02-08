---
name: security-review
description: Supplementary security patterns not covered by the security-reviewer agent. Rate limiting, blockchain security, and pre-deployment checklist.
---

# Security Review Skill (Supplement)

> Core security review (OWASP Top 10, input validation, XSS, CSRF, SQL injection, auth) is handled by the `security-reviewer` agent. This skill covers **additional patterns** only.

## When to Activate

- Implementing rate limiting
- Working with blockchain/wallet features
- Preparing for production deployment

## 1. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests'
})
app.use('/api/', limiter)

// Stricter for expensive operations
const searchLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 })
app.use('/api/search', searchLimiter)
```

## 2. Blockchain Security (Solana)

```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string, signature: string, message: string
) {
  return verify(
    Buffer.from(message),
    Buffer.from(signature, 'base64'),
    Buffer.from(publicKey, 'base64')
  )
}

async function verifyTransaction(transaction: Transaction) {
  if (transaction.to !== expectedRecipient) throw new Error('Invalid recipient')
  if (transaction.amount > maxAmount) throw new Error('Amount exceeds limit')
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) throw new Error('Insufficient balance')
}
```

## 3. Pre-Deployment Checklist

- [ ] Secrets: all in env vars, none hardcoded
- [ ] Rate limiting enabled on all endpoints
- [ ] HTTPS enforced
- [ ] Security headers configured (CSP, X-Frame-Options)
- [ ] CORS properly configured
- [ ] Dependencies: `npm audit` clean
- [ ] Lock files committed
- [ ] Wallet signatures verified (if blockchain)
