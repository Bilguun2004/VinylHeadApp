ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS bonum_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS bonum_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.orders.payment_status IS
  'unpaid | pending | paid | failed — Bonum/QPay lifecycle';
COMMENT ON COLUMN public.orders.bonum_invoice_id IS
  'Bonum Gateway invoice id from createInvoice';
COMMENT ON COLUMN public.orders.bonum_transaction_id IS
  'Merchant transactionId sent to Bonum (usually orders.id)';
COMMENT ON COLUMN public.orders.paid_at IS
  'Set when Bonum webhook confirms successful payment';

CREATE INDEX IF NOT EXISTS orders_bonum_transaction_id_idx
  ON public.orders (bonum_transaction_id)
  WHERE bonum_transaction_id IS NOT NULL;
