const LOCAL_PROXY = "http://localhost:8000";
const REMOTE_PROXY = "https://enum-backend-hi2n9.ondigitalocean.app";

const isVercelProduction = process.env.VERCEL_ENV === "production";
const isNodeProduction = process.env.NODE_ENV === "production";
const isProductionRuntime = isVercelProduction || isNodeProduction;

// Only use local proxy if explicitly enabled AND not in production
const shouldUseLocal =
	process.env.NEXT_PUBLIC_USE_LOCAL_API === "true" &&
	!isProductionRuntime;

// Always prefer explicitly configured API base URL, or fallback to remote
const configuredProxy = process.env.NEXT_PUBLIC_API_BASE_URL || REMOTE_PROXY;
const proxy = (shouldUseLocal ? LOCAL_PROXY : configuredProxy).replace(/\/$/, "");

console.log("API Proxy:", proxy);

export { proxy };
