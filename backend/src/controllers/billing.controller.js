import crypto from "crypto";
import Razorpay from "razorpay";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { env } from "../config/env.js";
import {
  amountForCurrency,
  getProductBySlug,
  getUserAccessSummary,
  grantProductEntitlement,
  listPremiumProducts,
  normalizeCurrency,
} from "../services/entitlement.service.js";

const getRazorpay = () => {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Razorpay is not configured.");
  }

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
};

const describeRazorpayConfig = () => {
  const keyId = env.RAZORPAY_KEY_ID || "";
  return {
    configured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET),
    mode: keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unknown",
  };
};

const publicProduct = (product, currency = "INR", accessSummary = null) => {
  const selectedCurrency = normalizeCurrency(currency);
  const unlocked =
    product.kind === "full_pro"
      ? Boolean(accessSummary?.isPro)
      : Boolean(accessSummary?.isPro || accessSummary?.tracks?.includes(product.trackKey));

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    kind: product.kind,
    trackKey: product.trackKey,
    active: product.active,
    freeItemQuota: product.freeItemQuota,
    displayOrder: product.displayOrder,
    metadata: product.metadata || {},
    prices: {
      INR: product.priceInrPaise,
      USD: product.priceUsdCents,
    },
    selectedCurrency,
    selectedAmount: amountForCurrency(product, selectedCurrency),
    unlocked,
  };
};

export const getBillingProducts = asyncHandler(async (req, res) => {
  const currency = normalizeCurrency(req.query.currency);
  const [products, accessSummary] = await Promise.all([
    listPremiumProducts(),
    getUserAccessSummary(req.user?.id),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      currency,
      razorpayKeyId: env.RAZORPAY_KEY_ID || "",
      razorpay: describeRazorpayConfig(),
      access: {
        isPro: accessSummary.isPro,
        tracks: accessSummary.tracks,
      },
      products: products.map((product) => publicProduct(product, currency, accessSummary)),
    },
  });
});

export const getMyBillingAccess = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new ApiError(401, "Authentication required.");

  const [accessSummary, products] = await Promise.all([
    getUserAccessSummary(req.user.id),
    listPremiumProducts(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      isPro: accessSummary.isPro,
      tracks: accessSummary.tracks,
      entitlements: accessSummary.entitlements.map((entry) => ({
        id: entry.id,
        scope: entry.scope,
        trackKey: entry.trackKey,
        source: entry.source,
        startsAt: entry.startsAt,
        expiresAt: entry.expiresAt,
        product: entry.product
          ? {
              slug: entry.product.slug,
              title: entry.product.title,
              kind: entry.product.kind,
              trackKey: entry.product.trackKey,
            }
          : null,
      })),
      products: products.map((product) => publicProduct(product, "INR", accessSummary)),
    },
  });
});

export const createBillingOrder = asyncHandler(async (req, res) => {
  if (!req.user?.id || req.accountType !== "student") {
    throw new ApiError(403, "Only student accounts can purchase Pro access.");
  }

  const { productSlug, currency: rawCurrency } = req.body;
  const currency = normalizeCurrency(rawCurrency);
  const product = await getProductBySlug(productSlug);

  if (!product) throw new ApiError(404, "Premium product not found.");

  const accessSummary = await getUserAccessSummary(req.user.id);
  const alreadyUnlocked =
    product.kind === "full_pro"
      ? accessSummary.isPro
      : accessSummary.isPro || accessSummary.tracks.includes(product.trackKey);
  if (alreadyUnlocked) throw new ApiError(409, "You already have access to this product.");

  const amount = amountForCurrency(product, currency);
  if (!amount || amount <= 0) throw new ApiError(400, "This product is not purchasable.");

  const receipt = `enum_${Date.now().toString(36)}_${req.user.id.slice(-6)}`;
  const razorpay = getRazorpay();
  let order;
  try {
    order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes: {
        productSlug: product.slug,
        userId: req.user.id,
      },
    });
  } catch (error) {
    const description =
      error?.error?.description ||
      error?.message ||
      "Razorpay order creation failed.";
    const isCredentialError = /key|secret|auth|credential|expired/i.test(description);
    throw new ApiError(
      isCredentialError ? 500 : 400,
      isCredentialError
        ? "Razorpay test credentials are invalid or expired. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with a fresh matching test key pair, then restart the backend."
        : description,
    );
  }

  const paymentOrder = await prisma.paymentOrder.create({
    data: {
      userId: req.user.id,
      productId: product.id,
      razorpayOrderId: order.id,
      receipt,
      currency,
      amount,
      status: "created",
      metadata: {
        productSlug: product.slug,
        razorpayStatus: order.status,
      },
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      orderId: order.id,
      amount,
      currency,
      receipt,
      keyId: env.RAZORPAY_KEY_ID,
      product: publicProduct(product, currency, accessSummary),
      paymentOrderId: paymentOrder.id,
      user: {
        name: req.user.displayName || req.user.username || "",
        email: req.user.email,
      },
    },
  });
});

const verifySignature = ({ orderId, paymentId, signature }) => {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const actual = String(signature || "");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

export const verifyBillingPayment = asyncHandler(async (req, res) => {
  if (!req.user?.id) throw new ApiError(401, "Authentication required.");

  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;

  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, "Razorpay payment details are required.");
  }

  if (!verifySignature({ orderId, paymentId, signature })) {
    throw new ApiError(400, "Invalid Razorpay payment signature.");
  }

  const order = await prisma.paymentOrder.findUnique({
    where: { razorpayOrderId: orderId },
    include: { product: true },
  });

  if (!order || order.userId !== req.user.id) {
    throw new ApiError(404, "Payment order not found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder =
      order.status === "paid"
        ? order
        : await tx.paymentOrder.update({
            where: { id: order.id },
            data: {
              status: "paid",
              razorpayPaymentId: paymentId,
              razorpaySignature: signature,
              paidAt: new Date(),
            },
            include: { product: true },
          });

    await tx.paymentEvent.create({
      data: {
        userId: req.user.id,
        paymentOrderId: order.id,
        eventType: "payment.verified",
        payload: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
        },
      },
    });

    const entitlement = await grantProductEntitlement({
      userId: req.user.id,
      product: updatedOrder.product,
      source: "purchase",
      paymentOrderId: order.id,
      notes: `Razorpay payment ${paymentId}`,
      client: tx,
    });

    return { updatedOrder, entitlement };
  });

  const accessSummary = await getUserAccessSummary(req.user.id);

  return res.status(200).json({
    success: true,
    message: "Payment verified and access unlocked.",
    data: {
      order: {
        id: result.updatedOrder.id,
        status: result.updatedOrder.status,
        razorpayOrderId: result.updatedOrder.razorpayOrderId,
        razorpayPaymentId: result.updatedOrder.razorpayPaymentId,
      },
      entitlement: {
        id: result.entitlement.id,
        scope: result.entitlement.scope,
        trackKey: result.entitlement.trackKey,
      },
      access: {
        isPro: accessSummary.isPro,
        tracks: accessSummary.tracks,
      },
    },
  });
});

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const event = req.body || {};
  const orderId = event?.payload?.payment?.entity?.order_id;
  const eventType = event?.event || "razorpay.webhook";
  const paymentEntity = event?.payload?.payment?.entity;

  const order = orderId
    ? await prisma.paymentOrder.findUnique({
        where: { razorpayOrderId: orderId },
        include: { product: true },
      })
    : null;

  await prisma.paymentEvent.create({
    data: {
      userId: order?.userId || null,
      paymentOrderId: order?.id || null,
      eventType,
      payload: event,
    },
  });

  const shouldGrantAccess =
    order &&
    order.product &&
    order.status !== "paid" &&
    (eventType === "payment.captured" || eventType === "order.paid");

  if (shouldGrantAccess) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "paid",
          razorpayPaymentId: paymentEntity?.id || "",
          paidAt: new Date(),
        },
      });

      await grantProductEntitlement({
        userId: order.userId,
        product: order.product,
        source: "purchase",
        paymentOrderId: order.id,
        notes: `Razorpay webhook ${eventType}`,
        client: tx,
      });
    });
  }

  return res.status(200).json({ success: true });
});
