import { describe, expect, it } from "vitest";
import { translate, type Language } from "./i18n";

const languages: Language[] = ["en", "hi", "mr"];
const aboutCopy = `About 27One Studio

27One Studio is a small, independent technology and creative studio built around one simple belief: meaningful progress begins with one useful idea and grows through consistent improvement.

The name 27One is inspired by Euler’s number e≈2.71828, a mathematical constant closely associated with continuous growth and change. For us, it represents the way ideas evolve—through research, experimentation, building, feedback, and iteration.

We create digital products, services, content, and practical systems that aim to be genuinely useful—not merely impressive or mass-produced. We work across technology, creative communication, research, and problem-solving, using modern tools, including AI, while keeping human judgment, originality, and usefulness at the centre.

We are still growing, but our direction is clear: start with one meaningful problem, build carefully, learn openly, and keep improving.`;

describe("localized About and legal copy", () => {
  it.each(languages)("keeps the supplied About 27One Studio story in %s", language => {
    expect(translate(language, "aboutCopy")).toBe(aboutCopy);
    expect(translate(language, "aboutHeading")).toBe("About 27One Studio");
  });

  it.each(languages)("discloses current retention and support limitations in %s", language => {
    expect(translate(language, "term5")).toBeTruthy();
    expect(translate(language, "retentionCopy")).toBeTruthy();
    expect(translate(language, "contactCopy")).toBeTruthy();
    expect(translate(language, "supportStoredNotice")).toBeTruthy();
  });

  it("keeps common print-shop navigation terms in English in Hindi and Marathi", () => {
    for (const language of ["hi", "mr"] as const) {
      expect(translate(language, "pricing")).toBe("Pricing");
      expect(translate(language, "support")).toBe("Support");
      expect(translate(language, "feedback")).toContain("Ratings");
    }
  });

  it("keeps the poster's exact six-digit fallback prompt and three instructions in every language", () => {
    for (const language of languages) {
      expect(translate(language, "showCodeAtCounter")).toBe("Having trouble scanning? Type this 6-digit code:");
      expect(translate(language, "posterStep1Title")).toBeTruthy();
      expect(translate(language, "posterStep2Title")).toBeTruthy();
      expect(translate(language, "posterStep3Title")).toBeTruthy();
    }
  });
});
