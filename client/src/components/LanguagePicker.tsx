import { Languages, ChevronDown } from "lucide-react";
import { languageNames, useLanguage } from "@/lib/i18n";

export function LanguagePicker() {
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
