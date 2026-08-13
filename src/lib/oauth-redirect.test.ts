import { describe, expect, it } from "vitest";
import { buildOAuthRedirectTo, GOOGLE_SIGNIN_SCOPES } from "./supabase";

const SITE = "https://www.kettles.works";

describe("buildOAuthRedirectTo", () => {
  it("keeps the current public origin so the PKCE verifier stays on the same host", () => {
    expect(buildOAuthRedirectTo("https://kettles.works", SITE)).toBe(
      "https://kettles.works/auth/callback"
    );
    expect(buildOAuthRedirectTo("https://www.kettles.works", SITE)).toBe(
      "https://www.kettles.works/auth/callback"
    );
  });

  it("keeps localhost for local web sign-in", () => {
    expect(buildOAuthRedirectTo("http://localhost:3000", SITE)).toBe(
      "http://localhost:3000/auth/callback"
    );
    expect(buildOAuthRedirectTo("http://127.0.0.1:3000", SITE)).toBe(
      "http://127.0.0.1:3000/auth/callback"
    );
  });

  it("does not send Tauri or other private origins to Google", () => {
    expect(buildOAuthRedirectTo("http://tauri.localhost", SITE)).toBe(
      "https://www.kettles.works/auth/callback"
    );
    expect(buildOAuthRedirectTo("https://app.localhost", SITE)).toBe(
      "https://www.kettles.works/auth/callback"
    );
    expect(buildOAuthRedirectTo(undefined, SITE)).toBe(
      "https://www.kettles.works/auth/callback"
    );
  });

  it("strips a trailing slash on the origin", () => {
    expect(buildOAuthRedirectTo("https://kettles.works/", SITE)).toBe(
      "https://kettles.works/auth/callback"
    );
  });
});

describe("GOOGLE_SIGNIN_SCOPES", () => {
  it("requests only sign-in scopes, never Calendar", () => {
    expect(GOOGLE_SIGNIN_SCOPES).toBe("openid email profile");
    expect(GOOGLE_SIGNIN_SCOPES).not.toMatch(/calendar/i);
  });
});
