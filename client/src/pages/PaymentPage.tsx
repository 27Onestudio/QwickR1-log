import { useMemo, useState } from "react";
import { useRoute, Link } from "wouter";
import { AlertCircle, ArrowLeft, Check, Clock3, FileText, Loader2, LockKeyhole, Smartphone, Store } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguagePicker } from "@/components/LanguagePicker";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/i18n";

function Brand() {
  return <div className="brand-lockup" aria-label="QwickR1"><span className="brand-q">Q</span><span>wickR1</span></div>;
}

export default function PaymentPage() {
  const [, params] = useRoute("/payment/:accessToken");
  const token = params?.accessToken ?? "";
  const validToken = /^[a-f0-9]{64}$/.test(token);
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const [last4, setLast4] = useState("");
  const [error, setError] = useState("");
  const [upiUri, setUpiUri] = useState("");
  const info = trpc.customer.paymentInfo.useQuery({ accessToken: token }, { enabled: validToken, retry: false });
  const choose = trpc.customer.selectPaymentMethod.useMutation({
    onSuccess: () => { setError(""); setUpiUri(""); void utils.customer.paymentInfo.invalidate({ accessToken: token }); },
    onError: () => setError(t("paymentTryAgain")),
  });
  const createLink = trpc.customer.paymentLink.useMutation({
    onSuccess: result => {
      setUpiUri(result.uri);
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) window.location.href = result.uri;
    },
    onError: () => setError(t("paymentTryAgain")),
  });
  const reportSent = trpc.customer.reportUpiSent.useMutation({
    onSuccess: () => { setError(""); void utils.customer.paymentInfo.invalidate({ accessToken: token }); },
    onError: () => setError(t("paymentTryAgain")),
  });
  const job = info.data;
  const isWaiting = job?.paymentStatus === "upi_sent";
  const isPaid = job?.paymentStatus === "paid";
  const busy = choose.isPending || createLink.isPending || reportSent.isPending;
  const total = useMemo(() => `₹${job?.amount ?? "0.00"}`, [job?.amount]);

  function markSent() {
    setError("");
    if (last4 && !/^\d{4}$/.test(last4)) { setError(t("utrInvalid")); return; }
    reportSent.mutate({ accessToken: token, last4: last4 || null });
  }

  return <main className="customer-page payment-page">
    <header className="customer-topbar"><Link href="/" className="customer-brand"><Brand /></Link><LanguagePicker /></header>
    <div className="customer-content">
      <div className="customer-back"><Link href="/send"><ArrowLeft size={15} />{t("goBack")}</Link></div>
      {!validToken ? <section className="customer-card customer-state"><AlertCircle size={24} /><h1>{t("paymentPageUnavailable")}</h1></section>
        : info.isLoading ? <section className="customer-card customer-state"><Loader2 size={22} className="spin" /><span>{t("loading")}</span></section>
        : info.isError || !job ? <section className="customer-card customer-state"><AlertCircle size={24} /><h1>{t("paymentPageUnavailable")}</h1></section>
        : <section className="customer-card payment-card">
          <div className="customer-shop-line"><span className="shop-avatar"><Store size={16} /></span><div><small>{t("payAtShop")}</small><strong>{job.shopName}</strong></div></div>
          <p className="eyebrow">QWICKR1 · {t("payment")}</p>
          <h1>{t("jobReadyForPayment")}</h1>
          <div className="payment-job-summary"><FileText size={17} /><span><strong>{job.fileName}</strong><small>{t("customerCode")}: {job.customerCode}</small></span></div>
          <div className="payment-amount"><span>{t("printAmount")}</span><strong>{total}</strong></div>
          <p className="payment-note"><LockKeyhole size={14} />{t("directPaymentNote")}</p>

          {isPaid ? <div className="payment-awaiting"><Check size={17} /><span>{t("counterConfirmedNote")}</span></div> : isWaiting ? <div className="payment-awaiting"><Clock3 size={17} /><span>{t("paymentSentWait")}</span></div> : <>
            <h2 className="customer-section-title">{t("choosePaymentMethod")}</h2>
            <div className="payment-choice-row">
              <Button type="button" variant={job.paymentMethod === "upi" ? "default" : "outline"} disabled={busy || !job.upiAvailable} onClick={() => choose.mutate({ accessToken: token, method: "upi" })}>{t("upiShort")}</Button>
              <Button type="button" variant={job.paymentMethod === "cash" ? "default" : "outline"} disabled={busy} onClick={() => choose.mutate({ accessToken: token, method: "cash" })}>{t("payAtCounter")}</Button>
            </div>
            {!job.upiAvailable && <p className="form-hint">{t("upiNotAvailable")}</p>}
            {job.paymentMethod === "upi" && job.upiAvailable ? <div className="upi-pay-area">
              <Button type="button" className="action-button upi-pay-button" onClick={() => { setError(""); createLink.mutate({ accessToken: token }); }} disabled={busy}>
                {createLink.isPending ? <Loader2 className="spin" size={16} /> : <Smartphone size={16} />}
                {t("payViaUpi")}
              </Button>
              {upiUri && <div className="upi-qr-panel"><p>{t("scanToPay")}</p><div className="upi-qr"><QRCodeSVG value={upiUri} size={210} level="M" marginSize={4} bgColor="#ffffff" fgColor="#111111" /></div><a className="upi-deep-link" href={upiUri}>{t("openUpiApp")}</a></div>}
              <div className="payment-return-form"><p className="payment-sent-prompt">{t("paymentSentWait")}</p><div className="form-field"><Label htmlFor="utr-last4">{t("utrLast4Optional")}</Label><Input id="utr-last4" value={last4} onChange={event => setLast4(event.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" maxLength={4} placeholder="1234" /></div><Button type="button" variant="outline" onClick={markSent} disabled={busy}>{reportSent.isPending && <Loader2 className="spin" size={15} />}{t("paymentDone")}</Button></div>
            </div> : <div className="counter-pay-note"><Store size={16} /><span>{t("counterPaymentHelp")}</span></div>}
          </>}

          <p className="payment-confirmation-copy">{t("operatorConfirmsPayment")}</p>
          {error && <p className="inline-error"><AlertCircle size={15} />{error}</p>}
          <p className="payment-pickup"><span>{t("pickupCode")}</span><strong>{job.pickupCode}</strong></p>
          <p className="customer-code-note">{t("keepPickupCode")}</p>
        </section>}
    </div>
    <footer className="customer-footer">QwickR1 · UPI / Cash · {t("paymentDirectFooter")}</footer>
  </main>;
}
