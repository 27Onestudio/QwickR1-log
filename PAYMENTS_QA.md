# QwickR1 direct UPI flow — QA checklist

## Automated checks

- [x] VPA format is checked in both the Settings form and protected server mutation.
- [x] Exact print amount uses the shop’s active page rate × validated PDF page count × copies, calculated in integer paise and stored as two-decimal INR.
- [x] Payment URI includes `pa`, encoded `pn`, two-decimal `am`, `cu=INR`, and `tn=QwickR1-{six-character pickup code}`.
- [x] Missing/invalid amount, VPA, or pickup code blocks URI creation.
- [x] Customer payment requests are token-scoped; only a SHA-256 token hash is stored and `paymentLinkLogs.vpaUsed` records the VPA server-side.
- [x] UTR is optional and, when present, must be four digits; the server also requires a generated/audited payment link before a customer can report UPI Sent.
- [x] Shop payment-confirmation endpoints require shop-owner authentication.
- [x] `Print Done` is a separate action and is rejected by the server until that shop has retrieved/opened the job.

## Manual acceptance checklist

1. **Invalid VPA:** In Settings try `not-a-vpa`; expect an inline error and no saved value. Save `name@okaxis` with the owner-confirmation checkbox; the app labels it owner-confirmed but does not claim bank verification.
2. **Missing/incorrect amount:** Inspect server helper tests; try an active price and job whose multiplication is zero/missing/invalid; expect no payment link. A normal total should be formatted like `24.00`.
3. **Missing pickup code:** Request a payment link for a job without a six-character pickup code; expect a server-side refusal. Generated notes should be `QwickR1-A7B9C2` format.
4. **Customer UPI link:** Upload once, continue to the payment page, choose UPI, and tap **Pay via UPI (GPay / PhonePe / Paytm)** on a phone. Confirm the opened app URI points directly to the shop’s owner-entered VPA, exact INR amount, and pickup-code note.
5. **Desktop QR:** On desktop/tablet choose UPI and request the link. Confirm a conventional black-on-white QR is shown and scans to the same UPI URI.
6. **Optional UTR:** Submit Payment Done without a UTR; confirm it is allowed. Enter three/five digits; confirm validation. Enter four digits; confirm the shop queue shows `UPI Sent · UTR: 1234`.
7. **Operator payment confirmation:** In the authenticated shop job view/queue, confirm UPI sent. The badge changes to `Paid via UPI ✓`; the customer sees only that the counter confirmed payment, never a customer-side `Payment Verified` state.
8. **Paid vs printed:** Confirm payment without marking the job done. `Print Done` remains a separate shop action. A fresh, unretrieved job must not be markable as Print Done.
9. **Customer return / duplicate protection:** Re-open the same `/payment/{accessToken}` link after leaving the UPI app. It must load the existing job/payment state and must not call upload or create a second job.
10. **Cash at counter:** Select Pay at counter; expect no UPI URI/QR and an unpaid badge until the operator uses Mark as Paid.
