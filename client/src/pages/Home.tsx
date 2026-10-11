import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Check, ChevronDown, CircleHelp, ClipboardList, FileImage,
  FileText, Languages, Loader2, LogOut, Printer, QrCode,
  Settings, ShieldCheck, Upload, WalletCards, AlertCircle, ArrowUpRight,
  ChevronRight, Eye, LockKeyhole, ClipboardCheck, Clock3, UserRound, Store,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { languageNames, useLanguage } from "@/lib/i18n";
import { toast } from "sonner";
import { primaryLinks, profileLinks, profileAction } from "@/lib/navigation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const serviceOrder = ["bw_a4", "colour_a4", "bw_a3", "colour_a3"] as const;
const serviceLabel: Record<string, string> = {
  bw_a4: "Black & white · A4",
  colour_a4: "Colour · A4",
  bw_a3: "Black & white · A3",
  colour_a3: "Colour · A3",
};
function PageHeading({ title, sub }: { title: string; sub?: string }) {
  return <div className="page-heading"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>;
}

function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-picker" aria-label={t("language")}>
      <Languages size={15} />
      <select value={language} onChange={event => setLanguage(event.target.value as "en" | "hi" | "mr")}>
        {Object.entries(languageNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </label>
  );
}

function Login() {
  const { t } = useLanguage();
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <Brand />
        <p className="eyebrow">PRINT SHOP ACCOUNT</p>
        <h1 id="login-title">{t("signInTitle")}</h1>
        <p className="login-subtitle">{t("signInSub")}</p>
        <p className="login-account-note">{t("signInNote")}</p>
        <Button onClick={() => startLogin()} className="login-submit"><span>{t("continueWithAccount")}</span><ArrowUpRight size={18} /></Button>
        <div className="login-legal">{t("legalNote")}<br /><Link href="/terms">{t("terms")}</Link> {t("and")} <Link href="/privacy">{t("privacy")}</Link></div>
      </section>
      <div className="login-language"><LanguagePicker /></div>
    </main>
  );
}

function ProfileMenu({ userName, onLogout, placement }: { userName: string; onLogout: () => void; placement: "sidebar" | "mobile" }) {
  const { t } = useLanguage();
  const initial = userName.trim().charAt(0).toUpperCase() || "U";
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className={`profile-trigger profile-trigger-${placement}`} aria-label={`${t("profile")}: ${userName}`}>
        <span className="profile-avatar">{initial}</span>
        <span className="profile-trigger-name">{userName}</span>
        <ChevronDown size={15} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align={placement === "sidebar" ? "start" : "end"} side={placement === "sidebar" ? "top" : "bottom"} className="profile-menu">
      <DropdownMenuLabel className="profile-menu-label"><UserRound size={15} /><span>{userName}</span></DropdownMenuLabel>
      <DropdownMenuSeparator />
      {profileLinks.map(({ path, key, icon: Icon }) => <DropdownMenuItem key={path} asChild><Link href={path}><Icon size={16} />{t(key)}</Link></DropdownMenuItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onLogout} className="profile-logout"><LogOut size={16} />{t(profileAction.key)}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

function Brand() {
  return <div className="brand-lockup" aria-label="QwickR1-Log"><span className="brand-q">Q</span><span>wickR1<span className="brand-log">-Log</span></span></div>;
}

function StatusPill({ status }: { status: string }) {
  const { t } = useLanguage();
  return <span className={`status-pill status-${status}`}><i />{t(status as "new" | "printing" | "ready" | "completed" | "problem")}</span>;
}

function RetrieveFile({ initialCode }: { initialCode: string }) {
  const { t } = useLanguage();
  const [code, setCode] = useState(initialCode);
  const [submitted, setSubmitted] = useState(initialCode);
  const [fieldError, setFieldError] = useState("");
  const query = trpc.shop.retrieve.useQuery({ customerCode: submitted }, { enabled: Boolean(submitted), retry: false });
  const job = query.data;
  const utils = trpc.useUtils();
  const update = trpc.shop.setJobStatus.useMutation({
    onSuccess: () => { toast.success(t("statusUpdated")); void utils.shop.recentJobs.invalidate(); void utils.shop.retrieve.invalidate(); },
    onError: error => toast.error(error.message.includes("Retrieve the job") ? t("retrieveBeforePrintDone") : t("retrieveFailed")),
  });
  const pay = trpc.shop.confirmPayment.useMutation({
    onSuccess: () => { toast.success(t("paymentConfirmedByShop")); void utils.shop.recentJobs.invalidate(); void utils.shop.retrieve.invalidate(); },
    onError: () => toast.error(t("retrieveFailed")),
  });

  function retrieve(event: React.FormEvent) {
    event.preventDefault();
    const normalized = code.toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9]{2}-[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(normalized)) {
      setFieldError(t("codeInvalid")); setSubmitted(""); return;
    }
    setFieldError(""); setSubmitted(normalized);
  }

  return (
    <>
      <div className="lookup-heading">
        <p className="eyebrow">{t("shopCounterLabel")}</p>
        <h1>{t("retrieveTitle")}</h1>
        <p>{t("enterCodeBelow")}</p>
      </div>
      <section className="lookup-hero">
        <div className="lookup-hero-head">
          <div className="lookup-hero-icon"><Eye size={19} /></div>
          <div><h2>{t("privateJobLookup")}</h2><p>{t("enterCodeBelow")}</p></div>
          <span className="lookup-privacy"><LockKeyhole size={14} />{t("fileStaysPrivate")}</span>
        </div>
        <form className="lookup-form" onSubmit={retrieve}>
          <div className="lookup-field"><Label htmlFor="customer-code">{t("enterCustomerCode")}</Label><Input id="customer-code" value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 10))} placeholder="e.g. QW-7K4M-92" autoComplete="off" spellCheck={false} aria-describedby="code-hint" /></div>
          <Button className="lookup-submit" type="submit" disabled={query.isFetching}>{query.isFetching ? <><Loader2 className="spin" size={17} />{t("loading")}</> : <><QrCode size={17} />{t("retrieve")}<ArrowUpRight size={16} /></>}</Button>
        </form>
        <div className="lookup-hero-foot">
          <span id="code-hint">{t("codeExample")} · {t("pressEnterRetrieve")}</span>
          <Link href="/poster"><QrCode size={14} />{t("openPosterLink")}<ChevronRight size={14} /></Link>
        </div>
        {fieldError && <p className="lookup-error"><AlertCircle size={15} />{fieldError}</p>}
        {query.isError && <p className="lookup-error"><AlertCircle size={15} />{t("retrieveFailed")}</p>}
        {query.data === null && <p className="lookup-error"><AlertCircle size={15} />{t("codeNotFound")}</p>}
      </section>
      {query.isFetching && <div className="loading-row"><Loader2 className="spin" size={18} />{t("loading")}</div>}
      {job ? <section className="panel job-viewer">
        <div className="job-viewer-top"><div><span className="eyebrow">{t("customerCode")}</span><div className="job-code-text">{job.customerCode}</div><div className="job-pickup-code">{t("pickupCode")}: <strong>{job.pickupCode || "—"}</strong></div></div><div className="job-status-stack"><StatusPill status={job.status} /><PaymentBadge job={job} /></div></div>
        <div className="file-preview">
          {job.mimeType.startsWith("image/") ? <img src={job.fileUrl} alt={job.fileName} /> : <iframe title={job.fileName} src={`${job.fileUrl}#toolbar=1&view=FitH`} />}
        </div>
        <div className="job-details">
          <div><strong>{t("fileName")}</strong><span>{job.fileName}</span></div>
          <div><strong>{t("fileType")}</strong><span>{job.mimeType.toUpperCase()}</span></div>
          <div><strong>{t("pages")}</strong><span>{job.pageCount || 1}</span></div>
          <div><strong>{t("printAmount")}</strong><span>₹{job.paymentAmount}</span></div>
          <div><strong>{t("uploaded")}</strong><span>{new Date(job.createdAt).toLocaleString()}</span></div>
          <div><strong>{t("colour")}</strong><span>{job.colour === "bw" ? t("bw") : t("colourPrint")}</span></div>
          <div><strong>{t("paperSize")}</strong><span>{job.paperSize}</span></div>
          <div><strong>{t("copies")}</strong><span>{job.copies}</span></div>
          <div><strong>{t("sides")}</strong><span>{job.sides === "single" ? t("singleSide") : t("doubleSide")}</span></div>
          <div><strong>{t("note")}</strong><span>{job.note || t("noNote")}</span></div>
        </div>
        <div className="job-actions">
          <Button className="action-button" onClick={() => window.open(job.fileUrl, "_blank", "noopener,noreferrer")}><Printer size={17} />{t("printFile")}</Button>
          {job.paymentStatus !== "paid" && <Button variant="outline" className="payment-confirm-button" onClick={() => pay.mutate({ jobId: job.id, receivedVia: job.paymentStatus === "upi_sent" ? "upi" : "cash" })} disabled={pay.isPending}><Check size={16} />{job.paymentMethod === "upi" && job.paymentStatus === "upi_sent" ? t("confirmReceived") : t("markPaid")}</Button>}
          {job.status !== "completed" && <Button variant="outline" onClick={() => update.mutate({ jobId: job.id, status: "completed" })} disabled={update.isPending || !job.openedAt}><Printer size={17} />{t("printDone")}</Button>}
          {job.status === "new" && <Button variant="outline" onClick={() => update.mutate({ jobId: job.id, status: "printing" })}><Printer size={17} />{t("markPrinting")}</Button>}
          {job.status === "printing" && <Button variant="outline" onClick={() => update.mutate({ jobId: job.id, status: "ready" })}><Check size={17} />{t("markReady")}</Button>}
          {job.status !== "completed" && <Button variant="ghost" className="problem-action" onClick={() => update.mutate({ jobId: job.id, status: "problem" })}><AlertCircle size={16} />{t("reportProblem")}</Button>}
          <Button variant="ghost" onClick={() => { setCode(""); setSubmitted(""); }} className="retrieve-again">{t("retrieveAnother")}</Button>
        </div>
      </section> : !query.isFetching && <section className="file-empty-card">
        <div className="file-empty-icon"><FileText size={22} /></div>
        <div><p className="eyebrow">{t("notConnected")}</p><h2>{t("noFileOpen")}</h2><p>{t("enterCodePrompt")}</p><small><LockKeyhole size={13} />{t("customerFilesPrivate")}</small></div>
      </section>}
      <RecentJobsPreview />
    </>
  );
}

function RecentJobsPreview() {
  const { t } = useLanguage();
  const jobsQuery = trpc.shop.recentJobs.useQuery();
  const jobs = jobsQuery.data ?? [];
  return <section className="recent-preview">
    <div className="recent-preview-heading"><div><h2>{t("recentJobsHeading")}</h2><p>{t("jobsOnlyHere")}</p></div><Link href="/jobs">{t("viewAllJobs")}<ArrowUpRight size={14} /></Link></div>
    {jobsQuery.isLoading ? <div className="recent-preview-empty"><Loader2 className="spin" size={16} />{t("loading")}</div> : jobsQuery.isError ? <div className="recent-preview-empty"><AlertCircle size={15} />{t("retrieveFailed")}</div> : jobs.length === 0 ? <div className="recent-preview-empty"><ClipboardList size={17} />{t("noJobs")}</div> : <div className="recent-preview-list">{jobs.slice(0,3).map(job => <Link key={job.id} href="/jobs"><FileText size={17} /><span><strong>{job.fileName}</strong><small>{job.customerCode} · {new Date(job.createdAt).toLocaleString()}</small><PaymentBadge job={job} /></span><StatusPill status={job.status} /></Link>)}</div>}
  </section>;
}

function InlineError({ text }: { text: string }) {
  return <p className="inline-error"><AlertCircle size={15} />{text}</p>;
}

function PaymentBadge({ job }: { job: { paymentMethod?: "cash" | "upi"; paymentStatus?: "unpaid" | "upi_sent" | "paid"; upiReferenceLast4?: string | null } }) {
  const { t } = useLanguage();
  const paidLabel = job.paymentMethod === "upi" ? `${t("paymentStatusPaid")} ✓` : t("paymentStatusPaidCash");
  const sentLabel = job.upiReferenceLast4 ? `${t("paymentStatusUpiSent")} · UTR: ${job.upiReferenceLast4}` : t("paymentStatusUpiSent");
  const className = job.paymentStatus === "paid" ? "payment-badge payment-badge-paid" : job.paymentStatus === "upi_sent" ? "payment-badge payment-badge-upi" : "payment-badge payment-badge-unpaid";
  const label = job.paymentStatus === "paid" ? paidLabel : job.paymentStatus === "upi_sent" ? sentLabel : job.paymentMethod === "upi" ? t("paymentStatusUpiPending") : t("paymentStatusCash");
  return <span className={className}>{label}</span>;
}

function Jobs({ onRetrieve }: { onRetrieve: (code: string) => void }) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const query = trpc.shop.recentJobs.useQuery();
  const pay = trpc.shop.confirmPayment.useMutation({ onSuccess: () => { toast.success(t("paymentConfirmedByShop")); void query.refetch(); }, onError: () => toast.error(t("retrieveFailed")) });
  const jobs = query.data ?? [];
  return <><PageHeading title={t("jobs")} /><section className="panel jobs-panel">
    {query.isLoading ? <div className="loading-row"><Loader2 size={18} className="spin" />{t("loading")}</div> : jobs.length === 0 ? <div className="empty-state"><ClipboardList size={27} /><p>{t("noJobs")}</p></div> : <div className="job-list">{jobs.map(job => <div className="job-queue-row" key={job.id}><button className="job-list-row" onClick={() => { onRetrieve(job.customerCode); setLocation("/"); }}><span className="job-list-file"><FileText size={18} /><span><strong>{job.fileName}</strong><small>{t("pickupCode")}: <b className="queue-pickup-code">{job.pickupCode || "—"}</b> · {job.customerCode}</small></span></span></button><div className="job-queue-actions"><PaymentBadge job={job} /><span className="queue-amount">₹{job.paymentAmount}</span>{job.paymentStatus !== "paid" && <Button variant="outline" size="sm" onClick={() => pay.mutate({ jobId: job.id, receivedVia: job.paymentStatus === "upi_sent" ? "upi" : "cash" })} disabled={pay.isPending}>{job.paymentMethod === "upi" && job.paymentStatus === "upi_sent" ? t("confirmReceived") : t("markPaid")}</Button>}</div><StatusPill status={job.status} /></div>)}</div>}
  </section></>;
}

function PricingPage() {
  const { t } = useLanguage();
  const query = trpc.shop.prices.useQuery();
  const utils = trpc.useUtils();
  const [rates, setRates] = useState<Record<string, { price: string; active: boolean }>>({});
  useEffect(() => {
    if (query.data) setRates(Object.fromEntries(query.data.map(row => [row.serviceKey, { price: row.price, active: row.active }])));
  }, [query.data]);
  const save = trpc.shop.savePrices.useMutation({
    onSuccess: () => { toast.success(t("rateSaved")); void utils.shop.prices.invalidate(); void utils.shop.get.invalidate(); },
    onError: () => toast.error(t("retrieveFailed")),
  });
  const rows = serviceOrder.map(key => ({ key, ...rates[key], label: serviceLabel[key] }));
  function saveRates() {
    if (serviceOrder.some(key => rates[key]?.active && (!/^\d{1,6}(\.\d{1,2})?$/.test(rates[key]!.price) || Number(rates[key]!.price) <= 0))) {
      toast.error(t("rateRequired")); return;
    }
    save.mutate({ rows: serviceOrder.map(serviceKey => ({ serviceKey, price: rates[serviceKey]!.price || "0", active: rates[serviceKey]!.active })) });
  }
  return <><PageHeading title={t("pricingHeading")} sub={t("pricingHint")} />
    <section className="panel pricing-panel">
      <div className="pricing-head"><span>{t("service")}</span><span>{t("unit")}</span><span>{t("price")}</span><span>{t("active")}</span></div>
      {query.isLoading ? <div className="loading-row"><Loader2 size={18} className="spin" />{t("loading")}</div> : query.isError ? <div className="query-error"><InlineError text={t("retrieveFailed")} /><Button variant="outline" onClick={() => void query.refetch()}>{t("tryAgain")}</Button></div> : rows.map(row => <div className="pricing-row" key={row.key}>
        <strong>{row.label}</strong><span className="rate-unit">{t("perPage")}</span>
        <label className="rupee-input"><span>₹</span><Input type="number" min="0" max="999999" step="0.01" inputMode="decimal" value={row.price === "0.00" || row.price === "0" ? "" : row.price ?? ""} placeholder={t("noPrice")} onChange={event => setRates(old => ({ ...old, [row.key]: { price: event.target.value, active: old[row.key]?.active ?? false } }))} aria-label={`${row.label} ${t("price")}`} /></label>
        <Switch checked={row.active ?? false} onCheckedChange={checked => setRates(old => ({ ...old, [row.key]: { price: old[row.key]?.price ?? "0.00", active: checked } }))} aria-label={`${row.label} ${t("active")}`} />
      </div>)}
      <div className="panel-bottom"><p className="small-note">{t("rateTemplate")}: {t("bw")}, {t("colourPrint")}, A4, A3</p><Button className="action-button" onClick={saveRates} disabled={query.isLoading || save.isPending}>{save.isPending && <Loader2 size={16} className="spin" />}{save.isPending ? t("saving") : t("savePricing")}</Button></div>
    </section>
  </>;
}

function PosterPage({ shop }: { shop: any }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  if (!shop) return <><PageHeading title={t("posterHeading")} sub={t("posterIntro")} /><section className="panel poster-loading"><Loader2 className="spin" size={19} />{t("loading")}</section></>;
  const code = shop.publicCode;
  const url = `${window.location.origin}/send/${code}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 2200); }
    catch { toast.error("Could not copy link. Select and copy the URL instead."); }
  }
  return <>
    <div className="poster-controls">
      <div className="poster-control-copy"><div><strong>{t("posterToolTitle")}</strong><p>{t("posterToolSubtitle")}</p></div></div>
      <div className="poster-control-actions">
        <Button variant="outline" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}><Upload size={15} />{t("testCustomerFlow")}</Button>
        <Button className="action-button" onClick={() => window.print()}><Printer size={15} />{t("printA4Poster")}</Button>
      </div>
    </div>
    <section className="poster-preview" aria-label={t("posterHeading")}>
      <div className="poster-identity">
        <span className="poster-official">{t("posterOfficialCounter")}</span>
        <h1 className="poster-shop-name">{shop?.name || t("shopPlaceholder")}</h1>
        {shop?.address && <p className="poster-address">{shop.address}</p>}
      </div>
      <div className="poster-divider" />
      <div className="poster-pitch">
        <h2>{t("posterTagline")}</h2>
        <p>{t("posterNoWhatsApp")}</p>
      </div>
      <div className="poster-qr-panel">
        <div className="qr-quiet-zone"><QRCodeSVG value={url} size={236} level="M" marginSize={4} bgColor="#ffffff" fgColor="#111111" title={t("posterHeading")} /></div>
        <p className="poster-scan-label">{t("scanWithPhone")}</p>
      </div>
      <div className="poster-code-panel">
        <p className="poster-code-label">{t("showCodeAtCounter")}</p>
        <strong className="poster-fallback-code">{code}</strong>
      </div>
      <div className="poster-divider poster-divider-lower" />
      <div className="poster-steps">
        {[1, 2, 3].map(step => <div className="poster-step" key={step}>
          <span className="poster-step-number">{step}</span>
          <strong>{t(`posterStep${step}Title` as "posterStep1Title" | "posterStep2Title" | "posterStep3Title")}</strong>
          <small>{t(`posterStep${step}Desc` as "posterStep1Desc" | "posterStep2Desc" | "posterStep3Desc")}</small>
        </div>)}
      </div>
      <div className="poster-footer">
        <span className="poster-privacy-note"><LockKeyhole size={14} />{t("posterPrivacyFooter")}</span>
        <strong>{t("posterPoweredBy")}</strong>
      </div>
    </section>
  </>;
}

function FormField({ label, name, defaultValue, required }: { label: string; name: string; defaultValue?: string; required?: boolean }) {
  return <div className="form-field"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} defaultValue={defaultValue} required={required} maxLength={240} /></div>;
}

function AboutPage() {
  const { t } = useLanguage();
  const story = t("aboutCopy").replace(/^About 27One Studio\s*/, "");
  return <main className="legal-document about-document">
    <p className="legal-eyebrow">{t("about")}</p>
    <h1>{t("aboutHeading")}</h1>
    <p className="legal-intro">{t("aboutIntro")}</p>
    <section className="legal-card about-story"><p>{story}</p></section>
  </main>;
}

function TermsPage() {
  const { t } = useLanguage();
  const rows = [
    ["termsQwickR1", "term1", Store],
    ["termsShopDuty", "term2", ClipboardCheck],
    ["termsCustomerFiles", "term3", FileText],
    ["termsAccount", "term4", LockKeyhole],
    ["termsRetention", "term5", ShieldCheck],
    ["termsService", "term6", Clock3],
    ["termsContact", "term7", CircleHelp],
  ] as const;
  return <main className="legal-document">
    <p className="legal-eyebrow">{t("legalEyebrow")}</p>
    <h1>{t("terms")}</h1>
    <p className="legal-intro">{t("termsIntro")}</p>
    <section className="legal-card">{rows.map(([heading,body,Icon]) => <article className="legal-row" key={heading}>
      <span className="legal-row-icon"><Icon size={17} /></span>
      <div className="legal-row-copy"><h2>{t(heading)}</h2><p>{t(body)}</p></div>
    </article>)}</section>
  </main>;
}

function PrivacyPage() {
  const { t } = useLanguage();
  const rows = [
    ["collectHeading", "collectCopy", FileText],
    ["whyHeading", "whyCopy", Printer],
    ["fileHandlingHeading", "fileHandlingCopy", ShieldCheck],
    ["retentionHeading", "retentionCopy", Clock3],
    ["accessHeading", "accessCopy", LockKeyhole],
    ["contactHeading", "contactCopy", CircleHelp],
  ] as const;
  return <main className="legal-document">
    <p className="legal-eyebrow">{t("legalEyebrow")}</p>
    <h1>{t("privacy")}</h1>
    <p className="legal-intro">{t("privacyIntro")}</p>
    <section className="legal-card">{rows.map(([heading,body,Icon]) => <article className="legal-row" key={heading}>
      <span className="legal-row-icon"><Icon size={17} /></span>
      <div className="legal-row-copy"><h2>{t(heading)}</h2><p>{t(body)}</p></div>
    </article>)}</section>
  </main>;
}

function SettingsPage({ shop, loading, error, onRetry }: { shop: any; loading: boolean; error: boolean; onRetry: () => void }) {
  const { t } = useLanguage();
  const utils = trpc.useUtils();
  const [upiError, setUpiError] = useState("");
  const save = trpc.shop.save.useMutation({ onSuccess: () => { setUpiError(""); toast.success(t("upiSaved")); void utils.shop.get.invalidate(); }, onError: () => setUpiError(t("upiInvalid")) });
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const upiVpa = String(form.get("upiVpa") || "").trim();
    const upiOwnerConfirmed = form.get("upiOwnerConfirmed") === "on";
    if (upiVpa && !/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}@[A-Za-z0-9][A-Za-z0-9.-]{1,63}$/.test(upiVpa)) { setUpiError(t("upiInvalid")); return; }
    if (upiVpa && !upiOwnerConfirmed) { setUpiError(t("upiOwnerConfirmRequired")); return; }
    if (!upiVpa && upiOwnerConfirmed) { setUpiError(t("upiOwnerConfirmRequired")); return; }
    setUpiError("");
    save.mutate({ name: String(form.get("name") || "").trim(), phone: String(form.get("phone") || "").trim(), address: String(form.get("address") || "").trim(), upiVpa, upiOwnerConfirmed });
  }
  return <><PageHeading title={t("settings")} />{error ? <section className="panel settings-state"><InlineError text={t("retrieveFailed")} /><Button variant="outline" onClick={onRetry}>{t("tryAgain")}</Button></section> : loading || !shop ? <section className="panel settings-state"><Loader2 className="spin" size={18} />{t("loading")}</section> : <form className="panel settings-form" onSubmit={onSubmit}>
    <div className="form-grid"><FormField label={t("shopName")} name="name" defaultValue={shop?.name || ""} required /><FormField label={t("phone")} name="phone" defaultValue={shop?.phone || ""} /><div className="form-field full-width"><Label htmlFor="address">{t("address")}</Label><Textarea id="address" name="address" defaultValue={shop?.address || ""} rows={3} /></div><div className="form-field full-width"><Label htmlFor="upiVpa">{t("upiId")}</Label><Input id="upiVpa" name="upiVpa" defaultValue={shop?.upiVpa || ""} placeholder="shivam@okaxis" autoCapitalize="none" autoCorrect="off" /><span className="form-hint">{t("upiSettingsHelp")}</span><label className="upi-owner-confirm"><input type="checkbox" name="upiOwnerConfirmed" defaultChecked={shop?.upiOwnerConfirmed || false} /><span>{t("upiOwnerConfirmed")}</span></label>{shop?.upiOwnerConfirmed && <span className="upi-owner-state">{t("upiOwnerConfirmedSaved")}</span>}{upiError && <InlineError text={upiError} />}</div><div className="form-field full-width"><Label>{t("publicShopCode")}</Label><div className="readonly-code">{shop?.publicCode || "—"}</div></div></div>
    <div className="form-end"><Button className="action-button" type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="spin" size={16} />}{t("saveSettings")}</Button></div>
  </form>}</>;
}

function Shell() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [retrieveCode, setRetrieveCode] = useState("");
  const shopQuery = trpc.shop.get.useQuery();
  const shop = shopQuery.data;
  const activePath = location === "/" ? "/" : location;
  const titleKey = [...primaryLinks, ...profileLinks].find(row => row.path === activePath)?.key ?? "retrieveFile";
  const title = t(titleKey);
  const userName = user?.name || user?.email || t("userAccount");
  const logoutSafe = async () => { try { await logout(); } catch { toast.error(t("retrieveFailed")); } };

  function currentPage() {
    switch (activePath) {
      case "/jobs": return <Jobs onRetrieve={code => { setRetrieveCode(code); setLocation("/"); }} />;
      case "/pricing": return <PricingPage />;
      case "/poster": return <PosterPage shop={shop} />;
      case "/about": return <AboutPage />;
      case "/terms": return <TermsPage />;
      case "/privacy": return <PrivacyPage />;
      case "/settings": return <SettingsPage shop={shop} loading={shopQuery.isLoading} error={shopQuery.isError} onRetry={() => void shopQuery.refetch()} />;
      default: return <RetrieveFile key={retrieveCode || "new"} initialCode={retrieveCode} />;
    }
  }

  return <div className="app-layout">
    <aside className="sidebar">
      <Link href="/" className="sidebar-brand"><Brand /></Link>
      <nav aria-label={t("menu")} className="app-nav">
        <p className="nav-caption">{t("privateJobLookup")}</p>
        <div className="nav-group">{primaryLinks.slice(0, 1).map(({ path, key, icon: Icon }) => <Link key={path} href={path} className={`nav-link ${activePath === path ? "active" : ""}`}><Icon size={17} /><span>{t(key)}</span></Link>)}</div>
        <p className="nav-caption">{t("shopManagement")}</p>
        <div className="nav-group">{primaryLinks.slice(1).map(({ path, key, icon: Icon }) => <Link key={path} href={path} className={`nav-link ${activePath === path ? "active" : ""}`}><Icon size={17} /><span>{t(key)}</span></Link>)}</div>
      </nav>
      <div className="sidebar-bottom"><ProfileMenu userName={userName} onLogout={() => void logoutSafe()} placement="sidebar" /></div>
    </aside>
    <div className="app-main-area">
      <header className="topbar"><div className="mobile-brand"><Brand /></div><div className="breadcrumb"><span>{t("appName")}</span><span className="breadcrumb-sep">›</span><strong>{title}</strong></div><div className="topbar-right"><LanguagePicker /><div className="mobile-profile"><ProfileMenu userName={userName} onLogout={() => void logoutSafe()} placement="mobile" /></div></div></header>
      <nav className="mobile-nav" aria-label={t("menu")}>{primaryLinks.map(({ path, key, icon: Icon }) => <Link key={path} href={path} className={activePath === path ? "mobile-nav-active" : ""}><Icon size={17} /><span>{t(key)}</span></Link>)}</nav>
      <main className={`page-content ${activePath === "/" ? "page-content-home" : ""}`} key={activePath}>{shopQuery.isError && activePath !== "/pricing" && activePath !== "/settings" && <div className="query-error"><InlineError text={t("retrieveFailed")} /><Button variant="outline" onClick={() => void shopQuery.refetch()}>{t("tryAgain")}</Button></div>}{currentPage()}</main>
    </div>
  </div>;
}

export default function Home() {
  const { user, loading } = useAuth();
  const [path] = useLocation();
  const isProtectedPath = !path.startsWith("/terms") && !path.startsWith("/privacy") && !path.startsWith("/about");
  if (loading && isProtectedPath) return <div className="auth-loading"><Loader2 size={25} className="spin" /><span>QwickR1-Log</span></div>;
  if (!user && isProtectedPath) return <Login />;
  if (!user && (path.startsWith("/terms") || path.startsWith("/privacy") || path.startsWith("/about"))) return <PublicInfoPage path={path} />;
  return <Shell />;
}

function PublicInfoPage({ path }: { path: string }) {
  const { t } = useLanguage();
  return <main className="public-info"><div className="public-info-header"><Link href="/"><Brand /></Link><LanguagePicker /><Button onClick={() => startLogin()}>{t("signIn")}</Button></div><div className="public-info-body">{path.startsWith("/terms") ? <TermsPage /> : path.startsWith("/privacy") ? <PrivacyPage /> : <AboutPage />}</div></main>;
}
