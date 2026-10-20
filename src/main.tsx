import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { RecoilRoot, useRecoilValue } from "recoil";
import RecoilNexus from "recoil-nexus";
import { ltrTheme, rtlTheme } from "./theme";
import { appLanguageAtom } from "./store/atoms";
import { I18nService } from "./i18n";
import { useEffect } from "react";

function ThemedApp() {
  const language = useRecoilValue(appLanguageAtom);
  const isRtl = I18nService.getDirection(language) === "rtl";
  const theme = isRtl ? rtlTheme : ltrTheme;

  useEffect(() => {
    I18nService.applyDocumentDirection(language);
  }, [language]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RecoilRoot>
    <RecoilNexus />
    <ThemedApp />
  </RecoilRoot>
);
