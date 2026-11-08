/**
 * Task Filter Bar Component
 * 
 * Shared toolbar across Board (الأعمدة), List (القائمة), and Eisenhower (أيزنهاور) views.
 * Provides:
 * - Search by task title or notes
 * - Due date filter (All, Today, This Week, This Month)
 * - Status filter (Pending, Overdue, Completed, All)
 * - Optional custom slots for view-specific controls (e.g. GroupBy, Collapse/Expand all)
 */

import React from "react";
import {
  Box,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Typography,
  SxProps,
  Theme,
} from "@mui/material";
import { Search, Clear } from "@mui/icons-material";
import { useRecoilState } from "recoil";
import { taskFilterAtom, TaskStatusFilter, TaskDateFilter } from "../../store";
import { useTranslation } from "../../i18n";

interface TaskFilterBarProps {
  middleContent?: React.ReactNode;
  endContent?: React.ReactNode;
  sx?: SxProps<Theme>;
}

export default function TaskFilterBar({
  middleContent,
  endContent,
  sx,
}: TaskFilterBarProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useRecoilState(taskFilterAtom);

  const handleSearchChange = (value: string) => {
    setFilter((prev) => ({ ...prev, search: value }));
  };

  const handleDateChange = (date: TaskDateFilter) => {
    setFilter((prev) => ({ ...prev, date }));
  };

  const handleStatusChange = (status: TaskStatusFilter) => {
    setFilter((prev) => ({ ...prev, status }));
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        ...sx,
      }}
    >
      {/* Search Input */}
      <TextField
        placeholder={`${t("common.search")}...`}
        size="small"
        value={filter.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{
          minWidth: 180,
          flex: { xs: "1 1 100%", sm: "0 1 240px" },
          "& .MuiOutlinedInput-root": {
            borderRadius: 2,
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

      {/* Middle Content Slot (e.g. GroupBy chips in List view) */}
      {middleContent}

      {/* Date Filter */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t("tasks.filterByDate")}:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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

      {/* Status Filter */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t("tasks.status")}:
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
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

      {/* End Content Slot */}
      {endContent}
    </Paper>
  );
}
