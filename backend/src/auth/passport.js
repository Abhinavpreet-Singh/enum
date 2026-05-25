import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GithubStrategy } from "passport-github2";

import { env, requireEnv } from "../config/env.js";
import { findOrCreateOAuthUser } from "./oauthUser.service.js";

// Google strategy must use the exact callback URL configured in GOOGLE_CALLBACK_URL.
// This prevents redirect_uri_mismatch errors and ensures the backend callback route
// matches the OAuth client settings in Google Cloud Console.
const googleCallbackUrl = env.GOOGLE_CALLBACK_URL;

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !googleCallbackUrl) {
  // Don't crash deploy if OAuth is not configured, but log clearly.
  // In production, these values should be set exactly to avoid redirect_uri_mismatch.
  // Example callback: https://your-backend.com/api/auth/google/callback
  // See backend/.env.example for expected settings.
  console.warn(
    "[auth] Google OAuth is not fully configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL.",
  );
} else {
  console.log("[auth] Registering Google OAuth strategy with callback URL:", googleCallbackUrl);
  passport.use(
    new GoogleStrategy(
      {
        clientID: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
        callbackURL: requireEnv("GOOGLE_CALLBACK_URL"),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          console.log("[auth] Google strategy callback received for user:", profile?.displayName);
          const email = profile?.emails?.[0]?.value;
          const displayName = profile?.displayName;
          const avatar = profile?.photos?.[0]?.value;

          const user = await findOrCreateOAuthUser({
            email,
            displayName,
            provider: "google",
            avatar,
          });

          return done(null, user);
        } catch (err) {
          console.error("[auth] Google strategy error:", err);
          return done(err);
        }
      },
    ),
  );
}

// GitHub strategy also uses an explicit callback URL from the environment.
if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.GITHUB_CALLBACK_URL) {
  console.warn(
    "[auth] GitHub OAuth is not fully configured. Set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL.",
  );
} else {
  passport.use(
    new GithubStrategy(
      {
        clientID: requireEnv("GITHUB_CLIENT_ID"),
        clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
        callbackURL: requireEnv("GITHUB_CALLBACK_URL"),
        scope: ["user:email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile?.emails?.[0]?.value || profile?._json?.email;
          if (!email) {
            const error = new Error(
              "GitHub OAuth did not return an email address. Please make your email public on GitHub or use email/password login.",
            );
            error.statusCode = 400;
            return done(error);
          }
          const displayName = profile?.displayName || profile?.username;
          const avatar = profile?.photos?.[0]?.value;

          const user = await findOrCreateOAuthUser({
            email,
            displayName,
            provider: "github",
            avatar,
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

export default passport;
