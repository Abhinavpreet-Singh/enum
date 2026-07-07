const OBJECT_ID_RE = /^[a-f\d]{24}$/i;
const CUID_RE = /^c[a-z0-9]{20,32}$/i;

/** Accept legacy MongoDB ObjectIds and Prisma cuid() values. */
export function isValidId(value) {
  const id = String(value || "").trim();
  if (!id) return false;
  return OBJECT_ID_RE.test(id) || CUID_RE.test(id);
}

/** @deprecated Use isValidId — kept as alias for gradual migration. */
export const isValidObjectId = isValidId;
