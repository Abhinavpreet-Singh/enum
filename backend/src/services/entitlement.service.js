import prisma from "../db/index.js";

export const TRACK_KEYS = {
  FULL_PRO: "full-pro",
  SYSTEM_DESIGN: "system-design",
  FRONTEND: "frontend",
  BACKEND: "backend",
  LINUX: "linux",
  DSA: "dsa",
  SOA_OS: "soa-os",
  ENUM_TEST: "enum-test",
};

export const DEFAULT_PREMIUM_PRODUCTS = [
  {
    slug: "full-pro",
    title: "Enum Pro",
    description: "Unlock every premium track and all current Pro simulations.",
    kind: "full_pro",
    trackKey: "",
    priceInrPaise: 49900,
    priceUsdCents: 900,
    freeItemQuota: 0,
    displayOrder: 0,
    metadata: { badge: "Best value" },
  },
  {
    slug: "track-system-design",
    title: "System Design Track",
    description: "Unlock all system design simulations and future design content.",
    kind: "track",
    trackKey: TRACK_KEYS.SYSTEM_DESIGN,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 2,
    displayOrder: 10,
    metadata: {},
  },
  {
    slug: "track-frontend",
    title: "Frontend Track",
    description: "Unlock all frontend debugging and browser sandbox simulations.",
    kind: "track",
    trackKey: TRACK_KEYS.FRONTEND,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 2,
    displayOrder: 20,
    metadata: {},
  },
  {
    slug: "track-backend",
    title: "Backend Track",
    description: "Unlock backend, API, and production engineering simulations.",
    kind: "track",
    trackKey: TRACK_KEYS.BACKEND,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 2,
    displayOrder: 30,
    metadata: {},
  },
  {
    slug: "track-soa-os",
    title: "SOA & OS Track",
    description: "Premium SOA, operating systems, and distributed systems content.",
    kind: "track",
    trackKey: TRACK_KEYS.SOA_OS,
    active: false,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 2,
    displayOrder: 40,
    metadata: {},
  },
  {
    slug: "track-dsa",
    title: "DSA Arena",
    description: "Unlock advanced DSA arena, dynamic programming, trees, and graphs.",
    kind: "track",
    trackKey: TRACK_KEYS.DSA,
    active: true,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 0,
    displayOrder: 50,
    metadata: {},
  },
  {
    slug: "track-linux",
    title: "Linux Track",
    description: "Unlock process basics, shell scripting, process sandboxing, and Linux labs.",
    kind: "track",
    trackKey: TRACK_KEYS.LINUX,
    active: true,
    priceInrPaise: 19900,
    priceUsdCents: 400,
    freeItemQuota: 0,
    displayOrder: 60,
    metadata: {},
  },
  {
    slug: "track-enum-test",
    title: "Enum Test",
    description: "Test track priced at 1 Rupee.",
    kind: "track",
    trackKey: TRACK_KEYS.ENUM_TEST,
    active: true,
    priceInrPaise: 100,
    priceUsdCents: 10,
    freeItemQuota: 0,
    displayOrder: 70,
    metadata: {},
  },
];

export const ACTIVE_TRACK_KEYS = [
  TRACK_KEYS.SYSTEM_DESIGN,
  TRACK_KEYS.FRONTEND,
  TRACK_KEYS.BACKEND,
  TRACK_KEYS.LINUX,
  TRACK_KEYS.DSA,
  TRACK_KEYS.ENUM_TEST,
];

const now = () => new Date();

export function normalizeCurrency(value) {
  const currency = String(value || "INR").trim().toUpperCase();
  return currency === "USD" ? "USD" : "INR";
}

export function amountForCurrency(product, currency) {
  return normalizeCurrency(currency) === "USD"
    ? product.priceUsdCents
    : product.priceInrPaise;
}

export function simulationCategoryToTrackKey(category) {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "frontend") return TRACK_KEYS.FRONTEND;
  if (normalized === "backend" || normalized === "fullstack" || normalized === "devops") {
    return TRACK_KEYS.BACKEND;
  }
  return normalized || TRACK_KEYS.BACKEND;
}

export async function ensureDefaultPremiumProducts() {
  await Promise.all(
    DEFAULT_PREMIUM_PRODUCTS.map((product) =>
      prisma.premiumProduct.upsert({
        where: { slug: product.slug },
        create: {
          active: product.active ?? true,
          ...product,
          metadata: product.metadata || {},
        },
        update: {
          title: product.title,
          description: product.description,
          priceInrPaise: product.priceInrPaise,
          priceUsdCents: product.priceUsdCents,
          trackKey: product.trackKey,
          displayOrder: product.displayOrder,
          active: product.active ?? true,
          metadata: product.metadata || {},
        },
      }),
    ),
  );
}

export async function listPremiumProducts({ includeInactive = false } = {}) {
  await ensureDefaultPremiumProducts();
  return prisma.premiumProduct.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function getProductBySlug(slug, { includeInactive = false } = {}) {
  await ensureDefaultPremiumProducts();
  const product = await prisma.premiumProduct.findUnique({ where: { slug } });
  if (!product || (!includeInactive && !product.active)) return null;
  return product;
}

export async function getUserEntitlements(userId) {
  if (!userId) return [];
  return prisma.userEntitlement.findMany({
    where: {
      userId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now() } }],
    },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });
}

export function summarizeEntitlements(entitlements = []) {
  const active = entitlements.filter(
    (entry) => entry.active && (!entry.expiresAt || entry.expiresAt > now()),
  );
  const isPro = active.some((entry) => entry.scope === "full_pro");
  const tracks = new Set();

  if (isPro) {
    ACTIVE_TRACK_KEYS.forEach((track) => tracks.add(track));
  }

  active.forEach((entry) => {
    if (entry.scope === "track" && entry.trackKey) tracks.add(entry.trackKey);
  });

  return {
    isPro,
    tracks: [...tracks],
    entitlements: active,
  };
}

export async function getUserAccessSummary(userId) {
  const entitlements = await getUserEntitlements(userId);
  return summarizeEntitlements(entitlements);
}

export function hasTrackAccessFromSummary(summary, trackKey) {
  if (!trackKey) return true;
  if (trackKey === TRACK_KEYS.DSA || trackKey === TRACK_KEYS.LINUX) return true;
  return Boolean(summary?.isPro || summary?.tracks?.includes(trackKey));
}

export async function hasTrackAccess(userId, trackKey) {
  const summary = await getUserAccessSummary(userId);
  return hasTrackAccessFromSummary(summary, trackKey);
}

export async function grantProductEntitlement({
  userId,
  product,
  source = "purchase",
  paymentOrderId = null,
  notes = "",
  client = prisma,
}) {
  const scope = product.kind === "full_pro" ? "full_pro" : "track";
  const trackKey = scope === "full_pro" ? "" : product.trackKey;

  return client.userEntitlement.upsert({
    where: {
      userId_scope_trackKey: {
        userId,
        scope,
        trackKey,
      },
    },
    create: {
      userId,
      productId: product.id,
      scope,
      trackKey,
      source,
      paymentOrderId,
      notes,
      active: true,
    },
    update: {
      productId: product.id,
      source,
      paymentOrderId,
      notes,
      active: true,
      expiresAt: null,
    },
  });
}

export async function revokeEntitlement(entitlementId) {
  return prisma.userEntitlement.update({
    where: { id: entitlementId },
    data: { active: false },
  });
}

export async function getTrackProductMap({ includeInactive = false } = {}) {
  const products = await listPremiumProducts({ includeInactive });
  return Object.fromEntries(
    products
      .filter((product) => product.kind === "track" && product.trackKey)
      .map((product) => [product.trackKey, product]),
  );
}

export async function decorateItemsWithAccess({
  items,
  userId,
  trackKey,
  freeItemQuota,
  product,
}) {
  const summary = await getUserAccessSummary(userId);
  const unlocked = hasTrackAccessFromSummary(summary, trackKey);
  const quota = Number.isFinite(freeItemQuota) ? freeItemQuota : product?.freeItemQuota ?? 0;

  return items.map((item, index) => {
    const freeIndex = index + 1;
    const isFree = freeIndex <= quota;
    const locked = !unlocked && !isFree;

    return {
      ...item,
      access: {
        locked,
        isFree,
        freeIndex,
        freeItemQuota: quota,
        trackKey,
        productSlug: product?.slug || "",
        reason: locked ? "Upgrade to unlock this premium track." : "",
      },
    };
  });
}

export async function assertTrackAccess({ userId, trackKey, itemIndex = 0, product = null }) {
  const summary = await getUserAccessSummary(userId);
  if (hasTrackAccessFromSummary(summary, trackKey)) return true;
  if (itemIndex >= 0 && product && itemIndex < product.freeItemQuota) return true;
  return false;
}
