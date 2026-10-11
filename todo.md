# QwickR1-Log — Completion Checklist

## Delivered MVP

- [x] Shopkeeper account sign-in using the scaffold’s Manus OAuth.
- [x] Shop profile with editable name, phone, and address, plus an assigned six-digit customer code.
- [x] English, Hindi, and Marathi interface; common Mumbai print-shop terms such as **Print**, **Support**, and **Ratings** remain in English. All three translation dictionaries have matching keys.
- [x] Editable, per-page Black & white / Colour rates for A4 and A3.
- [x] Rate rows start blank and inactive; a shopkeeper must set a positive price before activating a print service.
- [x] Customers can only choose a shop’s active, priced print services.
- [x] A4 physical-counter QR poster with shop identity, high-contrast code, exact six-digit fallback prompt and code, three instruction cards, and Print A4 Poster control.
- [x] Customer upload through QR or manual shop code; PDF, JPG, and PNG files are accepted up to 15 MB.
- [x] Private file storage, generated retrieval codes, preview, print-job details including PDF page count, and job statuses through **Ready for pickup**.
- [x] Shop settings and About Us, Terms, and Privacy pages, with legal/settings links under the profile menu.
- [x] Simplified navigation to Retrieve file, Jobs, Pricing, and QR Poster; removed Ratings and Support from the UI.
- [x] One language selector per screen; profile menu exposes Settings, About Us, Terms, Privacy, and Sign out.
- [x] Loading, error/retry, empty, success, and input-validation states.
- [x] Responsive desktop/mobile layout and preview checks.
- [x] `pnpm check`, `pnpm test` (26 passed), and `pnpm build` all passed.
- [x] Final development preview and project checkpoint verified.

## Scope decisions — current limitations are documented in the UI

- [x] **Support delivery:** Standalone Support navigation/form are hidden for the simpler start; no support-team inbox or email delivery is configured.
- [x] **Ratings:** The Ratings page and navigation are removed from the starter UI; a ratings integration can be added when wanted.
- [x] **File retention:** Automatic expiry and self-service deletion are not configured. The Privacy page discloses this; no arbitrary deletion policy was imposed.
- [x] **Production deployment:** Not requested. This delivery is the running WebDev preview; public production hosting/domain remains a separate deployment choice.

## PDF-reference revision (2026-09-27)

- [x] Restyled the authenticated landing/shell to match the supplied PDF: ink-navy categorized sidebar, clean utility bar, indigo private job lookup, empty-file state, and recent-jobs preview.
- [x] Replaced About Us with the supplied full 27One Studio story and its Euler-number explanation.
- [x] Rebuilt Terms and Conditions and Privacy Policy as readable document pages; the wording explicitly describes the current MVP’s file-retention and Support-notification limits.
- [x] Kept shared print-shop terms recognizable in English across Hindi and Marathi.
- [x] Added and ran unit tests for the supplied About copy and cross-language legal disclosures.
- [x] Rechecked desktop and 390px mobile previews; ran `pnpm check`, `pnpm test` (26 passed), and `pnpm build` successfully.

## Simplification update (2026-10-10)

- [x] Removed Ratings and Support from the starter navigation and hid their standalone pages to keep the first-use UI focused.
- [x] Put Settings, About Us, Terms and Conditions, and Privacy Policy in the Profile dropdown, with Sign out available there too.
- [x] Kept one language selector in the header; removed the duplicate selector from the sidebar. On mobile, the profile trigger moves to the header.
- [x] Checked desktop/mobile previews; `pnpm check`, `pnpm test` (26 passed), and `pnpm build` pass.

## Direct UPI flow update (2026-10-11)

- [x] Added owner-entered shop VPA with format validation and explicit shop-owner attestation. The UI states that QwickR1 does **not** bank-verify VPA ownership.
- [x] Snapshot the exact amount on upload from active per-page service rate × PDF page count (images count as one page) × copies; server calculates in paise.
- [x] Every new job gets a unique six-character pickup code and random customer return token; only the token hash is stored.
- [x] Customer can choose Cash at counter or direct UPI. Mobile opens a standard UPI URI; desktop/tablet show a high-contrast QR. The required `QwickR1-{pickupCode}` note is embedded; links are audit-logged with VPA, amount, and pickup code.
- [x] Customer can report UPI Sent with optional four-digit UTR suffix only after a link was generated. No payment is marked paid automatically.
- [x] Shop has separate Mark as Paid / Confirm Received actions and a separate Print Done action; server requires the job be retrieved before Print Done.
- [x] Added server validation tests for VPA, amount, URI, pickup code, token hashing, UTR, and owner-only confirmation; `PAYMENTS_QA.md` lists the manual acceptance checks.
- [x] Legal Terms/Privacy and English/Hindi/Marathi UI updated; one language selector retained; flat-colour treatment.

## QR poster reference update (2026-10-11)

- [x] Restyled the poster to follow the supplied physical-shop A4 reference: official counter badge, shop name/address, bold handoff title, QR quiet-zone, three numbered steps, privacy note, and QwickR1 · 27One Studio footer.
- [x] Printed the requested exact line — **“Having trouble scanning? Type this 6-digit code:”** — with the shop’s actual six-digit code immediately underneath; the prompt stays in English in every UI language.
- [x] Added **Test customer flow** and **Print A4 Poster** actions; updated print-safe sizing for the one-page layout.
- [x] Verified desktop and mobile screenshots; `pnpm check`, `pnpm test` (26 passed), and `pnpm build` pass.
