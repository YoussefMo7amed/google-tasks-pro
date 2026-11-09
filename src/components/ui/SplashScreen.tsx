/**
 * Splash Screen Component
 * 
 * Displays a beautiful loading screen while the app initializes.
 */

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  keyframes,
} from "@mui/material";
import { TaskAlt } from "@mui/icons-material";
import { useTranslation } from "../../i18n";

// Pulse animation for the icon
const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

// Fade in animation
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Loading dots animation
const loadingDots = keyframes`
  0%, 20% {
    content: '.';
  }
  40% {
    content: '..';
  }
  60%, 100% {
    content: '...';
  }
`;

interface SplashScreenProps {
  message?: string;
  onCancel?: () => void;
  onManualCode?: (input: string) => Promise<boolean>;
}

export default function SplashScreen({
  message,
  onCancel,
  onManualCode,
}: SplashScreenProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t("common.loading");
  const [showCancel, setShowCancel] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCancel(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        bgcolor: "background.default",
        gap: 3,
      }}
    >
      {/* Logo/Icon */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 80,
          height: 80,
          borderRadius: "50%",
          bgcolor: "primary.main",
          animation: `${pulse} 2s ease-in-out infinite`,
        }}
      >
        <TaskAlt sx={{ fontSize: 48, color: "primary.contrastText" }} />
      </Box>

      {/* App Name */}
      <Typography
        variant="h4"
        fontWeight={600}
        sx={{
          animation: `${fadeIn} 0.5s ease-out`,
          background: "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Google Tasks Pro
      </Typography>

      {/* Loading Message */}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          animation: `${fadeIn} 0.5s ease-out 0.2s both`,
          "&::after": {
            content: "'...'",
            animation: `${loadingDots} 1.5s steps(3, end) infinite`,
          },
        }}
      >
        {displayMessage}
      </Typography>

      {/* Cancel button & Manual Code Fallback if loading takes time */}
      {showCancel && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          {onCancel && (
            <Button
              variant="text"
              size="small"
              onClick={onCancel}
              sx={{
                color: "text.secondary",
                fontSize: "0.8rem",
                textTransform: "none",
                animation: `${fadeIn} 0.3s ease-out`,
                "&:hover": {
                  color: "text.primary",
                  backgroundColor: "action.hover",
                },
              }}
            >
              {t("auth.cancelReturnToLogin")}
            </Button>
          )}

          {onManualCode && (
            <Button
              variant="text"
              size="small"
              onClick={() => setShowManualDialog(true)}
              sx={{
                color: "primary.main",
                fontSize: "0.78rem",
                textTransform: "none",
                opacity: 0.85,
                "&:hover": { opacity: 1, textDecoration: "underline" },
              }}
            >
              {t("auth.havingTroubleRedirect")}
            </Button>
          )}
        </Box>
      )}

      {/* Manual Code Input Dialog */}
      <Dialog
        open={showManualDialog}
        onClose={() => setShowManualDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>{t("auth.pasteAuthCodeTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("auth.pasteAuthCodeDesc")}
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={t("auth.pasteAuthCodePlaceholder")}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            disabled={submitting}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowManualDialog(false)} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={!manualInput.trim() || submitting}
            onClick={async () => {
              setSubmitting(true);
              try {
                const ok = await onManualCode?.(manualInput.trim());
                if (ok) setShowManualDialog(false);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
