import { Component, ErrorInfo, ReactNode, Suspense, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { RecoilRoot, useRecoilValue } from "recoil";
import RecoilNexus from "recoil-nexus";
import { ltrTheme, rtlTheme } from "./theme";
import { appLanguageAtom } from "./store/atoms";
import { I18nService } from "./i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RootErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const lang = I18nService.loadLanguage();
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            p: 3,
            bgcolor: "#121212",
            color: "#ffffff",
            textAlign: "center",
            gap: 2,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <Typography variant="h5" fontWeight={600} color="error">
            {I18nService.translate(lang, "common.appError")}
          </Typography>
          <Typography variant="body2" sx={{ maxWidth: 600, wordBreak: "break-word", opacity: 0.8 }}>
            {this.state.error?.message || I18nService.translate(lang, "common.unexpectedError")}
          </Typography>
          <Button variant="contained" color="primary" onClick={this.handleReload} sx={{ mt: 2 }}>
            {I18nService.translate(lang, "common.reload")}
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

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
      <Suspense
        fallback={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              bgcolor: "background.default",
            }}
          >
            <CircularProgress />
          </Box>
        }
      >
        <App />
      </Suspense>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RootErrorBoundary>
    <RecoilRoot>
      <RecoilNexus />
      <ThemedApp />
    </RecoilRoot>
  </RootErrorBoundary>
);
