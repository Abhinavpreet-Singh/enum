const LOCAL_PROXY = "http://localhost:8000";

const isProductionRuntime = process.env.NODE_ENV === "production";
const configuredProxy = process.env.NEXT_PUBLIC_API_BASE_URL;

const proxy = (
  configuredProxy || (isProductionRuntime ? "" : LOCAL_PROXY)
).replace(/\/$/, "");

if (!proxy && isProductionRuntime) {
  console.warn(
    "NEXT_PUBLIC_API_BASE_URL is not set; API requests will fail in production.",
  );
}

console.log("API Proxy:", proxy || "(not configured)");

export { proxy };
