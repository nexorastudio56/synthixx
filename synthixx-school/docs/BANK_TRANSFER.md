# Bank Transfer Payment Guide

Bank transfer allows parents to pay school fees via a direct bank transfer. Unlike automated gateways (CashMaal, JazzCash, EasyPaisa), bank transfer requires **manual admin verification** before the fee is marked as paid.

---

## How It Works

### Parent Side

1. Parent logs in to the **Parent Portal** (`/school/parents`)
2. Clicks **"Pay via Bank Transfer"** button (visible if any fees are unpaid)
3. A unique **reference code** is generated (e.g., `BT1720000000123`)
4. Parent is shown:
   - The reference code to include in the bank transfer remarks
   - The school's bank account details
5. Parent transfers the exact fee amount via their bank app/branch
6. Fee shows as **Processing** (awaiting admin verification)

### Admin Side

1. Admin logs in and goes to **Payment Transactions** (`/school/payments`)
2. Filter by Gateway: **Bank Transfer** to see all pending transfers
3. A **"Verify & Mark Paid"** button appears on rows with status **Processing**
4. Admin verifies the transfer (checks bank statement / receipt)
5. Clicks **Verify & Mark Paid**, optionally adds a reason
6. Fee is immediately marked as **Paid**
7. Audit trail records: admin email, timestamp, and reason

---

## Setup Requirements

**No gateway credentials needed.** Bank transfer works immediately as long as the school has bank account details configured.

### Configure School Bank Details

In school settings, fill in:
- **Bank Name** (e.g., Meezan Bank, HBL, UBL)
- **Account Number**
- **Account Title**

These are shown to parents on the Bank Transfer details screen.

---

## Security

- The reference code is unique per transaction (timestamp + random suffix)
- Only `SCHOOL_ADMIN`, `SUPER_ADMIN`, and `ACCOUNTANT` roles can verify bank transfers
- Every verification is logged with admin email + timestamp (audit trail)
- Parents **cannot** self-mark bank transfers as paid
- Fees stay in **Processing** status until an admin explicitly verifies

---

## Database

Bank transfer payments are stored in `fee_payments` table with:

| Column | Value |
|--------|-------|
| `gateway` | `bank_transfer` |
| `status` | `processing` (until verified) → `paid` (after admin approval) |
| `txn_ref` | Unique reference code (e.g., `BT1720000000123`) |
| `payment_method` | `Bank Transfer` |
| `marked_by` | Admin email (set on verification) |
| `marked_at` | Timestamp of verification |
| `mark_reason` | Admin's note (optional) |

### Required Migration

Ensure `supabase/cashmaal-payments.sql` has been applied (it includes `bank_transfer` in the gateway constraint).

---

## API Endpoints

### `POST /api/school/pay/bank-transfer/initiate`

Called by the parent portal to create a bank transfer attempt.

**Auth:** Requires authenticated session (parent role)  
**Body:** `{ feeIds: string[] }`  
**Returns:** `{ txnRef: string, amount: number }`

### `POST /api/school/pay/bank-transfer/verify`

Called by the admin to mark a bank transfer as paid.

**Auth:** Requires authenticated session (SCHOOL_ADMIN, SUPER_ADMIN, or ACCOUNTANT role)  
**Body:** `{ txnRef: string, reason?: string }`  
**Returns:** `{ success: true }`

---

## Troubleshooting

### "No pending fees" when clicking bank transfer
**Cause:** All fees are already paid.  
**Fix:** Check fee status in the fee management page.

### Parent doesn't see bank account details
**Cause:** School bank account not configured in settings.  
**Fix:** Go to School Settings and add bank account number, bank name, and account title.

### Verify button not showing for admin
**Cause:** Row status is not "processing" (may already be verified).  
**Fix:** Check the status column — if it shows "Paid", the transfer was already verified.

### Admin can't verify (403 error)
**Cause:** User role is not SCHOOL_ADMIN, SUPER_ADMIN, or ACCOUNTANT.  
**Fix:** An admin with a qualifying role must verify the payment.
