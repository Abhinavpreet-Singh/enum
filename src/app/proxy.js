const LOCAL_PROXY = "http://localhost:8000";
const REMOTE_PROXY = "https://enum-backend.onrender.com";

const configuredProxy = process.env.NEXT_PUBLIC_API_BASE_URL || REMOTE_PROXY;
const useLocalPath = process.env.NEXT_PUBLIC_USE_LOCAL_API === "true";

const proxy = (useLocalPath ? LOCAL_PROXY : configuredProxy).replace(/\/$/, "");

export { proxy };
