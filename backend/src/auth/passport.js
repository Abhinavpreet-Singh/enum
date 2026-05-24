import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GithubStrategy } from "passport-github2";

import { env, requireEnv } from "../config/env.js";
import { findOrCreateOAuthUser } from "./oauthUser.service.js";

const getBackendUrl = () =>
  process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || null;

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  const backendUrl = getBackendUrl();
  const callbackUrl =
    env.GOOGLE_CALLBACK_URL || (backendUrl ? `${backendUrl}/auth/google/callback` : null);

  if (!callbackUrl) {
    // Don't crash deploy if callback URL isn't configured yet.
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] GOOGLE_CALLBACK_URL not set and BACKEND_URL/RENDER_EXTERNAL_URL missing; skipping Google OAuth strategy registration",
    );
  } else {
    passport.use(
      new GoogleStrategy(
        {
          clientID: requireEnv("GOOGLE_CLIENT_ID"),
          clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
          callbackURL: callbackUrl,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
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
            return done(err);
          }
        },
      ),
    );
  }
}

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  const backendUrl = getBackendUrl();
  const callbackUrl =
    env.GITHUB_CALLBACK_URL || (backendUrl ? `${backendUrl}/auth/github/callback` : null);

  if (!callbackUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] GITHUB_CALLBACK_URL not set and BACKEND_URL/RENDER_EXTERNAL_URL missing; skipping GitHub OAuth strategy registration",
    );
  } else {
    passport.use(
      new GithubStrategy(
        {
          clientID: requireEnv("GITHUB_CLIENT_ID"),
          clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
          callbackURL: callbackUrl,
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
}

export default passport;
