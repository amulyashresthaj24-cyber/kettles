import { describe, expect, it } from "vitest";
import {
  canonicalLogoPath,
  isDisplayableLogoUrl,
  isProjectLogoPath,
  projectLogoObjectPath,
  validateLogoInput,
} from "./project-logo";

const USER = "11111111-1111-4111-8111-111111111111";
const PROJECT = "22222222-2222-4222-8222-222222222222";

describe("project logo paths", () => {
  it("builds a lowercase object path under the user folder", () => {
    expect(projectLogoObjectPath(USER.toUpperCase(), PROJECT, "webp")).toBe(
      `${USER}/${PROJECT}.webp`
    );
  });

  it("accepts a path owned by the user", () => {
    const path = projectLogoObjectPath(USER, PROJECT, "png");
    expect(isProjectLogoPath(path, USER)).toBe(true);
    expect(canonicalLogoPath(path, USER)).toBe(path);
  });

  it("rejects another user's path, traversal, and remote urls", () => {
    const foreign = projectLogoObjectPath(
      "33333333-3333-4333-8333-333333333333",
      PROJECT,
      "webp"
    );
    expect(isProjectLogoPath(foreign, USER)).toBe(false);
    expect(canonicalLogoPath(foreign, USER)).toBeNull();
    expect(isProjectLogoPath(`${USER}/../${PROJECT}.webp`, USER)).toBe(false);
    expect(isProjectLogoPath("https://example.com/logo.webp")).toBe(false);
    expect(isProjectLogoPath(`${USER}/${PROJECT}.svg`, USER)).toBe(false);
  });
});

describe("logo file validation", () => {
  it("accepts png, jpeg, webp, and svg under 2 MB", () => {
    expect(validateLogoInput({ type: "image/png", size: 1200, name: "a.png" })).toBeNull();
    expect(validateLogoInput({ type: "", size: 1200, name: "mark.SVG" })).toBeNull();
    expect(validateLogoInput({ type: "image/jpeg", size: 50, name: "a.jpg" })).toBeNull();
  });

  it("rejects other types, empty files, and oversized files", () => {
    expect(validateLogoInput({ type: "image/gif", size: 100, name: "a.gif" })).toMatch(/PNG/);
    expect(validateLogoInput({ type: "image/png", size: 0, name: "a.png" })).toMatch(/empty/);
    expect(validateLogoInput({ type: "image/png", size: 3 * 1024 * 1024, name: "a.png" })).toMatch(
      /2 MB/
    );
  });
});

describe("displayable logo urls", () => {
  it("allows https and local http, and rejects everything else", () => {
    expect(isDisplayableLogoUrl("https://cdn.example.com/logo.webp?token=1")).toBe(true);
    expect(isDisplayableLogoUrl("http://127.0.0.1:54321/storage/v1/object/sign/x")).toBe(true);
    expect(isDisplayableLogoUrl("http://example.com/logo.png")).toBe(false);
    expect(isDisplayableLogoUrl("javascript:alert(1)")).toBe(false);
    expect(isDisplayableLogoUrl("data:image/png;base64,aaaa")).toBe(false);
  });
});
