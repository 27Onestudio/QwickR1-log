import { describe, expect, it } from "vitest";
import { primaryLinks, profileLinks } from "./navigation";

describe("simplified app navigation", () => {
  it("shows only the four core print-shop tasks as primary navigation", () => {
    expect(primaryLinks.map(link => link.path)).toEqual(["/", "/jobs", "/pricing", "/poster"]);
    expect(primaryLinks.map(link => link.key)).toEqual(["retrieveFile", "jobs", "pricing", "qrPoster"]);
  });

  it("places settings and policy pages behind the profile menu", () => {
    expect(profileLinks.map(link => link.path)).toEqual(["/settings", "/about", "/terms", "/privacy"]);
  });
});
