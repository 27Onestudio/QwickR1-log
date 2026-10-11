import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { LanguageContext, Language, translate } from "@/lib/i18n";
import CustomerUploadPage from "@/pages/CustomerUpload";
import PaymentPage from "@/pages/PaymentPage";
import Home from "@/pages/Home";
import { useEffect, useMemo, useState } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function readSavedLanguage(): Language {
  try {
    const saved = localStorage.getItem("qwickr1-language");
    if (saved === "hi" || saved === "mr" || saved === "en") return saved;
  } catch {}
  return "en";
}

function Router() {
  return (
    <Switch>
      <Route path="/send/:code" component={CustomerUploadPage} />
      <Route path="/send" component={CustomerUploadPage} />
      <Route path="/payment/:accessToken" component={PaymentPage} />
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(readSavedLanguage);
  useEffect(() => {
    try { localStorage.setItem("qwickr1-language", language); } catch {}
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: Parameters<typeof translate>[1]) => translate(language, key) }), [language]);
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageContext.Provider value={value}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageContext.Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
