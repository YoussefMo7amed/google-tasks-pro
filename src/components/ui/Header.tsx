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
} from "@mui/material";
import { Logout, AutoAwesome, Translate, Check, Undo, Redo, KeyboardAltOutlined, Google, CloudOffOutlined, PersonOutline } from "@mui/icons-material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  attemptLogoutState,
  loggedInSelector,
  userProfileSelector,
} from "../../config/states";
import { aiCopilotOpenAtom, shortcutsModalOpenAtom, isGuestModeAtom } from "../../store";
import ViewSwitcher from "./ViewSwitcher";
import { useTranslation } from "../../i18n";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { handleLogin, exitGuestMode } from "../../helpers/auth";

export default function Header() {
  const loggedIn = useRecoilValue(loggedInSelector);
  const profile = useRecoilValue(userProfileSelector);
  const isGuest = useRecoilValue(isGuestModeAtom);
  const setIsGuest = useSetRecoilState(isGuestModeAtom);
  const setAttemptLogout = useSetRecoilState(attemptLogoutState);
  const setAiCopilotOpen = useSetRecoilState(aiCopilotOpenAtom);
  const setShortcutsOpen = useSetRecoilState(shortcutsModalOpenAtom);
  const { t, language, setLanguage, supportedLanguages, isRtl } = useTranslation();
  const { canUndo, canRedo, undo, redo, getUndoLabel, getRedoLabel } = useUndoRedo();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
  const undoShortcut = isMac ? "⌘Z" : "Ctrl+Z";
  const redoShortcut = isMac ? "⌘⇧Z" : "Ctrl+Y";

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAttemptLogout(true);
    handleMenuClose();
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
            onClick={() => setAiCopilotOpen(true)}
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
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: "visible",
                filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                mt: 1.5,
                minWidth: 220,
              },
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {isGuest ? (
              <MenuItem disabled>
                <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: "action.selected" }}>
                  <CloudOffOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
                </Avatar>
                <ListItemText
                  primary={t("auth.guestBadge")}
                  secondary={t("auth.guestModeDesc")}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  secondaryTypographyProps={{
                    variant: "caption",
                    sx: {
                      whiteSpace: "normal",
                      maxWidth: 200,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    },
                  }}
                />
              </MenuItem>
            ) : (
              <MenuItem disabled>
                <Avatar
                  src={profile?.picture ?? ""}
                  sx={{ width: 32, height: 32, mr: 1.5 }}
                />
                <ListItemText
                  primary={profile?.name}
                  secondary={profile?.email}
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </MenuItem>
            )}
            <Divider />
            {isGuest ? (
              <>
                <MenuItem onClick={() => handleLogin(true)}>
                  <ListItemIcon>
                    <Google fontSize="small" sx={{ color: "#4285F4" }} />
                  </ListItemIcon>
                  <ListItemText primary={t("auth.connectGoogleToSync")} />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    exitGuestMode();
                    setIsGuest(false);
                    setAttemptLogout(true);
                  }}
                >
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t("auth.exitGuestMode")} />
                </MenuItem>
              </>
            ) : (
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t("auth.signOut")} />
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
