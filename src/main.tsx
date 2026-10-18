import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { RecoilRoot } from "recoil";
import RecoilNexus from "recoil-nexus";

// Create a modern dark theme inspired by Google Workspace & Material Design 3
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#8ab4f8",
      light: "#aecbfa",
      dark: "#669df6",
    },
    background: {
      default: "#131314",
      paper: "#1e1f20",
    },
    text: {
      primary: "#e3e3e3",
      secondary: "#9aa0a6",
    },
    divider: "rgba(255, 255, 255, 0.08)",
    action: {
      hover: "rgba(255, 255, 255, 0.05)",
      selected: "rgba(138, 180, 248, 0.12)",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily:
            '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
          backgroundColor: "#131314",
          color: "#e3e3e3",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
        "*::-webkit-scrollbar": {
          width: "6px",
          height: "6px",
        },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: "rgba(255, 255, 255, 0.16)",
          borderRadius: "6px",
        },
        "*::-webkit-scrollbar-thumb:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.28)",
        },
        "*::-webkit-scrollbar-track": {
          backgroundColor: "transparent",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <RecoilRoot>
    <RecoilNexus />
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </RecoilRoot>
);
