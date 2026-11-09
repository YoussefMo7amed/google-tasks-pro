/**
 * Task Filter Bar Component
 * 
 * Sleek, compact toolbar across Board (الأعمدة), List (القائمة), and Eisenhower (أيزنهاور) views.
 * 
 * Features:
 * - Ultra-compact 1-line search bar saving maximum vertical screen space on mobile & desktop.
 * - Dedicated Filter/Tune button that opens a clean Popover with all Date, Status, and Sorting options.
 * - Active indicator badge on the filter button when custom filters are active.
 * - Removable quick pills (chips) below search only when non-default filters are active.
 */

import React, { useState } from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Typography,
  Tooltip,
  Badge,
  Popover,
  Button,
  Divider,
  SxProps,
  Theme,
} from "@mui/material";
import { Search, Clear, TuneRounded } from "@mui/icons-material";
import { useRecoilState } from "recoil";
import { taskFilterAtom, TaskStatusFilter, TaskDateFilter } from "../../store";
import { useTranslation } from "../../i18n";

interface TaskFilterBarProps {
  popoverContent?: React.ReactNode;
  endContent?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function TaskFilterBar({
  popoverContent,
  endContent,
  sx,
}: TaskFilterBarProps) {
  const { t, isRtl } = useTranslation();
  const [filter, setFilter] = useRecoilState(taskFilterAtom);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isPopoverOpen = Boolean(anchorEl);

  const handleOpenPopover = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleSearchChange = (value: string) => {
    setFilter((prev) => ({ ...prev, search: value }));
  };

  const handleDateChange = (date: TaskDateFilter) => {
    setFilter((prev) => ({ ...prev, date }));
  };

  const handleStatusChange = (status: TaskStatusFilter) => {
    setFilter((prev) => ({ ...prev, status }));
  };

  const handleResetFilters = () => {
    setFilter((prev) => ({
      ...prev,
      status: "pending",
      date: "all",
    }));
  };

  const hasActiveFilters = filter.status !== "pending" || filter.date !== "all";

  const getDateLabel = (date: TaskDateFilter): string => {
    switch (date) {
      case "today":
        return t("tasks.today");
      case "thisWeek":
        return t("tasks.thisWeek");
      case "thisMonth":
        return t("tasks.thisMonth");
      case "all":
      default:
        return t("tasks.allDates");
    }
  };

  const getStatusLabel = (status: TaskStatusFilter): string => {
    switch (status) {
      case "overdue":
        return t("tasks.overdue");
      case "completed":
        return t("tasks.completed");
      case "all":
        return t("common.all");
      case "pending":
      default:
        return t("tasks.pending");
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1, sm: 1.25 },
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        ...sx,
      }}
    >
      {/* Main Single-line Search and Actions Bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
        {/* Search Input */}
        <TextField
          placeholder={`${t("common.search")}...`}
          size="small"
          value={filter.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              height: 38,
              fontSize: "0.88rem",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: filter.search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearchChange("")}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Filter Configuration Button */}
        <Tooltip title={t("tasks.filterOptions")}>
          <IconButton
            size="small"
            onClick={handleOpenPopover}
            aria-label={t("tasks.filterOptions")}
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              border: 1,
              borderColor: hasActiveFilters ? "primary.main" : "divider",
              bgcolor: hasActiveFilters ? "rgba(25, 118, 210, 0.12)" : "action.hover",
              color: hasActiveFilters ? "primary.main" : "text.secondary",
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: hasActiveFilters ? "rgba(25, 118, 210, 0.2)" : "action.selected",
                color: hasActiveFilters ? "primary.main" : "text.primary",
              },
            }}
          >
            <Badge
              color="primary"
              variant="dot"
              invisible={!hasActiveFilters}
              sx={{ "& .MuiBadge-badge": { top: -1, right: -1 } }}
            >
              <TuneRounded sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* End Content Slot (e.g. Expand/Collapse all in List view) */}
        {endContent}
      </Box>

      {/* Active Filter Pills: Visible ONLY when non-default filters are set */}
      {hasActiveFilters && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexWrap: "wrap",
            pt: 0.25,
            px: 0.25,
          }}
        >
          {filter.date !== "all" && (
            <Chip
              size="small"
              label={`${t("tasks.filterByDate")}: ${getDateLabel(filter.date)}`}
              onDelete={() => handleDateChange("all")}
              color="primary"
              variant="filled"
              sx={{ height: 24, fontSize: "0.72rem", fontWeight: 600 }}
            />
          )}
          {filter.status !== "pending" && (
            <Chip
              size="small"
              label={`${t("tasks.status")}: ${getStatusLabel(filter.status)}`}
              onDelete={() => handleStatusChange("pending")}
              color={
                filter.status === "overdue"
                  ? "error"
                  : filter.status === "completed"
                  ? "success"
                  : "default"
              }
              variant="filled"
              sx={{
                height: 24,
                fontSize: "0.72rem",
                fontWeight: 600,
                ...(filter.status === "overdue" && {
                  bgcolor: "error.main",
                  color: "#fff",
                }),
              }}
            />
          )}
          <Button
            size="small"
            onClick={handleResetFilters}
            sx={{
              p: 0,
              minWidth: "auto",
              fontSize: "0.72rem",
              textTransform: "none",
              color: "text.secondary",
              "&:hover": { color: "primary.main" },
            }}
          >
            {t("tasks.resetFilters")}
          </Button>
        </Box>
      )}

      {/* Filter & Sort Popover */}
      <Popover
        open={isPopoverOpen}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isRtl ? "left" : "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: isRtl ? "left" : "right",
        }}
        PaperProps={{
          elevation: 8,
          sx: {
            p: 2,
            width: { xs: 290, sm: 340 },
            borderRadius: 3,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            mt: 0.75,
          },
        }}
      >
        {/* Popover Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
            <TuneRounded sx={{ fontSize: 18, color: "primary.main" }} />
            {t("tasks.filterOptions")}
          </Typography>
          {hasActiveFilters && (
            <Button
              size="small"
              onClick={handleResetFilters}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                p: 0.25,
                color: "text.secondary",
                "&:hover": { color: "error.main" },
              }}
            >
              {t("tasks.resetFilters")}
            </Button>
          )}
        </Box>

        {/* Date Filter Section */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: "block" }}>
            {t("tasks.filterByDate")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("tasks.allDates")}
              variant={filter.date === "all" ? "filled" : "outlined"}
              color={filter.date === "all" ? "primary" : "default"}
              clickable
              onClick={() => handleDateChange("all")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.date === "all" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.today")}
              variant={filter.date === "today" ? "filled" : "outlined"}
              color={filter.date === "today" ? "primary" : "default"}
              clickable
              onClick={() => handleDateChange("today")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.date === "today" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.thisWeek")}
              variant={filter.date === "thisWeek" ? "filled" : "outlined"}
              color={filter.date === "thisWeek" ? "primary" : "default"}
              clickable
              onClick={() => handleDateChange("thisWeek")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.date === "thisWeek" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.thisMonth")}
              variant={filter.date === "thisMonth" ? "filled" : "outlined"}
              color={filter.date === "thisMonth" ? "primary" : "default"}
              clickable
              onClick={() => handleDateChange("thisMonth")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.date === "thisMonth" ? 600 : 400 }}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Status Filter Section */}
        <Box sx={{ mb: popoverContent ? 1.5 : 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75, display: "block" }}>
            {t("tasks.status")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("tasks.pending")}
              variant={filter.status === "pending" ? "filled" : "outlined"}
              color={filter.status === "pending" ? "primary" : "default"}
              clickable
              onClick={() => handleStatusChange("pending")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.status === "pending" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.overdue")}
              variant={filter.status === "overdue" ? "filled" : "outlined"}
              color={filter.status === "overdue" ? "error" : "default"}
              clickable
              onClick={() => handleStatusChange("overdue")}
              sx={{
                fontSize: "0.75rem",
                fontWeight: filter.status === "overdue" ? 600 : 400,
                ...(filter.status === "overdue" && {
                  bgcolor: "error.main",
                  color: "#fff",
                }),
              }}
            />
            <Chip
              size="small"
              label={t("tasks.completed")}
              variant={filter.status === "completed" ? "filled" : "outlined"}
              color={filter.status === "completed" ? "success" : "default"}
              clickable
              onClick={() => handleStatusChange("completed")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.status === "completed" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("common.all")}
              variant={filter.status === "all" ? "filled" : "outlined"}
              clickable
              onClick={() => handleStatusChange("all")}
              sx={{ fontSize: "0.75rem", fontWeight: filter.status === "all" ? 600 : 400 }}
            />
          </Box>
        </Box>

        {/* Extra Popover Content (e.g. Sort by in List view) */}
        {popoverContent && (
          <>
            <Divider sx={{ my: 1.5 }} />
            {popoverContent}
          </>
        )}
      </Popover>
    </Paper>
  );
}
