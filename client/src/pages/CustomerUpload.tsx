import { useEffect, useRef, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { AlertCircle, ArrowLeft, Check, FileImage, FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/i18n";
import { LanguagePicker } from "@/components/LanguagePicker";

function Brand() {
  return <div className="brand-lockup" aria-label="QwickR1"><span className="brand-q">Q</span><span>wickR1</span></div>;
}

export default function CustomerUploadPage() {
  const { t } = useLanguage();
  const [, params] = useRoute("/send/:code");
  const [location, setLocation] = useLocation();
  const fromRoute = params?.code || new URLSearchParams(window.location.search).get("code") || "";
  const [manualCode, setManualCode] = useState(fromRoute);
  const [activeCode, setActiveCode] = useState(fromRoute.replace(/\D/g, "").slice(0, 6));
  const [serviceKey, setServiceKey] = useState("bw_a4");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [finishedCode, setFinishedCode] = useState("");
  const [paymentToken, setPaymentToken] = useState("");
  const [finishedAmount, setFinishedAmount] = useState("0.00");
  const [finishedPickupCode, setFinishedPickupCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const shopQuery = trpc.customer.shopByCode.useQuery({ code: activeCode }, { enabled: /^\d{6}$/.test(activeCode), retry: false });
  const upload = trpc.customer.upload.useMutation();
  const shop = shopQuery.data?.shop;
  const activePrices = shopQuery.data?.prices ?? [];
  useEffect(() => {
    if (activePrices.length && !activePrices.some(row => row.serviceKey === serviceKey)) setServiceKey(activePrices[0]!.serviceKey);
  }, [activePrices, serviceKey]);

  useEffect(() => {
    const code = fromRoute.replace(/\D/g, "").slice(0, 6);
    if (code.length === 6) { setManualCode(code); setActiveCode(code); }
  }, [fromRoute, location]);

  function openCode(event: React.FormEvent) {
    event.preventDefault();
    const normalized = manualCode.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6) { setError(t("codeInvalid")); return; }
    setError(""); setActiveCode(normalized); setFinishedCode("");
    setLocation(`/send/${normalized}`);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    if (!activePrices.some(row => row.serviceKey === serviceKey)) { setError(t("noActiveServices")); return; }
    if (!file) { setError(t("uploadTypeError")); return; }
    if (file.size > 15 * 1024 * 1024) { setError(t("uploadSizeError")); return; }
    const fileType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
    if (!["application/pdf", "image/jpeg", "image/png"].includes(fileType)) { setError(t("uploadTypeError")); return; }
    const reader = new FileReader();
    reader.onerror = () => setError(t("uploadError"));
    reader.onload = () => {
      const base64 = String(reader.result || "").split(",")[1];
      if (!base64) { setError(t("uploadError")); return; }
      upload.mutate({
        shopCode: activeCode,
        fileName: file.name,
        mimeType: fileType as "application/pdf" | "image/jpeg" | "image/png",
        fileBase64: base64,
        serviceKey: String(form.get("serviceKey") || serviceKey) as "bw_a4" | "colour_a4" | "bw_a3" | "colour_a3",
        sides: String(form.get("sides") || "single") as "single" | "double",
        copies: Number(form.get("copies") || 1),
        note: String(form.get("note") || "").trim(),
      }, {
        onSuccess: result => { setFinishedCode(result.customerCode); setPaymentToken(result.accessToken); setFinishedAmount(result.amount); setFinishedPickupCode(result.pickupCode); },
        onError: () => setError(t("uploadError")),
      });
    };
    reader.readAsDataURL(file);
  }

  return <main className="customer-page">
    <header className="customer-topbar"><Link href="/" className="customer-brand"><Brand /></Link><LanguagePicker /></header>
    <div className="customer-content">
      <div className="customer-back"><Link href="/" onClick={event => { if (activeCode.length === 6) { event.preventDefault(); setFinishedCode(""); setFile(null); setError(""); setActiveCode(""); setManualCode(""); setLocation("/send"); } }}><ArrowLeft size={15} />{t("goBack")}</Link></div>
      {!activeCode || activeCode.length !== 6 ? <section className="customer-card">
        <div className="customer-icon"><Upload size={22} /></div><p className="eyebrow">QWICKR1</p><h1>{t("uploadTitle")}</h1><p>{t("scanIssue")}</p>
        <form className="manual-code-form" onSubmit={openCode}><div className="form-field"><Label htmlFor="shop-code">{t("showCodeAtCounter")}</Label><Input id="shop-code" value={manualCode} onChange={event => setManualCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" /></div><Button type="submit" className="action-button">{t("openUpload")}</Button></form>
        {error && <p className="inline-error"><AlertCircle size={15} />{error}</p>}
      </section> : shopQuery.isLoading ? <section className="customer-card customer-state"><Loader2 size={22} className="spin" /><span>{t("loading")}</span></section> : shopQuery.isError ? <section className="customer-card customer-state"><AlertCircle size={24} /><h1>{t("retrieveFailed")}</h1><Button variant="outline" onClick={() => void shopQuery.refetch()}>{t("tryAgain")}</Button></section> : !shop ? <section className="customer-card customer-state"><AlertCircle size={24} /><h1>{t("chooseShop")}</h1><Button variant="outline" onClick={() => { setActiveCode(""); setManualCode(""); setLocation("/send"); }}>{t("goBack")}</Button></section> : finishedCode ? <section className="customer-card customer-success">
        <div className="success-icon"><Check size={25} /></div><p className="eyebrow">{t("uploadSuccess")}</p><h1>{t("keepCode")}</h1><strong className="customer-job-code">{finishedCode}</strong><p>{t("uploadPrivacy")}</p><div className="payment-success-total"><span>{t("printAmount")}</span><strong>₹{finishedAmount}</strong></div><p className="payment-pickup"><span>{t("pickupCode")}</span><strong>{finishedPickupCode}</strong></p><Button asChild className="action-button"><Link href={`/payment/${paymentToken}`}>{t("continueToPayment")}</Link></Button><Button variant="outline" onClick={() => { setFinishedCode(""); setPaymentToken(""); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>{t("sendFile")}</Button>
      </section> : <section className="customer-card customer-upload-card">
        <div className="customer-shop-line"><span className="shop-avatar">{shop.name.charAt(0).toUpperCase()}</span><div><small>{t("uploadTo")}</small><strong>{shop.name}</strong></div></div>
        <p className="eyebrow">QWICKR1</p><h1>{t("uploadTitle")}</h1><p className="customer-intro">{t("uploadPrivacy")}</p>
        <form className="customer-upload-form" onSubmit={submit}>
          <div className="form-field"><Label htmlFor="customer-file">{t("chooseFile")}</Label><div className="file-picker"><Input ref={inputRef} id="customer-file" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={event => { setFile(event.target.files?.[0] || null); setError(""); }} aria-describedby="file-types" /><p id="file-types" className="form-hint">{t("fileMaxSize")}</p></div></div>
          {file && <div className="selected-file">{file.type.startsWith("image/") ? <FileImage size={17} /> : <FileText size={17} />}<span>{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small></div>}
          <h2 className="customer-section-title">{t("printChoices")}</h2>
          <div className="customer-select-grid"><div className="form-field"><Label htmlFor="serviceKey">{t("service")}</Label><select id="serviceKey" name="serviceKey" className="native-select" value={serviceKey} onChange={event => setServiceKey(event.target.value)} disabled={!activePrices.length}>{activePrices.map(rate => <option key={rate.serviceKey} value={rate.serviceKey}>{rate.serviceKey.startsWith("bw") ? t("bw") : t("colourPrint")} · {rate.serviceKey.endsWith("a4") ? "A4" : "A3"}</option>)}</select>{!activePrices.length && <span className="form-hint">{t("noActiveServices")}</span>}</div><div className="form-field"><Label htmlFor="sides">{t("sides")}</Label><select id="sides" name="sides" className="native-select"><option value="single">{t("singleSide")}</option><option value="double">{t("doubleSide")}</option></select></div><div className="form-field"><Label htmlFor="copies">{t("copies")}</Label><Input id="copies" name="copies" type="number" min={1} max={100} defaultValue={1} /></div></div>
          <div className="form-field"><Label htmlFor="note">{t("note")}</Label><Textarea id="note" name="note" maxLength={500} rows={3} placeholder={t("customerNotePlaceholder")} /></div>
          {error && <p className="inline-error"><AlertCircle size={15} />{error}</p>}
          {upload.isError && <p className="inline-error"><AlertCircle size={15} />{t("uploadError")}</p>}
          <Button type="submit" className="action-button customer-submit" disabled={upload.isPending || !activePrices.length}>{upload.isPending ? <><Loader2 className="spin" size={17} />{t("sending")}</> : <><Upload size={17} />{t("sendFile")}</>}</Button>
        </form>
      </section>}
      {shop && <p className="customer-code-note">{t("scanIssue")}</p>}
    </div>
    <footer className="customer-footer">QwickR1-Log · {t("acceptedFile")}</footer>
  </main>;
}
