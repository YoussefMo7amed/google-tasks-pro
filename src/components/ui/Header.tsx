import { useState } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Button,
  Tooltip,
  Chip,
} from "@mui/material";
import { Logout, AutoAwesome, Translate, Check, Undo, Redo, KeyboardAltOutlined, Google, CloudOffOutlined, PersonOutline, Add, DeleteOutline } from "@mui/icons-material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  attemptLogoutState,
  loggedInSelector,
  userProfileSelector,
} from "../../config/states";
import { aiCopilotOpenAtom, aiCopilotMinimizedAtom, shortcutsModalOpenAtom, isGuestModeAtom } from "../../store";
import ViewSwitcher from "./ViewSwitcher";
import { useTranslation } from "../../i18n";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { useTaskLists } from "../../hooks";
import { handleLogin, exitGuestMode, switchToGoogleAccount, switchToGuestMode } from "../../helpers/auth";
import { accountService, StoredAccount } from "../../services/account.service";

export default function Header() {
  const loggedIn = useRecoilValue(loggedInSelector);
  const profile = useRecoilValue(userProfileSelector);
  const isGuest = useRecoilValue(isGuestModeAtom);
  const setIsGuest = useSetRecoilState(isGuestModeAtom);
  const setAttemptLogout = useSetRecoilState(attemptLogoutState);
  const setAiCopilotOpen = useSetRecoilState(aiCopilotOpenAtom);
  const setAiCopilotMinimized = useSetRecoilState(aiCopilotMinimizedAtom);
  const setShortcutsOpen = useSetRecoilState(shortcutsModalOpenAtom);
  const { t, language, setLanguage, supportedLanguages, isRtl } = useTranslation();
  const { canUndo, canRedo, undo, redo, getUndoLabel, getRedoLabel } = useUndoRedo();
  const { fetchTaskLists } = useTaskLists();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);
  const [savedAccounts, setSavedAccounts] = useState<StoredAccount[]>(() => accountService.getAccounts());

  const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
  const undoShortcut = isMac ? "⌘Z" : "Ctrl+Z";
  const redoShortcut = isMac ? "⌘⇧Z" : "Ctrl+Y";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSavedAccounts(accountService.getAccounts());
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAttemptLogout(true);
    handleMenuClose();
  };

  const handleSwitchToGoogle = async (email: string) => {
    handleMenuClose();
    const success = await switchToGoogleAccount(email);
    if (success) {
      await fetchTaskLists(true);
    }
  };

  const handleSwitchToGuest = async () => {
    handleMenuClose();
    await switchToGuestMode();
    await fetchTaskLists(true);
  };

  const handleRemoveAccount = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    accountService.removeAccount(email);
    setSavedAccounts(accountService.getAccounts());
  };

  const handleAddAccount = () => {
    handleMenuClose();
    handleLogin(true);
  };

  if (!loggedIn || !profile) {
    return null;
  }

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "transparent",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: "48px !important",
          py: 0.5,
          px: 2.5,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
          {t("navigation.tasks")}
        </Typography>

        <ViewSwitcher />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {/* Undo Button */}
          <Tooltip title={canUndo ? `${t("shortcuts.undoTooltip", { shortcut: undoShortcut })}: ${getUndoLabel()}` : t("shortcuts.nothingToUndo")}>
            <span>
              <IconButton
                size="small"
                disabled={!canUndo}
                onClick={() => undo()}
                sx={{
                  color: canUndo ? "text.primary" : "text.disabled",
                  p: 0.6,
                }}
              >
                <Undo sx={{ fontSize: 19, transform: isRtl ? "scaleX(-1)" : "none" }} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Redo Button */}
          <Tooltip title={canRedo ? `${t("shortcuts.redoTooltip", { shortcut: redoShortcut })}: ${getRedoLabel()}` : t("shortcuts.nothingToRedo")}>
            <span>
              <IconButton
                size="small"
                disabled={!canRedo}
                onClick={() => redo()}
                sx={{
                  color: canRedo ? "text.primary" : "text.disabled",
                  p: 0.6,
                }}
              >
                <Redo sx={{ fontSize: 19, transform: isRtl ? "scaleX(-1)" : "none" }} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Keyboard Shortcuts Map Button */}
          <Tooltip title={`${t("shortcuts.modalTitle")} (?)`}>
            <IconButton
              size="small"
              onClick={() => setShortcutsOpen(true)}
              sx={{
                color: "text.primary",
                p: 0.6,
              }}
            >
              <KeyboardAltOutlined sx={{ fontSize: 19 }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25, height: 20, alignSelf: "center" }} />

          {/* Language Switcher */}
          <Tooltip title={language === "en" ? "تبديل إلى العربية" : "Switch to English"}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Translate sx={{ fontSize: "1.1rem" }} />}
              onClick={(e) => setLangMenuAnchor(e.currentTarget)}
              sx={{
                borderRadius: "18px",
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                borderColor: "divider",
                color: "text.primary",
                py: 0.4,
                px: 1.25,
                minWidth: "auto",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              {language === "en" ? "EN" : "عربي"}
            </Button>
          </Tooltip>

          <Menu
            anchorEl={langMenuAnchor}
            open={Boolean(langMenuAnchor)}
            onClose={() => setLangMenuAnchor(null)}
            PaperProps={{
              elevation: 3,
              sx: {
                borderRadius: 2,
                minWidth: 150,
                mt: 1,
                border: 1,
                borderColor: "divider",
              },
            }}
          >
            {supportedLanguages.map((lang) => (
              <MenuItem
                key={lang.code}
                selected={language === lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setLangMenuAnchor(null);
                }}
                sx={{ display: "flex", justifyContent: "space-between", gap: 1.5 }}
              >
                <Typography variant="body2" fontWeight={language === lang.code ? 600 : 400}>
                  {lang.nativeName} ({lang.name})
                </Typography>
                {language === lang.code && <Check fontSize="small" color="primary" />}
              </MenuItem>
            ))}
          </Menu>

          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setAiCopilotOpen(true);
              setAiCopilotMinimized(false);
            }}
            sx={{
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderColor: "divider",
              color: "text.primary",
              py: 0.4,
              px: 1.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "action.hover",
              },
            }}
          >
            <AutoAwesome sx={{ color: "primary.main", fontSize: "1.1rem" }} />
            <span>{t("navigation.aiCopilot")}</span>
            <Box
              component="span"
              sx={{
                px: 0.75,
                py: 0.1,
                bgcolor: "action.selected",
                borderRadius: 1,
                fontSize: "0.7rem",
                color: "text.secondary",
                fontWeight: 700,
              }}
            >
              ⌘K
            </Box>
          </Button>

          <Tooltip title={isGuest ? `${t("auth.guestBadge")} — ${t("auth.connectGoogleToSync")}` : (profile?.name ?? "User")}>
            <IconButton onClick={handleMenuOpen} size="small">
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: isGuest ? "action.selected" : "primary.main",
                  color: isGuest ? "text.primary" : "primary.contrastText",
                }}
                src={!isGuest ? profile?.picture ?? "" : ""}
                alt={profile?.name ?? "User"}
              >
                {isGuest ? (
                  <PersonOutline sx={{ fontSize: 18 }} />
                ) : (
                  profile?.name?.charAt(0) ?? "U"
                )}
              </Avatar>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              elevation: 4,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 4px 16px rgba(0,0,0,0.18))",
                mt: 1.5,
                minWidth: 280,
                maxWidth: 320,
                borderRadius: 2.5,
                p: 0.5,
              },
            }}
            transformOrigin={{ horizontal: isRtl ? "left" : "right", vertical: "top" }}
            anchorOrigin={{ horizontal: isRtl ? "left" : "right", vertical: "bottom" }}
          >
            {/* Current Active Account Header */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: isGuest ? "action.selected" : "primary.main",
                    color: isGuest ? "text.primary" : "primary.contrastText",
                  }}
                  src={!isGuest ? profile?.picture ?? "" : ""}
                >
                  {isGuest ? (
                    <PersonOutline sx={{ fontSize: 22 }} />
                  ) : (
                    profile?.name?.charAt(0) ?? "U"
                  )}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Typography variant="subtitle2" noWrap fontWeight={600}>
                      {isGuest ? t("auth.guestBadge") : profile?.name}
                    </Typography>
                    <Chip
                      label={t("auth.activeAccountBadge")}
                      size="small"
                      color="primary"
                      sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {isGuest ? t("auth.guestModeDesc") : profile?.email}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            {/* Switch Account Section */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 2, py: 0.75, display: "block", fontWeight: 600, textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: 0.5 }}
            >
              {t("auth.switchAccount")}
            </Typography>

            {/* Stored Google Accounts */}
            {savedAccounts.map((acc) => {
              const isCurrent = !isGuest && acc.email === profile?.email;
              return (
                <MenuItem
                  key={acc.email}
                  selected={isCurrent}
                  onClick={() => {
                    if (!isCurrent) handleSwitchToGoogle(acc.email);
                  }}
                  sx={{
                    borderRadius: 1.5,
                    mx: 0.5,
                    my: 0.25,
                    py: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
                    <Avatar
                      src={acc.picture || ""}
                      sx={{ width: 28, height: 28, fontSize: "0.85rem" }}
                    >
                      {acc.name?.charAt(0) ?? "U"}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" noWrap fontWeight={isCurrent ? 600 : 400}>
                        {acc.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {acc.email}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isCurrent && <Check fontSize="small" color="primary" />}
                    {!isCurrent && (
                      <Tooltip title={t("auth.removeAccountTooltip")}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleRemoveAccount(e, acc.email)}
                          sx={{ p: 0.5, opacity: 0.6, "&:hover": { opacity: 1, color: "error.main" } }}
                        >
                          <DeleteOutline sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </MenuItem>
              );
            })}

            {/* Guest Mode option in switcher */}
            <MenuItem
              selected={isGuest}
              onClick={() => {
                if (!isGuest) handleSwitchToGuest();
              }}
              sx={{
                borderRadius: 1.5,
                mx: 0.5,
                my: 0.25,
                py: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, flex: 1 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "action.selected" }}>
                  <CloudOffOutlined sx={{ fontSize: 16, color: "text.secondary" }} />
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap fontWeight={isGuest ? 600 : 400}>
                    {t("auth.guestBadge")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">
                    {t("auth.guestModeDesc")}
                  </Typography>
                </Box>
              </Box>
              {isGuest && <Check fontSize="small" color="primary" />}
            </MenuItem>

            {/* Add Another Google Account */}
            <MenuItem
              onClick={handleAddAccount}
              sx={{
                borderRadius: 1.5,
                mx: 0.5,
                my: 0.25,
                py: 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Add fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t("auth.addAccount")}
                primaryTypographyProps={{ variant: "body2", fontWeight: 500, color: "primary.main" }}
              />
            </MenuItem>

            <Divider sx={{ my: 0.5 }} />

            {/* Actions: Sign out / Exit Guest */}
            {isGuest ? (
              <>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    handleLogin(true);
                  }}
                  sx={{ borderRadius: 1.5, mx: 0.5, my: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Google fontSize="small" sx={{ color: "#4285F4" }} />
                  </ListItemIcon>
                  <ListItemText primary={t("auth.connectGoogleToSync")} primaryTypographyProps={{ variant: "body2" }} />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    exitGuestMode();
                    setIsGuest(false);
                    setAttemptLogout(true);
                  }}
                  sx={{ borderRadius: 1.5, mx: 0.5, my: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t("auth.exitGuestMode")} primaryTypographyProps={{ variant: "body2" }} />
                </MenuItem>
              </>
            ) : (
              <MenuItem
                onClick={() => {
                  handleLogout();
                }}
                sx={{ borderRadius: 1.5, mx: 0.5, my: 0.25 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t("auth.signOut")} primaryTypographyProps={{ variant: "body2" }} />
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
