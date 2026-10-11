import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QRCodeSVG } from "qrcode.react";

const uri = "upi://pay?pa=shivam%40okaxis&pn=Print+Shop&am=24.00&cu=INR&tn=QwickR1-A7B9C2";

describe("customer desktop UPI QR", () => {
  it("renders a conventional high-contrast QR SVG around the standard UPI URI", () => {
    const markup = renderToStaticMarkup(React.createElement(QRCodeSVG, {
      value: uri, size: 210, level: "M", marginSize: 4, bgColor: "#ffffff", fgColor: "#111111",
    }));
    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup).toContain("#ffffff");
    expect(markup).toContain("#111111");
    expect(markup).toContain("<path");
  });
});
