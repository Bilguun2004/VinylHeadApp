import { useMutation } from '@tanstack/react-query';

import { uploadOrderLaserImageFromUri } from '../lib/upload-order-image';
import { supabase } from '../../../lib/supabase';
import type { Json } from '../../../types/supabase';
import type { CartLineItem } from '../types/cart-line-item';
import { getInstagramStoryFontLabel } from '../../products/lib/instagram-story-fonts';

const DELIVERY_FEE = 0;

export type DeliveryFormValues = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
};

export type CreateOrderInput = {
  userId: string;
  lines: CartLineItem[];
  delivery: DeliveryFormValues;
  paymentMethod: string;
};

export type CreateOrderResult = {
  orderId: string;
  followUpLink: string | null;
};

type BonumInvoiceInvokeResult = {
  invoiceId?: string;
  followUpLink?: string;
  orderId?: string;
  error?: string;
};

function orderNumber(): string {
  return `VH-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureProfile(
  userId: string,
  delivery: DeliveryFormValues,
): Promise<void> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  const patch = {
    full_name: delivery.fullName.trim() || null,
    phone_number: delivery.phone.trim() || null,
    delivery_address: [
      delivery.city,
      delivery.district,
      delivery.address,
    ]
      .filter(Boolean)
      .join(', '),
  };

  if (existing) {
    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('profiles').insert({
    id: userId,
    ...patch,
  });
  if (error) throw error;
}

export function useCreateOrderMutation() {
  return useMutation({
    mutationFn: async (input: CreateOrderInput): Promise<CreateOrderResult> => {
      const { userId, lines, delivery, paymentMethod } = input;
      if (lines.length === 0) {
        throw new Error('Сагс хоосон байна.');
      }

      await ensureProfile(userId, delivery);

      const isQpay = paymentMethod.toLowerCase() === 'qpay';

      const giftWrapTotal = lines.reduce((sum, line) => {
        if (line.giftOptionId == null) return sum;
        return sum + line.giftWrapExtra * line.quantity;
      }, 0);
      const subtotal = lines.reduce((sum, line) => {
        const laser = line.laserEnabled ? line.laserExtra : 0;
        return sum + line.unitPrice * line.quantity + laser;
      }, 0);
      const totalAmount = subtotal + giftWrapTotal + DELIVERY_FEE;

      const deliveryInfo: Json = {
        full_name: delivery.fullName.trim(),
        phone: delivery.phone.trim(),
        city: delivery.city,
        district: delivery.district,
        address: delivery.address.trim(),
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          order_number: orderNumber(),
          status: isQpay ? 'Pending' : 'Confirmed',
          payment_status: 'unpaid',
          subtotal,
          delivery_fee: DELIVERY_FEE,
          gift_wrap_total: giftWrapTotal,
          total_amount: totalAmount,
          delivery_info: deliveryInfo,
          payment_method: paymentMethod,
        })
        .select('id')
        .single();

      if (orderError) throw orderError;

      for (const line of lines) {
        let laserUrl: string | null = null;
        if (line.laserEnabled && line.laserImageUri?.trim()) {
          laserUrl = await uploadOrderLaserImageFromUri({
            localUri: line.laserImageUri,
            userId,
          });
        }

        const printText = line.laserPrintText?.trim() || null;
        const printFont =
          printText != null
            ? getInstagramStoryFontLabel(line.laserPrintFont)
            : null;
        const printNote = line.laserPrintNote?.trim() || null;

        const { error: itemError } = await supabase.from('order_items').insert({
          order_id: order.id,
          product_id: line.productId,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          gift_option_id: line.giftOptionId,
          laser_print_image_url: laserUrl,
          laser_print_text: printText,
          laser_print_font: printFont,
          laser_print_note: printNote,
        });

        if (itemError) throw itemError;
      }

      if (isQpay) {
        const { data, error: invoiceError } =
          await supabase.functions.invoke<BonumInvoiceInvokeResult>(
            'create-bonum-invoice',
            { body: { orderId: order.id } },
          );

        if (invoiceError) {
          let detail = invoiceError.message || 'QPay нэхэмжлэл үүсгэж чадсангүй.';
          const ctx = invoiceError.context as Response | undefined;
          if (ctx && typeof ctx.json === 'function') {
            try {
              const body = (await ctx.json()) as BonumInvoiceInvokeResult;
              if (typeof body.error === 'string' && body.error.trim()) {
                detail = body.error.trim();
              }
            } catch {
              // keep generic message
            }
          }
          throw new Error(detail);
        }
        if (data?.error) {
          throw new Error(data.error);
        }
        const followUpLink = data?.followUpLink?.trim() ?? '';
        if (!followUpLink) {
          throw new Error('QPay төлбөрийн холбоос ирсэнгүй.');
        }

        return { orderId: order.id, followUpLink };
      }

      // Storepay / non-QPay: notify admins about the new confirmed order.
      await supabase.functions
        .invoke('send-order-push', {
          body: { orderId: order.id },
        })
        .catch(() => undefined);

      return { orderId: order.id, followUpLink: null };
    },
  });
}
