# CashMaal Payment Gateway Setup Guide

## Prerequisites

- ✅ CashMaal merchant account (https://www.cashmaal.com)
- ✅ Merchant Web ID from your CashMaal dashboard
- ✅ IPN Key (optional but recommended)
- ✅ School domain (e.g., `school.synthixx.com`)

---

## Step 1: Get Your CashMaal Credentials

### Where to Find Them

1. **Log in** to CashMaal merchant dashboard: https://merchant.cashmaal.com
2. Go to **Merchant Settings** → **Your Websites**
3. Find or create your website entry for `school.synthixx.com`
4. Copy your **Web ID** (looks like: `CM_WID_12345` or similar)

### Optional but Recommended: IPN Key

1. In Merchant Settings, look for **Security** or **IPN Settings**
2. Your IPN Key should be displayed there
3. If not generated, request one from CashMaal support

---

## Step 2: Configure Environment Variables

### In Your `.env.local` File

Add these variables (you can copy from `.env.example`):

```bash
# CashMaal payment gateway — https://www.cashmaal.com/api
# Web ID (from CashMaal account > Merchant Settings > your website)
CASHMAAL_WEB_ID=YOUR_WEB_ID_HERE

# IPN key shown in your CashMaal merchant settings. Used to verify IPN
# callbacks (Strongly recommended). Without it, IPN is verified via the
# verify_v2 API instead.
CASHMAAL_IPN_KEY=YOUR_IPN_KEY_HERE
```

### Example (after filling in)

```bash
CASHMAAL_WEB_ID=CM_WID_abc123def456
CASHMAAL_IPN_KEY=sk_live_9876543210abcdef
```

### Environment Variables Already Set

The following are already configured for you:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3002  # or your production domain
NEXT_PUBLIC_SUPABASE_URL=...               # Already set
NEXT_PUBLIC_SUPABASE_ANON_KEY=...         # Already set
```

---

## Step 3: Configure CashMaal IPN Webhook URL

This is **critical** for payment confirmation.

### In CashMaal Merchant Dashboard

1. Go to **Merchant Settings** → **Webhooks** or **IPN Settings**
2. Find or add your **Return/Callback URL** field
3. Enter this URL:

```
https://school.synthixx.com/api/school/pay/cashmaal/ipn
```

**For Local Development:**
If testing locally, you'll need ngrok or a tunnel service:
```
https://your-ngrok-url.ngrok.io/api/school/pay/cashmaal/ipn
```

### What This Does

When a customer completes payment on CashMaal, they send a webhook (IPN) to this URL. The app:
1. Verifies the IPN key (if set)
2. Checks the order ID exists
3. Validates the amount
4. Marks the fee as PAID
5. Updates the student's payment status

---

## Step 4: Configure Return URLs (Optional)

CashMaal may ask for success/cancel URLs. These are already configured in the code:

- **Success URL:** `https://school.synthixx.com/api/school/pay/cashmaal/return?o={order_id}`
- **Cancel URL:** `https://school.synthixx.com/api/school/pay/cashmaal/return?o={order_id}`

Both redirect to the same endpoint which displays the payment status to parents.

---

## Step 5: Enable Payment Methods

In CashMaal Merchant Settings, enable the payment methods you want parents to use:

- ✅ **JazzCash** (recommended for Pakistan)
- ✅ **EasyPaisa** (recommended for Pakistan)
- ✅ **NayaPay** (if available in your region)
- ✅ **International Cards** (if enabled on your account)
- ✅ **Bank Transfer** (if available)

**The app automatically shows only enabled methods** - parents see a selection screen based on your merchant settings.

---

## Step 6: Test the Integration

### Test Payment Flow

1. **Log in** as a parent at `https://school.synthixx.com/school/parents`
2. Navigate to **Pay fees** section
3. Select unpaid fees and click **Pay Online**
4. Choose **CashMaal** as the gateway
5. You should be redirected to `cmaal.com/Pay/`
6. Select a payment method (JazzCash, EasyPaisa, etc.)
7. Complete a **test transaction** (use test credentials if available)
8. After payment, you should be redirected back to parents portal with status

### What to Verify

- ✅ Parents can see the payment button
- ✅ CashMaal payment page loads
- ✅ Payment methods are available
- ✅ After payment, status updates to "Paid"
- ✅ Fee shows as paid in the ledger
- ✅ Receipt can be generated

### If Payment Doesn't Confirm

1. Check IPN logs in CashMaal dashboard (usually under "Transaction History" or "Webhooks")
2. Verify IPN URL is correct: `/api/school/pay/cashmaal/ipn`
3. Check that `CASHMAAL_IPN_KEY` is set (if IPN key is configured on CashMaal)
4. Check app logs for errors (if self-hosted)

---

## Step 7: Production Checklist

Before going live:

- [ ] Web ID is set in `.env.local` (or production environment variables)
- [ ] IPN Key is set (if configured on CashMaal)
- [ ] IPN Webhook URL is configured in CashMaal: `/api/school/pay/cashmaal/ipn`
- [ ] All desired payment methods are enabled in CashMaal
- [ ] Test transaction completed successfully
- [ ] Fee status updated to "Paid" after test transaction
- [ ] Parent portal shows payment history
- [ ] Admin dashboard shows transaction in Payment Transactions page
- [ ] HTTPS is enabled (required by CashMaal)
- [ ] Domain is production domain (not localhost)

---

## Troubleshooting

### "Payment gateway is not configured" Error

**Cause:** `CASHMAAL_WEB_ID` environment variable is not set.

**Fix:** 
1. Add `CASHMAAL_WEB_ID` to `.env.local`
2. Restart the development server
3. Clear browser cache

### Payment Doesn't Confirm After Return

**Cause:** IPN not reaching the app OR IPN key mismatch.

**Debug:**
1. Check CashMaal dashboard → Webhooks → look for failed requests
2. Verify `/api/school/pay/cashmaal/ipn` is accessible
3. If using ngrok, ensure tunnel is active
4. Check app logs for IPN errors

### "Unknown Order ID" in IPN Logs

**Cause:** Order ID not found in database.

**Debug:**
1. Verify the order was created (fee_payments table)
2. Check that amount matches exactly
3. Try refreshing the parent portal page

### Different Payment Methods Not Showing

**Cause:** Not enabled in CashMaal merchant settings.

**Fix:**
1. Log into CashMaal merchant dashboard
2. Go to Merchant Settings → Payment Methods
3. Enable desired methods (JazzCash, EasyPaisa, NayaPay, etc.)
4. Save changes
5. Wait ~5 minutes for cache refresh

---

## Security Notes

### Secrets

- ✅ Never commit `.env.local` to git
- ✅ `CASHMAAL_IPN_KEY` is only used server-side
- ✅ `CASHMAAL_WEB_ID` can be public (it's the merchant identifier)

### IPN Verification

The app uses one of two methods to verify payments:

1. **IPN Key Verification** (if CASHMAAL_IPN_KEY is set)
   - Constant-time comparison using crypto.timingSafeEqual
   - Most secure

2. **verify_v2 API** (fallback if IPN key not set)
   - Queries CashMaal to confirm transaction status
   - Slightly slower but safe

Both are equally secure - use whichever fits your setup.

### Payment Security

- ✅ Amount is verified server-side
- ✅ Order IDs are unique and timestamped
- ✅ Duplicate payments are prevented (idempotent)
- ✅ Only marked PAID if verification succeeds
- ✅ All payments logged with gateway transaction IDs

---

## Support & Documentation

- **CashMaal API Docs:** https://www.cashmaal.com/api
- **CashMaal Support:** support@cashmaal.com
- **This App:** Payment code is at `lib/school/cashmaal.ts` and `app/api/school/pay/cashmaal/`

---

## Next Steps

1. ✅ Set environment variables
2. ✅ Configure CashMaal IPN URL
3. ✅ Enable payment methods in CashMaal
4. ✅ Test with a small transaction
5. ✅ Verify admin dashboard shows transaction
6. ✅ Go live!

**Questions?** Check `docs/PAYMENT_GATEWAYS.md` for detailed payment flow architecture.
