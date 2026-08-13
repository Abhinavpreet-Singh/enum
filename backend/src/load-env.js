import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load backend/.env before any other module reads process.env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
