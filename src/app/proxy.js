const LOCAL_PROXY = "http://localhost:8000";
const REMOTE_PROXY = "https://enum-backend-hi2n9.ondigitalocean.app";

const isVercelProduction = process.env.VERCEL_ENV === "production";
const isNodeProduction = process.env.NODE_ENV === "production";
const isProductionRuntime = isVercelProduction || isNodeProduction;

const configuredProxy = process.env.NEXT_PUBLIC_API_BASE_URL;

// In local development, default to the local backend unless an explicit API URL is set.
// Production keeps the remote default so deployed builds do not accidentally point at localhost.
const proxy = (
  isProductionRuntime
    ? configuredProxy || REMOTE_PROXY
    : configuredProxy || LOCAL_PROXY
).replace(/\/$/, "");

console.log("API Proxy:", proxy);

export { proxy };
