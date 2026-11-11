import Stripe from 'stripe';
import User from '../auth/auth.model.js';
import { applyPromoCodeService } from '../promoCode/promo.service.js';
import Resource from '../resource/resource.model.js';
import Order from './order.model.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20'
});

const TAX_PERCENT = 0.13; // 13% tax
const SELLER_SHARE_PERCENT = 0.5; // 50% of original price to seller

export const createCheckoutSession = async ({
  userId = null,
  guestId = null,
  itemsFromFrontend,
  promoCode,
  customerCountry = 'CA',
  customerEmail = null
}) => {
  if (!itemsFromFrontend?.length) throw new Error('No items provided');

  const itemsBySeller = new Map();
  const PLATFORM_STRIPE_ID = process.env.PLATFORM_STRIPE_ACCOUNT_ID;

  console.log('Platform Stripe ID from env:', PLATFORM_STRIPE_ID);

  // Group items by seller
  for (const item of itemsFromFrontend) {
    const resource = await Resource.findById(item.resource).lean();
    if (!resource) throw new Error(`Resource not found: ${item.resource}`);
    if (item.quantity > resource.quantity)
      throw new Error(`Not enough stock for ${resource.title}`);

    const seller = await User.findById(resource.createdBy).lean();
    if (!seller)
      throw new Error(`Seller not found for resource: ${resource.title}`);

    // Get original price (before tax)
    const originalUnitPriceCents = Math.round(
      (resource.discountPrice || resource.price) * 100
    );
    
    // Calculate price with tax for the customer
    const unitPriceWithTaxCents = Math.round(originalUnitPriceCents * (1 + TAX_PERCENT));
    
    const itemTotalOriginalCents = originalUnitPriceCents * item.quantity;
    const itemTotalWithTaxCents = unitPriceWithTaxCents * item.quantity;

    // Check if seller is platform or connected account
    const isPlatformSeller =
      !seller.stripeAccountId ||
      seller.stripeAccountId === PLATFORM_STRIPE_ID;

    const sellerKey = isPlatformSeller
      ? PLATFORM_STRIPE_ID
      : seller.stripeAccountId;

    if (!itemsBySeller.has(sellerKey)) {
      itemsBySeller.set(sellerKey, {
        sellerUserId: seller._id,
        sellerStripeId: sellerKey,
        isPlatformAccount: isPlatformSeller,
        items: [],
        lineItems: [],
        originalSubtotalCents: 0, // Original price without tax
        taxAmountCents: 0, // Tax amount
        totalWithTaxCents: 0 // Total including tax
      });
    }

    const group = itemsBySeller.get(sellerKey);
    
    // FIXED: Add 'price' field as required by schema
    group.items.push({
      resource: item.resource,
      quantity: item.quantity,
      price: originalUnitPriceCents / 100, // 👈 This is the REQUIRED price field (original price)
      originalPrice: originalUnitPriceCents / 100, // Additional info (optional)
      priceWithTax: unitPriceWithTaxCents / 100, // Additional info (optional)
      seller: seller._id
    });

    group.lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${resource.title} (incl. 13% tax)`,
          metadata: {
            resource: item.resource.toString(),
            sellerId: seller._id.toString(),
            originalPrice: originalUnitPriceCents.toString(),
            isPlatform: isPlatformSeller ? 'true' : 'false'
          }
        },
        unit_amount: unitPriceWithTaxCents // Customer sees price with tax
      },
      quantity: item.quantity
    });

    group.originalSubtotalCents += itemTotalOriginalCents;
    group.totalWithTaxCents += itemTotalWithTaxCents;
    group.taxAmountCents += (itemTotalWithTaxCents - itemTotalOriginalCents);
  }

  // Calculate totals
  let totalOriginalCents = 0;
  let totalWithTaxCents = 0;
  for (const group of itemsBySeller.values()) {
    totalOriginalCents += group.originalSubtotalCents;
    totalWithTaxCents += group.totalWithTaxCents;
  }

  // Apply promo code (if any) - promo applies to original price, then tax added
  let finalPriceWithTaxCents = totalWithTaxCents;
  let discountCents = 0;
  let discountOnOriginalCents = 0;

  if (promoCode) {
    // Calculate discount on original price
    const promo = await applyPromoCodeService(
      promoCode,
      totalOriginalCents / 100
    );
    
    discountOnOriginalCents = Math.round(promo.discountAmount * 100);
    
    // Calculate new total: (original - discount) + tax on discounted amount
    const discountedOriginalCents = totalOriginalCents - discountOnOriginalCents;
    const taxOnDiscounted = Math.round(discountedOriginalCents * TAX_PERCENT);
    
    finalPriceWithTaxCents = discountedOriginalCents + taxOnDiscounted;
    discountCents = discountOnOriginalCents;
  }

  const sessions = [];
  let totalSellerShareCents = 0;
  let totalAdminRevenueCents = 0;

  // Process each seller group
  for (const [sellerKey, group] of itemsBySeller) {
    // Calculate proportion based on original price (for fair distribution)
    const proportion = group.originalSubtotalCents / totalOriginalCents;
    
    // Seller gets 50% of ORIGINAL price (not including tax)
    const sellerShareCents = Math.round(group.originalSubtotalCents * SELLER_SHARE_PERCENT);
    
    // Admin gets: (total paid by customer) - (seller share)
    // This includes: original price (50% to seller, 50% to admin) + tax (all to admin)
    const groupFinalPriceCents = Math.round(finalPriceWithTaxCents * proportion);
    const adminShareCents = groupFinalPriceCents - sellerShareCents;

    totalSellerShareCents += sellerShareCents;
    totalAdminRevenueCents += adminShareCents;

    // Apply discount proportionally to this group (if any)
    let groupDiscountCents = 0;
    if (discountOnOriginalCents > 0) {
      groupDiscountCents = Math.round(discountOnOriginalCents * proportion);
    }

    // Create order - FIXED: Using correct field names that match schema
    const orderData = {
      items: group.items,
      user: userId || null,
      guest: guestId || null,
      totalAmount: groupFinalPriceCents / 100,
      discountAmount: groupDiscountCents / 100,
      taxAmount: (groupFinalPriceCents - (group.originalSubtotalCents - groupDiscountCents)) / 100,
      rawSubtotalCents: group.originalSubtotalCents, // Original price in cents
      paymentStatus: 'pending',
      customerCountry,
      sellerShares: { [sellerKey]: sellerShareCents },
      lawbieRevenueCents: adminShareCents, // 👈 Using correct field name 'lawbieRevenueCents' not 'adminRevenueCents'
      isMultiSellerOrder: itemsBySeller.size > 1,
      isPlatformOrder: group.isPlatformAccount
    };

    // Add promocode if exists
    if (promoCode) {
      orderData.promocode = promoCode; // or find the promocode ID if needed
    }

    console.log('Creating order with data:', JSON.stringify(orderData, null, 2));
    
    const order = await Order.create(orderData);

    console.log('Order created:', order._id.toString());
    console.log(`Group - Original: $${group.originalSubtotalCents/100}, Seller: $${sellerShareCents/100}, Admin: $${adminShareCents/100}`);

    // Get customer email
    let customerEmailToUse = customerEmail;
    if (!customerEmailToUse && userId) {
      const user = await User.findById(userId);
      customerEmailToUse = user?.email;
    }

    // Base session parameters
    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: group.lineItems,
      customer_email: customerEmailToUse,
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL}/cart`,
      metadata: {
        orderId: order._id.toString(),
        platform: 'lawbie-global',
        customerCountry,
        sellerKey,
        userId: userId || '',
        guestId: guestId || '',
        accountType: group.isPlatformAccount ? 'platform' : 'connected',
        originalSubtotal: group.originalSubtotalCents.toString(),
        sellerShare: sellerShareCents.toString(),
        adminShare: adminShareCents.toString()
      }
    };

    // Mirror the session metadata onto the underlying PaymentIntent too.
    // Without this, `payment_intent.succeeded` events (and any lookup done
    // directly against the PaymentIntent, e.g. in Stripe dashboard support
    // investigations) have no orderId to work with, which silently disables
    // the payment_intent-based fallback path in the webhook handler.
    sessionParams.payment_intent_data = {
      metadata: { ...sessionParams.metadata }
    };

    let session;

    if (group.isPlatformAccount) {
      // PLATFORM ACCOUNT: Direct payment to platform
      console.log('Creating platform account session');
      session = await stripe.checkout.sessions.create(sessionParams);
    } else {
      // CONNECTED ACCOUNT: With transfer to seller
      console.log('Creating connected account session for seller:', sellerKey);

      sessionParams.payment_intent_data.application_fee_amount = adminShareCents; // Admin keeps this amount
      sessionParams.payment_intent_data.transfer_data = {
        destination: sellerKey // Rest goes to seller
      };

      session = await stripe.checkout.sessions.create(sessionParams);
    }

    // Update order with session info
    order.stripeSessionId = session.id;
    order.totalAmount = session.amount_total / 100;
    await order.save();

    sessions.push({
      sessionId: session.id,
      url: session.url,
      orderId: order._id.toString(),
      sellerStripeId: sellerKey,
      isPlatformAccount: group.isPlatformAccount,
      amountTotal: session.amount_total / 100,
      originalSubtotal: group.originalSubtotalCents / 100,
      sellerShare: sellerShareCents / 100,
      adminShare: adminShareCents / 100,
      taxAmount: (groupFinalPriceCents - (group.originalSubtotalCents - groupDiscountCents)) / 100
    });
  }

  return {
    sessions,
    totalOriginal: totalOriginalCents / 100,
    totalWithTax: finalPriceWithTaxCents / 100,
    totalDiscount: discountCents / 100,
    totalSellerShare: totalSellerShareCents / 100,
    totalAdminRevenue: totalAdminRevenueCents / 100
  };
};