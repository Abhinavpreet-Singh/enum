import jwt from "jsonwebtoken";
import { requireEnv } from "../config/env.js";

export const generateToken = ({ userId, email }) => {
  const secret = requireEnv("JWT_SECRET");

  return jwt.sign(
    {
      userId,
      email,
    },
    secret,
    { expiresIn: "7d" },
  );
};
