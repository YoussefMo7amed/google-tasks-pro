/**
 * Login Choice Component
 * 
 * Shows options to continue as last logged in user or sign in with a different account.
 */

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Avatar,
  Paper,
  Divider,
} from "@mui/material";
import { Google, CloudOffOutlined } from "@mui/icons-material";
import { getUserProfileFromStorage, deleteAccessToken } from "../../helpers/auth";
import { UserProfile } from "../../types/googleapis";
import { useTranslation } from "../../i18n";

interface LoginChoiceProps {
  onContinueAsUser: () => void;
  onSignInAnother: () => void;
  onContinueAsGuest: () => void;
}

export default function LoginChoice({
  onContinueAsUser,
  onSignInAnother,
  onContinueAsGuest,
}: LoginChoiceProps) {
  const { t } = useTranslation();
  const [cachedUser, setCachedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for cached user profile
    getUserProfileFromStorage()
      .then(profile => {
        setCachedUser(profile);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSignInAnother = async () => {
    // Clear existing tokens before signing in as another user
    try {
      await deleteAccessToken();
    } catch (e) {
      // Token might not exist, that's fine
    }
    localStorage.removeItem("lastLogin");
    onSignInAnother();
  };

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" flex={1}>
        <Typography color="text.secondary">{t("common.loading")}</Typography>
      </Box>
    );
  }

  // If there's a cached user, show choice
  if (cachedUser) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        flex={1}
        gap={2}
        p={3}
      >
        <Typography variant="h6" color="text.primary" gutterBottom>
          {t("auth.welcomeBack")}
        </Typography>

        {/* Continue as user card */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            width: 320,
            cursor: "pointer",
            transition: "all 0.2s",
            border: 2,
            borderColor: "primary.main",
            "&:hover": {
              bgcolor: "action.hover",
              transform: "translateY(-2px)",
            },
          }}
          onClick={onContinueAsUser}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              src={cachedUser.picture ?? undefined}
              alt={cachedUser.name ?? undefined}
              sx={{ width: 48, height: 48 }}
            />
            <Box flex={1} minWidth={0}>
              <Typography variant="subtitle2" color="text.secondary" noWrap>
                {t("auth.continueAs")}
              </Typography>
              <Typography variant="body1" fontWeight="600" noWrap>
                {cachedUser.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {cachedUser.email}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Divider sx={{ width: 320, my: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {t("common.or") || "or"}
          </Typography>
        </Divider>

        {/* Sign in with another account */}
        <Button
          variant="outlined"
          startIcon={<Google />}
          onClick={handleSignInAnother}
          sx={{
            width: 320,
            textTransform: "none",
            py: 1.25,
            borderRadius: 2,
          }}
        >
          {t("auth.signInAnotherAccount")}
        </Button>

        {/* Continue as guest */}
        <Button
          variant="text"
          startIcon={<CloudOffOutlined />}
          onClick={onContinueAsGuest}
          sx={{
            width: 320,
            color: "text.secondary",
            textTransform: "none",
            py: 1,
            borderRadius: 2,
            "&:hover": { color: "text.primary" },
          }}
        >
          {t("auth.continueAsGuest")}
        </Button>
      </Box>
    );
  }

  // No cached user, show initial options
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flex={1}
      textAlign="center"
      gap={2.5}
      p={3}
      maxWidth={420}
      mx="auto"
    >
      <Box>
        <Typography variant="h5" fontWeight="700" gutterBottom>
          Google Tasks Pro
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto" }}>
          {t("auth.guestModeDesc")}
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={1.5} width="100%" maxWidth={320}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Google />}
          onClick={onSignInAnother}
          sx={{
            textTransform: "none",
            py: 1.4,
            fontWeight: 600,
            borderRadius: 2.5,
            boxShadow: 2,
          }}
        >
          {t("auth.signInWithGoogle")}
        </Button>

        <Divider sx={{ my: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t("common.or") || "or"}
          </Typography>
        </Divider>

        <Button
          variant="outlined"
          size="large"
          startIcon={<CloudOffOutlined />}
          onClick={onContinueAsGuest}
          sx={{
            textTransform: "none",
            py: 1.25,
            borderRadius: 2.5,
            borderColor: "divider",
            color: "text.primary",
            "&:hover": {
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
        >
          {t("auth.continueAsGuest")}
        </Button>
      </Box>
    </Box>
  );
}
