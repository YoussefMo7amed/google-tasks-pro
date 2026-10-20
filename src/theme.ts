/**
 * App Theme Factory
 * 
 * Pre-instantiates static LTR and RTL themes once at startup to guarantee
 * zero CSS-in-JS memory leaks during runtime language switching.
 */

import { createTheme, Theme } from "@mui/material/styles";

export function buildTheme(direction: "ltr" | "rtl"): Theme {
  const isRtl = direction === "rtl";
  const fontFamily = isRtl
    ? '"Cairo", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    : '"Inter", "Cairo", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

  return createTheme({
    direction,
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
      fontFamily,
      button: {
        textTransform: "none",
        fontWeight: 500,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily,
            backgroundColor: "#131314",
            color: "#e3e3e3",
            WebkitFontSmoothing: "antialiased",
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
          startIcon: isRtl
            ? {
                marginLeft: 8,
                marginRight: -4,
              }
            : {},
          endIcon: isRtl
            ? {
                marginRight: 8,
                marginLeft: -4,
              }
            : {},
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
          icon: isRtl
            ? {
                marginRight: 5,
                marginLeft: -6,
              }
            : {},
          deleteIcon: isRtl
            ? {
                marginLeft: 5,
                marginRight: -6,
              }
            : {},
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: isRtl
            ? {
                minWidth: 36,
              }
            : {},
        },
      },
    },
  });
}

// Pre-cached static instances (Singletons)
export const ltrTheme: Theme = buildTheme("ltr");
export const rtlTheme: Theme = buildTheme("rtl");
