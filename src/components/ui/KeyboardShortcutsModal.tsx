/**
 * Keyboard Shortcuts Modal
 * 
 * Interactive cheat sheet dialog displaying all keyboard shortcuts
 * with Mac/Windows-specific modifier keys and full RTL/LTR localization.
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material";
import {
  Close,
  KeyboardAltOutlined,
  Bolt,
  SettingsSuggest,
  VisibilityOutlined,
} from "@mui/icons-material";
import { useTranslation } from "../../i18n";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  labelKey: string;
}

interface ShortcutGroup {
  id: string;
  titleKey: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  const { t, language } = useTranslation();
  const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
  const isAr = language === "ar";
  const modKey = isMac ? "⌘" : "Ctrl";
  const shiftKey = isMac ? "⇧" : "Shift";

  const groups: ShortcutGroup[] = [
    {
      id: "general",
      titleKey: "shortcuts.generalGroup",
      icon: <SettingsSuggest fontSize="small" sx={{ color: "primary.main" }} />,
      items: [
        { keys: isAr ? ["?", "؟"] : ["?"], labelKey: "shortcuts.showShortcuts" },
        { keys: [modKey, "K"], labelKey: "shortcuts.aiCopilot" },
        { keys: [modKey, ","], labelKey: "shortcuts.settings" },
        { keys: [modKey, "R"], labelKey: "shortcuts.syncGoogle" },
        { keys: ["Esc"], labelKey: "shortcuts.closeEscape" },
      ],
    },
    {
      id: "actions",
      titleKey: "shortcuts.actionsGroup",
      icon: <Bolt fontSize="small" sx={{ color: "warning.main" }} />,
      items: [
        { keys: [modKey, "Z"], labelKey: "shortcuts.undo" },
        { keys: isMac ? [modKey, shiftKey, "Z"] : [modKey, "Y"], labelKey: "shortcuts.redo" },
        { keys: ["N", "C"], labelKey: "shortcuts.newTask" },
        { keys: ["L"], labelKey: "shortcuts.newList" },
      ],
    },
    {
      id: "navigation",
      titleKey: "shortcuts.navigationGroup",
      icon: <VisibilityOutlined fontSize="small" sx={{ color: "success.main" }} />,
      items: [
        { keys: ["Ctrl", "Tab"], labelKey: "shortcuts.nextSidebarTab" },
        { keys: ["Ctrl", "⇧", "Tab"], labelKey: "shortcuts.prevSidebarTab" },
        { keys: isAr ? ["1", "١"] : ["1"], labelKey: "shortcuts.boardView" },
        { keys: isAr ? ["2", "٢"] : ["2"], labelKey: "shortcuts.listView" },
        { keys: isAr ? ["3", "٣"] : ["3"], labelKey: "shortcuts.calendarView" },
        { keys: isAr ? ["4", "٤"] : ["4"], labelKey: "shortcuts.eisenhowerView" },
      ],
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.75,
              borderRadius: "10px",
              bgcolor: "action.selected",
              color: "primary.main",
            }}
          >
            <KeyboardAltOutlined fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {t("shortcuts.modalTitle")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("shortcuts.modalSubtitle")}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {groups.map((group, groupIdx) => (
          <Box key={group.id}>
            {/* Group Header */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              {group.icon}
              <Typography
                variant="caption"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}
              >
                {t(group.titleKey)}
              </Typography>
            </Box>

            {/* Shortcut rows */}
            <Box
              sx={{
                borderRadius: "12px",
                border: 1,
                borderColor: "divider",
                bgcolor: "background.default",
                overflow: "hidden",
              }}
            >
              {group.items.map((item, itemIdx) => (
                <Box
                  key={item.labelKey}
                  sx={{
                    py: 1,
                    px: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: itemIdx < group.items.length - 1 ? 1 : 0,
                    borderColor: "divider",
                    transition: "background-color 0.15s ease",
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500, color: "text.primary" }}>
                    {t(item.labelKey)}
                  </Typography>

                  {/* KBD badges */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, direction: "ltr" }}>
                    {item.keys.map((k, kIdx) => (
                      <Box
                        key={kIdx}
                        component="kbd"
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 24,
                          height: 24,
                          px: 0.75,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "text.primary",
                          bgcolor: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid",
                          borderColor: "rgba(255, 255, 255, 0.15)",
                          borderRadius: "6px",
                          boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
                        }}
                      >
                        {k}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
            {groupIdx < groups.length - 1 && <Divider sx={{ mt: 2, display: "none" }} />}
          </Box>
        ))}
      </DialogContent>

      <DialogActions sx={{ p: 1.5, px: 2.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} variant="contained" size="small" sx={{ borderRadius: "10px" }}>
          {t("common.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
