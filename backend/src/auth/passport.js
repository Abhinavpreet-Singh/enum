import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GithubStrategy } from "passport-github2";

import { env, requireEnv } from "../config/env.js";
import { findOrCreateOAuthUser } from "./oauthUser.service.js";

// Strategies use normalized callback URLs from env.js (no trailing / , no // paths).
// Google Cloud / GitHub must list the exact same callback URL.

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    "[auth] Google OAuth is not fully configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the backend.",
  );
} else {
  console.log(
    "[auth] Registering Google OAuth strategy with callback URL:",
    env.GOOGLE_CALLBACK_URL,
  );
  passport.use(
    new GoogleStrategy(
      {
        clientID: requireEnv("GOOGLE_CLIENT_ID"),
        clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          console.log(
            "[auth] Google strategy callback received for user:",
            profile?.displayName,
          );
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

if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
  console.warn(
    "[auth] GitHub OAuth is not fully configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the backend.",
  );
} else {
  console.log(
    "[auth] Registering GitHub OAuth strategy with callback URL:",
    env.GITHUB_CALLBACK_URL,
  );
  passport.use(
    new GithubStrategy(
      {
        clientID: requireEnv("GITHUB_CLIENT_ID"),
        clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
        callbackURL: env.GITHUB_CALLBACK_URL,
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
