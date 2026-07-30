import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  ensureDefaultPremiumProducts,
  grantProductEntitlement,
  listPremiumProducts,
  revokeEntitlement,
} from "../services/entitlement.service.js";
import { audit } from "./admin-advanced.controller.js";

import { isValidId } from "../utils/isValidId.js";

const productPayload = (body) => {
  const data = {};
  [
    "slug",
    "title",
    "description",
    "kind",
    "trackKey",
    "active",
    "priceInrPaise",
    "priceUsdCents",
    "freeItemQuota",
    "displayOrder",
    "metadata",
  ].forEach((key) => {
    if (body[key] !== undefined) data[key] = body[key];
  });

  if (data.slug) data.slug = String(data.slug).trim().toLowerCase();
  if (data.kind && !["full_pro", "track"].includes(data.kind)) {
    throw new ApiError(400, "Invalid product kind.");
  }
  ["priceInrPaise", "priceUsdCents", "freeItemQuota", "displayOrder"].forEach((key) => {
    if (data[key] !== undefined) data[key] = Math.max(0, Number(data[key]) || 0);
  });
  if (data.active !== undefined) data.active = Boolean(data.active);
  if (data.metadata === undefined) delete data.metadata;

  return data;
};

export const getAdminBilling = asyncHandler(async (_req, res) => {
  await ensureDefaultPremiumProducts();
  const [products, orders, entitlements] = await Promise.all([
    listPremiumProducts({ includeInactive: true }),
    prisma.paymentOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: true,
        user: { select: { id: true, username: true, email: true, displayName: true } },
      },
    }),
    prisma.userEntitlement.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        product: true,
        user: { select: { id: true, username: true, email: true, displayName: true } },
      },
    }),
  ]);

  return res.status(200).json({
    message: "Billing fetched.",
    data: { products, orders, entitlements },
  });
});

export const createPremiumProduct = asyncHandler(async (req, res) => {
  const data = productPayload(req.body);
  if (!data.slug || !data.title) throw new ApiError(400, "Slug and title are required.");

  const product = await prisma.premiumProduct.create({
    data: {
      description: "",
      kind: "track",
      trackKey: "",
      active: true,
      priceInrPaise: 0,
      priceUsdCents: 0,
      freeItemQuota: 0,
      displayOrder: 100,
      metadata: {},
      ...data,
    },
  });

  await audit("billing.product.create", {
    targetType: "premium_product",
    targetId: product.id,
    targetName: product.slug,
    adminEmail: req.adminEmail || "",
  });

  return res.status(201).json({ message: "Product created.", data: product });
});

export const updatePremiumProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid product id required.");

  const data = productPayload(req.body);
  const product = await prisma.premiumProduct.update({
    where: { id },
    data,
  });

  await audit("billing.product.update", {
    targetType: "premium_product",
    targetId: product.id,
    targetName: product.slug,
    detail: JSON.stringify(data),
    adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: "Product updated.", data: product });
});

export const grantUserPremium = asyncHandler(async (req, res) => {
  const { userId, productId, notes = "" } = req.body;
  if (!isValidId(userId) || !isValidId(productId)) {
    throw new ApiError(400, "Valid userId and productId are required.");
  }

  const [user, product] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.premiumProduct.findUnique({ where: { id: productId } }),
  ]);
  if (!user) throw new ApiError(404, "User not found.");
  if (!product) throw new ApiError(404, "Product not found.");

  const entitlement = await grantProductEntitlement({
    userId,
    product,
    source: "admin_grant",
    notes,
  });

  await audit("billing.entitlement.grant", {
    targetType: "user",
    targetId: userId,
    targetName: user.username,
    detail: product.slug,
    adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: "Entitlement granted.", data: entitlement });
});

export const revokeUserPremium = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid entitlement id required.");

  const entitlement = await revokeEntitlement(id);
  await audit("billing.entitlement.revoke", {
    targetType: "entitlement",
    targetId: id,
    targetName: entitlement.trackKey || entitlement.scope,
    adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: "Entitlement revoked.", data: entitlement });
});
