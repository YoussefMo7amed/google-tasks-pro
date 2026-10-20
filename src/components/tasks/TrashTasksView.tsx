/**
 * Trash Tasks View
 * 
 * Displays deleted tasks in a recycle bin with auto-clean retention timers,
 * restore options, permanent delete options, and retention policy settings.
 */

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  TextField,
  Divider,
} from "@mui/material";
import {
  DeleteOutline,
  DeleteForever,
  RestoreFromTrash,
  TimerOutlined,
  CalendarToday,
  Notes,
  Check,
  FolderOutlined,
  AccessTime,
} from "@mui/icons-material";
import { useTrash } from "../../hooks/useTrash";
import { useTranslation } from "../../i18n";
import { TrashRetention, TrashedTask } from "../../services/trash.service";

export default function TrashTasksView() {
  const { t, language } = useTranslation();
  const isRtl = language === "ar";
  const {
    items,
    count,
    settings,
    restore,
    removePermanently,
    emptyAll,
    updateRetentionSettings,
  } = useTrash();

  // Dialog States
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TrashedTask | null>(null);
  const [retentionAnchorEl, setRetentionAnchorEl] = useState<null | HTMLElement>(null);
  const [customDaysDialogOpen, setCustomDaysDialogOpen] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState<number>(settings.customDays || 7);

  const handleOpenRetentionMenu = (event: React.MouseEvent<HTMLElement>) => {
    setRetentionAnchorEl(event.currentTarget);
  };

  const handleCloseRetentionMenu = () => {
    setRetentionAnchorEl(null);
  };

  const handleSelectRetention = (retention: TrashRetention) => {
    handleCloseRetentionMenu();
    if (retention === "custom") {
      setCustomDaysInput(settings.customDays || 7);
      setCustomDaysDialogOpen(true);
    } else {
      updateRetentionSettings({ retention });
    }
  };

  const handleSaveCustomDays = () => {
    const days = Math.max(1, Math.min(365, Number(customDaysInput) || 1));
    updateRetentionSettings({ retention: "custom", customDays: days });
    setCustomDaysDialogOpen(false);
  };

  const formatExpiresIn = (expiresAt: string | null) => {
    if (!expiresAt) return t("trash.neverExpires");
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return t("trash.expiresIn", { time: isRtl ? "لحظات" : "moments" });

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      const hoursText = isRtl
        ? `${diffHours} ${diffHours === 1 ? "ساعة" : "ساعات"}`
        : `${diffHours} ${diffHours === 1 ? "hour" : "hours"}`;
      return t("trash.expiresIn", { time: hoursText });
    }

    const diffDays = Math.ceil(diffHours / 24);
    const daysText = isRtl
      ? `${diffDays} ${diffDays === 1 ? "يوم" : "أيام"}`
      : `${diffDays} ${diffDays === 1 ? "day" : "days"}`;
    return t("trash.expiresIn", { time: daysText });
  };

  const formatDeletedDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getRetentionDisplayLabel = () => {
    switch (settings.retention) {
      case "1d":
        return t("trash.retention1Day");
      case "3d":
        return t("trash.retention3Days");
      case "7d":
        return t("trash.retention7Days");
      case "30d":
        return t("trash.retention30Days");
      case "never":
        return t("trash.retentionNever");
      case "custom":
        return `${t("trash.retentionCustom")} (${settings.customDays || 7} ${t("trash.daysUnit")})`;
      default:
        return t("trash.retention7Days");
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default",
        overflowY: "auto",
        p: { xs: 2, sm: 3, md: 4 },
      }}
    >
      {/* Top Header Card */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "error.main",
              color: "common.white",
            }}
          >
            <DeleteOutline sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {t("trash.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("trash.subtitle")}
            </Typography>
          </Box>
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {/* Auto-clean retention selector button */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<TimerOutlined />}
            onClick={handleOpenRetentionMenu}
            sx={{
              borderRadius: 2,
              borderColor: "divider",
              color: "text.primary",
              textTransform: "none",
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "start" }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem", lineHeight: 1 }}>
                {t("trash.autoCleanSettings")}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
                {getRetentionDisplayLabel()}
              </Typography>
            </Box>
          </Button>

          {/* Retention Menu */}
          <Menu
            anchorEl={retentionAnchorEl}
            open={Boolean(retentionAnchorEl)}
            onClose={handleCloseRetentionMenu}
            transformOrigin={{ horizontal: isRtl ? "right" : "left", vertical: "top" }}
            anchorOrigin={{ horizontal: isRtl ? "right" : "left", vertical: "bottom" }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {t("trash.retentionLabel")}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              selected={settings.retention === "1d"}
              onClick={() => handleSelectRetention("1d")}
            >
              {t("trash.retention1Day")}
              {settings.retention === "1d" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
            <MenuItem
              selected={settings.retention === "3d"}
              onClick={() => handleSelectRetention("3d")}
            >
              {t("trash.retention3Days")}
              {settings.retention === "3d" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
            <MenuItem
              selected={settings.retention === "7d"}
              onClick={() => handleSelectRetention("7d")}
            >
              {t("trash.retention7Days")}
              {settings.retention === "7d" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
            <MenuItem
              selected={settings.retention === "30d"}
              onClick={() => handleSelectRetention("30d")}
            >
              {t("trash.retention30Days")}
              {settings.retention === "30d" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
            <MenuItem
              selected={settings.retention === "custom"}
              onClick={() => handleSelectRetention("custom")}
            >
              {t("trash.retentionCustom")}
              {settings.retention === "custom" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
            <Divider />
            <MenuItem
              selected={settings.retention === "never"}
              onClick={() => handleSelectRetention("never")}
            >
              {t("trash.retentionNever")}
              {settings.retention === "never" && <Check fontSize="small" sx={{ ml: isRtl ? 0 : "auto", mr: isRtl ? "auto" : 0 }} />}
            </MenuItem>
          </Menu>

          {/* Empty Trash Button */}
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<DeleteForever />}
            disabled={count === 0}
            onClick={() => setEmptyDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            {t("trash.emptyTrash")}
          </Button>
        </Box>
      </Paper>

      {/* Main Content Area */}
      {count === 0 ? (
        /* Empty State */
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 8,
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "action.hover",
              color: "text.disabled",
              mb: 2,
            }}
          >
            <DeleteOutline sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("trash.emptyTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {t("trash.emptySubtitle")}
          </Typography>
        </Box>
      ) : (
        /* List of Trashed Tasks */
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {t("trash.activeTasksCount", { count })}
            </Typography>
          </Box>

          {items.map((item) => (
            <Card
              key={item.id}
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                transition: "all 0.15s ease",
                "&:hover": {
                  boxShadow: 2,
                  borderColor: "text.disabled",
                },
              }}
            >
              <CardContent
                sx={{
                  p: 2,
                  "&:last-child": { pb: 2 },
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  alignItems: { xs: "flex-start", sm: "center" },
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                {/* Task Details */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={600}
                      sx={{
                        textDecoration: "line-through",
                        color: "text.secondary",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.task.title || "(Untitled)"}
                    </Typography>

                    {/* Original list tag */}
                    <Chip
                      size="small"
                      icon={<FolderOutlined sx={{ fontSize: "14px !important" }} />}
                      label={item.originalListTitle}
                      variant="outlined"
                      sx={{ height: 22, fontSize: "0.75rem", borderRadius: 1 }}
                    />
                  </Box>

                  {/* Notes snippet */}
                  {item.task.notes && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      <Notes sx={{ fontSize: 14, color: "text.disabled" }} />
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {item.task.notes}
                      </Typography>
                    </Box>
                  )}

                  {/* Metadata Chips: Deleted date & Expiry */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1, flexWrap: "wrap" }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <CalendarToday sx={{ fontSize: 13 }} />
                      {t("trash.deletedAt")}: {formatDeletedDate(item.deletedAt)}
                    </Typography>

                    <Chip
                      size="small"
                      icon={<AccessTime sx={{ fontSize: "13px !important" }} />}
                      label={formatExpiresIn(item.expiresAt)}
                      color={item.expiresAt ? "warning" : "default"}
                      variant="filled"
                      sx={{
                        height: 20,
                        fontSize: "0.7rem",
                        fontWeight: 500,
                        bgcolor: item.expiresAt ? "rgba(251, 140, 0, 0.12)" : "action.hover",
                        color: item.expiresAt ? "warning.dark" : "text.secondary",
                      }}
                    />
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    alignSelf: { xs: "flex-end", sm: "center" },
                  }}
                >
                  <Tooltip title={t("trash.restore")}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<RestoreFromTrash />}
                      onClick={() => restore(item.id)}
                      sx={{
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        boxShadow: "none",
                      }}
                    >
                      {t("trash.restore")}
                    </Button>
                  </Tooltip>

                  <Tooltip title={t("trash.deletePermanently")}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setTaskToDelete(item)}
                      sx={{
                        border: "1px solid",
                        borderColor: "rgba(244, 67, 54, 0.3)",
                        "&:hover": {
                          borderColor: "error.main",
                          bgcolor: "rgba(244, 67, 54, 0.08)",
                        },
                      }}
                    >
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Confirmation Dialog: Empty Trash */}
      <Dialog
        open={emptyDialogOpen}
        onClose={() => setEmptyDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("trash.confirmEmptyTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("trash.confirmEmptyMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setEmptyDialogOpen(false)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              emptyAll();
              setEmptyDialogOpen(false);
            }}
          >
            {t("trash.emptyTrash")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog: Permanent Delete Task */}
      <Dialog
        open={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("trash.confirmPermanentDeleteTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("trash.confirmPermanentDeleteMessage")}
          </DialogContentText>
          {taskToDelete && (
            <Typography variant="body2" fontWeight={600} sx={{ mt: 1, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
              {taskToDelete.task.title}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setTaskToDelete(null)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (taskToDelete) {
                removePermanently(taskToDelete.id);
                setTaskToDelete(null);
              }
            }}
          >
            {t("trash.deletePermanently")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Custom Days Retention Dialog */}
      <Dialog
        open={customDaysDialogOpen}
        onClose={() => setCustomDaysDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          {t("trash.retentionCustom")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t("trash.retentionLabel")}
          </DialogContentText>
          <TextField
            autoFocus
            type="number"
            label={t("trash.customDaysInput")}
            value={customDaysInput}
            onChange={(e) => setCustomDaysInput(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1, max: 365 }}
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCustomDaysDialogOpen(false)} color="inherit">
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSaveCustomDays}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
