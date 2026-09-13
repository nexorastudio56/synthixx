# Payment Gateways Setup Guide

This document explains how to set up and configure all supported payment gateways for school fee collection.

---

## Quick Reference

| Gateway | Use Case | Region | Cost | Setup Difficulty |
|---------|----------|--------|------|------------------|
| **CashMaal** | ⭐ Recommended | Pakistan | Low | Easy |
| **JazzCash** | Alternative | Pakistan | Low | Medium |
| **EasyPaisa** | Alternative | Pakistan | Low | Medium |
| **Bank Transfer** | Offline | Global | None | Simple |

---

## 1. CashMaal (Recommended) ⭐

**Best for:** Schools in Pakistan wanting multi-method payments in one integration.

### Features
- ✅ Aggregates JazzCash, EasyPaisa, NayaPay, Cards, Bank Transfers
- ✅ Parents see ONE payment form with all options
- ✅ Secure webhook verification (IPN)
- ✅ Transaction history & reporting
- ✅ Test mode available

### Setup Steps

1. **Get Account**
   - Sign up: https://www.cashmaal.com
   - Complete KYC verification

2. **Get Credentials**
   - Log in to merchant dashboard
   - Go to: Merchant Settings → Your Websites
   - Copy **Web ID** (required)
   - Note **IPN Key** (recommended)

3. **Configure App**
   ```bash
   # In .env.local
   CASHMAAL_WEB_ID=your_web_id_here
   CASHMAAL_IPN_KEY=your_ipn_key_here  # optional but recommended
   ```

4. **Set IPN Webhook**
   - In CashMaal: Merchant Settings → Webhooks
   - Enter: `https://school.synthixx.com/api/school/pay/cashmaal/ipn`

5. **Enable Payment Methods**
   - In CashMaal: Payment Methods
   - Enable: JazzCash ✓, EasyPaisa ✓, NayaPay ✓ (as available)

6. **Test**
   - Go to parent portal
   - Click "Pay Fees" → "CashMaal"
   - Complete test transaction

**Setup Time:** ~15 minutes
**Documentation:** See [CASHMAAL_SETUP.md](./CASHMAAL_SETUP.md)

---

## 2. JazzCash (Direct)

**Best for:** Schools preferring direct gateway integration.

### Features
- ✅ Direct integration with JazzCash
- ✅ Secure hash verification
- ✅ No middleman (lower fees possible)
- ❌ Only JazzCash as payment method

### Setup Steps

1. **Get Account**
   - Sign up: https://www.jazzcash.com.pk
   - Complete merchant verification

2. **Get Credentials**
   - Dashboard → Merchant Account → Integration
   - Copy:
     - Merchant ID
     - Password
     - Integrity Salt

3. **Configure App**
   ```bash
   # In .env.local
   JAZZCASH_MERCHANT_ID=your_merchant_id
   JAZZCASH_PASSWORD=your_password
   JAZZCASH_INTEGRITY_SALT=your_salt
   ```

4. **Test**
   - Parent portal → Pay Fees → JazzCash
   - Complete test payment

**Setup Time:** ~20 minutes
**Status:** ✅ Verified & Production-Ready

---

## 3. EasyPaisa (Direct)

**Best for:** Schools preferring EasyPaisa-only integration.

### Features
- ✅ Direct integration with EasyPaisa
- ✅ Simple setup
- ❌ Only EasyPaisa as payment method

### Setup Steps

1. **Get Account**
   - Sign up: https://www.easypaisa.com.pk/merchants
   - Complete verification

2. **Get Credentials**
   - Dashboard → Settings → API Configuration
   - Copy:
     - Store ID
     - Hash Key

3. **Configure App**
   ```bash
   # In .env.local
   EASYPAISA_STORE_ID=your_store_id
   EASYPAISA_HASH_KEY=your_hash_key
   ```

4. **Test**
   - Parent portal → Pay Fees → EasyPaisa
   - Complete test payment

**Setup Time:** ~15 minutes
**Status:** ✅ Verified & Production-Ready

---

## 4. Bank Transfer (Manual, No Integration)

**Best for:** Schools wanting offline payment option.

### Features
- ✅ No gateway fees
- ✅ Manual verification
- ✅ Admin can mark payments paid
- ❌ Requires manual admin review

### How It Works

1. **Parent initiates bank transfer**
   - Goes to parent portal
   - Clicks "Pay via Bank Transfer"
   - Gets school bank details & reference code
   - Transfers money via bank

2. **Parent uploads proof (optional)**
   - Parent can upload receipt screenshot

3. **Admin verifies & marks paid**
   - Goes to Payment Transactions dashboard
   - Sees pending bank transfers
   - Clicks "Verify & Mark Paid"
   - Requires password confirmation

4. **Fee marked as paid**
   - Audit trail records admin action
   - Parent sees updated status

**Setup Time:** None (already built in)
**Status:** ✅ Ready

---

## Payment Flow Diagram

```
Parent Portal
     │
     ├─→ [ Pay Now Button ]
     │         │
     │         ├─→ CashMaal ──┬─→ JazzCash (user selects)
     │         │              ├─→ EasyPaisa
     │         │              ├─→ NayaPay
     │         │              └─→ Bank Transfer
     │         │
     │         ├─→ JazzCash (direct)
     │         │
     │         ├─→ EasyPaisa (direct)
     │         │
     │         └─→ Bank Transfer
     │
     └─→ [ Payment Status ]
             │
             ├─→ Paid ✓
             ├─→ Failed ✗
             ├─→ Pending (awaiting gateway/admin)
             └─→ Processing (confirming)

Admin Dashboard
     │
     └─→ [ Payment Transactions ]
             │
             ├─→ Filter by: Status, Gateway, Date, Student
             ├─→ View: Amount, Method, Transaction ID
             ├─→ Manual verification (for bank transfers)
             └─→ Export CSV for accounting
```

---

## Configuration Table

| Variable | Gateway | Required | Default | Example |
|----------|---------|----------|---------|---------|
| `CASHMAAL_WEB_ID` | CashMaal | ❌* | None | `CM_WID_abc123` |
| `CASHMAAL_IPN_KEY` | CashMaal | ❌ | None | `sk_live_...` |
| `JAZZCASH_MERCHANT_ID` | JazzCash | ❌ | None | `MERCHANT001` |
| `JAZZCASH_PASSWORD` | JazzCash | ❌ | None | `pass123456` |
| `JAZZCASH_INTEGRITY_SALT` | JazzCash | ❌ | None | `salt123456` |
| `EASYPAISA_STORE_ID` | EasyPaisa | ❌ | None | `123456` |
| `EASYPAISA_HASH_KEY` | EasyPaisa | ❌ | None | `key123456` |

*At least ONE gateway must be configured for online payments

---

## Security Best Practices

### Environment Variables
- ✅ Never commit `.env.local` to git
- ✅ All secret keys are server-side only
- ✅ Use strong, random keys
- ✅ Rotate keys annually

### Payment Verification
- ✅ All payments verified server-side
- ✅ Hash/signature validation mandatory
- ✅ IPN webhook verification recommended
- ✅ Duplicate prevention (idempotent)

### Admin Access
- ✅ Only admins can mark payments paid
- ✅ Manual marking requires password
- ✅ Audit trail logs who marked what
- ✅ Cannot un-mark a payment

---

## Troubleshooting

### "No online payment gateway configured"
**Problem:** No env variables set for any gateway
**Solution:** Set at least `CASHMAAL_WEB_ID` or `JAZZCASH_MERCHANT_ID`

### Payment doesn't confirm
**Problem:** Gateway not responding or IPN not working
**Solution:** 
1. Check gateway dashboard for transaction
2. Verify webhook URL is correct
3. Check app logs for IPN errors
4. See [CASHMAAL_SETUP.md](./CASHMAAL_SETUP.md#troubleshooting) for details

### Wrong payment method showing
**Problem:** Enabled in CashMaal but not showing to parents
**Solution:** Clear browser cache, wait 5 min for CashMaal to sync

### Transaction shows as "Processing" for hours
**Problem:** IPN not reaching app or gateway delay
**Solution:**
1. Check gateway's transaction history
2. Verify IPN URL is accessible
3. Check CashMaal webhook logs
4. Manually mark as paid if needed

---

## Next Steps

1. **Choose a gateway** (CashMaal recommended)
2. **Follow that gateway's setup section** above
3. **Test with a small transaction** (₨100-500)
4. **Verify admin dashboard shows it**
5. **Go live!**

---

## Support

- **CashMaal Issues:** See [CASHMAAL_SETUP.md](./CASHMAAL_SETUP.md)
- **Code Issues:** Check `lib/school/cashmaal.ts` and `app/api/school/pay/`
- **General Help:** docs/PAYMENT_VERIFICATION.md

**Gateway Status:** All gateways verified ✅ and production-ready.
