/**
 * Task Analytics & Streak View (الإحصائيات وسجل الإنجاز)
 * 
 * Displays:
 * - Daily streak counter (🔥 Days Streak)
 * - 14-day completion activity graph
 * - Eisenhower Quadrants productivity breakdown
 * - Detailed completion timeline log with exact timestamps
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  LocalFireDepartment,
  EmojiEvents,
  CheckCircle,
  DateRange,
  PieChart,
  History,
  DeleteOutline,
} from "@mui/icons-material";
import {
  historyService,
  StreakStats,
  CompletedHistoryItem,
} from "../../services/history.service";
import { useTranslation } from "../../i18n";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store";

interface AnalyticsViewProps {
  isVisible?: boolean;
}

export default function AnalyticsView({ isVisible = true }: AnalyticsViewProps) {
  const { t, language } = useTranslation();
  const taskLists = useRecoilValue(taskListsAtom);

  const [stats, setStats] = useState<StreakStats>({
    currentStreak: 0,
    longestStreak: 0,
    completedToday: 0,
    completedThisWeek: 0,
    totalCompleted: 0,
  });

  const [dailyActivity, setDailyActivity] = useState<
    ReturnType<typeof historyService.getDailyActivity>
  >([]);

  const [quadrantBreakdown, setQuadrantBreakdown] = useState<
    ReturnType<typeof historyService.getQuadrantBreakdown>
  >({ Q1: 0, Q2: 0, Q3: 0, Q4: 0, Other: 0 });

  const [historyItems, setHistoryItems] = useState<CompletedHistoryItem[]>([]);

  const refreshStats = useCallback(() => {
    setStats(historyService.getStreakStats());
    setDailyActivity(historyService.getDailyActivity(14));
    setQuadrantBreakdown(historyService.getQuadrantBreakdown());
    setHistoryItems(historyService.getHistory());
  }, []);

  useEffect(() => {
    refreshStats();
    const unsubscribe = historyService.subscribe(refreshStats);
    return unsubscribe;
  }, [refreshStats]);

  useEffect(() => {
    if (isVisible) {
      refreshStats();
    }
  }, [isVisible, refreshStats]);

  // Sync historical tasks from current task lists
  useEffect(() => {
    if (taskLists && taskLists.length > 0) {
      historyService.syncFromTaskLists(taskLists);
    }
  }, [taskLists]);

  const maxDailyCount = Math.max(1, ...dailyActivity.map((d) => d.count));
  const totalCategorized =
    quadrantBreakdown.Q1 +
    quadrantBreakdown.Q2 +
    quadrantBreakdown.Q3 +
    quadrantBreakdown.Q4;

  const q2Ratio =
    totalCategorized > 0
      ? Math.round((quadrantBreakdown.Q2 / totalCategorized) * 100)
      : 0;

  // Format date labels dynamically according to active language
  const formattedActivity = useMemo(() => {
    return dailyActivity.map((day) => {
      const parts = day.dateKey.split("-");
      let localizedLabel = day.label;
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        localizedLabel = d.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
          weekday: "narrow",
          month: "numeric",
          day: "numeric",
        });
      }
      return {
        ...day,
        localizedLabel,
      };
    });
  }, [dailyActivity, language]);

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 3,
        overflowY: "auto",
        bgcolor: "background.default",
        gap: 3,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            <span>📊</span>
            <span>{t("analytics.title")}</span>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {t("analytics.subtitle")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={language === "ar" ? "تصفير وإعادة ضبط السجل" : "Reset analytics history"}>
            <IconButton
              size="small"
              onClick={() => {
                historyService.clearHistory();
                refreshStats();
              }}
              sx={{
                color: "text.secondary",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                "&:hover": { color: "error.main", borderColor: "error.main" },
              }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Top Stat Cards & Streak Showcase */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "2fr 1fr 1fr 1fr" },
          gap: 2,
        }}
      >
        {/* Streak Hero Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "warning.dark",
            background: "linear-gradient(135deg, rgba(251, 140, 0, 0.12) 0%, rgba(30, 31, 32, 1) 100%)",
            display: "flex",
            alignItems: "center",
            gap: 2.5,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(251, 140, 0, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ff9800",
              boxShadow: "0 0 20px rgba(251, 140, 0, 0.4)",
              flexShrink: 0,
            }}
          >
            <LocalFireDepartment sx={{ fontSize: 40 }} />
          </Box>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                color: "#ffb74d",
                display: "flex",
                alignItems: "baseline",
                gap: 1,
              }}
            >
              <span>{stats.currentStreak}</span>
              <Typography
                component="span"
                sx={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffb74d" }}
              >
                {stats.currentStreak === 1 ? t("analytics.daySingular") : t("analytics.daysPlural")}
              </Typography>
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              <span>{t("analytics.currentStreak")}</span>
              <span>🔥</span>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
              {t("analytics.personalBest", { days: stats.longestStreak })}
            </Typography>
          </Box>
        </Paper>

        {/* Completed Today */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <CheckCircle sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("analytics.completedToday")}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats.completedToday}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("analytics.tasksToday")}
          </Typography>
        </Paper>

        {/* Completed This Week */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <DateRange sx={{ color: "info.main", fontSize: 20 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("analytics.past7Days")}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats.completedThisWeek}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("analytics.tasksPastWeek")}
          </Typography>
        </Paper>

        {/* All-Time Completed */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <EmojiEvents sx={{ color: "warning.main", fontSize: 20 }} />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("analytics.totalRecorded")}
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {stats.totalCompleted}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("analytics.lifetimeCompleted")}
          </Typography>
        </Paper>
      </Box>

      {/* 14-Day Activity Bar Chart */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "16px",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <span>📈</span>
          <span>{t("analytics.activityTitle")}</span>
        </Typography>

        <Box
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1.5,
            height: 180,
            pt: 2,
            pb: 1,
            overflowX: "auto",
          }}
        >
          {formattedActivity.map((day) => {
            const heightPercent = Math.max(6, (day.count / maxDailyCount) * 100);
            return (
              <Tooltip
                key={day.dateKey}
                title={`${day.dateKey}: ${t("analytics.activityTooltip", { count: day.count })}`}
                arrow
              >
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 32,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: day.count > 0 ? "primary.main" : "text.disabled",
                    }}
                  >
                    {day.count > 0 ? day.count : ""}
                  </Typography>
                  <Box
                    sx={{
                      width: "100%",
                      maxWidth: 36,
                      height: `${heightPercent}%`,
                      bgcolor:
                        day.count > 0
                          ? "primary.main"
                          : "rgba(255, 255, 255, 0.05)",
                      borderRadius: "6px 6px 0 0",
                      transition: "height 0.3s ease, background-color 0.2s",
                      "&:hover": {
                        bgcolor: day.count > 0 ? "primary.light" : "rgba(255, 255, 255, 0.1)",
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.7rem",
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {day.localizedLabel}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Paper>

      {/* Focus & Eisenhower Distribution */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 2.5,
        }}
      >
        {/* Quadrant Breakdown */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <PieChart sx={{ color: "primary.main", fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("analytics.eisenhowerTitle")}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Q1 */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: "#f28b82", fontWeight: 600 }}>
                  🔴 {t("analytics.q1Label")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {quadrantBreakdown.Q1}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalCategorized > 0 ? (quadrantBreakdown.Q1 / totalCategorized) * 100 : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "rgba(242, 139, 130, 0.15)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#f28b82" },
                }}
              />
            </Box>

            {/* Q2 */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: "#8ab4f8", fontWeight: 600 }}>
                  🔵 {t("analytics.q2Label")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {quadrantBreakdown.Q2} ({q2Ratio}%)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalCategorized > 0 ? (quadrantBreakdown.Q2 / totalCategorized) * 100 : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "rgba(138, 180, 248, 0.15)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#8ab4f8" },
                }}
              />
            </Box>

            {/* Q3 */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: "#fdd663", fontWeight: 600 }}>
                  🟡 {t("analytics.q3Label")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {quadrantBreakdown.Q3}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalCategorized > 0 ? (quadrantBreakdown.Q3 / totalCategorized) * 100 : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "rgba(253, 214, 99, 0.15)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#fdd663" },
                }}
              />
            </Box>

            {/* Q4 */}
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="body2" sx={{ color: "#c58af9", fontWeight: 600 }}>
                  ⚪ {t("analytics.q4Label")}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {quadrantBreakdown.Q4}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={totalCategorized > 0 ? (quadrantBreakdown.Q4 / totalCategorized) * 100 : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "rgba(197, 138, 249, 0.15)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#c58af9" },
                }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Deep Work Insight */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: "16px",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
              <span>💡</span>
              <span>{t("analytics.insightTitle")}</span>
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6, textAlign: "start" }}
            >
              {t("analytics.insightBody")}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: "12px",
              bgcolor: "rgba(138, 180, 248, 0.08)",
              border: "1px solid",
              borderColor: "primary.dark",
              mt: 2,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
              {t("analytics.deepWorkRatio", { ratio: q2Ratio })}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {q2Ratio >= 40
                ? t("analytics.insightExcellent")
                : t("analytics.insightImprove")}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Completion History Log */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "16px",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <History sx={{ color: "primary.main", fontSize: 22 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("analytics.recentLogTitle")} ({historyItems.length})
          </Typography>
        </Box>

        {historyItems.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" dir="auto">
              {t("analytics.noCompletedTasks")}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {historyItems.slice(0, 30).map((item) => {
              const dateObj = new Date(item.completedAt);
              const timeStr = dateObj.toLocaleTimeString(language === "ar" ? "ar-EG" : "en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const dateStr = dateObj.toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                month: "short",
                day: "numeric",
              });

              return (
                <Box
                  key={`${item.id}-${item.completedAt}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    py: 1,
                    px: 1.5,
                    borderRadius: "8px",
                    bgcolor: "background.default",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                    <CheckCircle sx={{ color: "success.main", fontSize: 18 }} />
                    {item.quadrant && (
                      <Chip
                        label={item.quadrant}
                        size="small"
                        color={
                          item.quadrant === "Q1"
                            ? "error"
                            : item.quadrant === "Q2"
                            ? "primary"
                            : item.quadrant === "Q3"
                            ? "warning"
                            : "default"
                        }
                        sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700 }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      dir="auto"
                      sx={{
                        fontWeight: 500,
                        unicodeBidi: "plaintext",
                        textAlign: "start",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginInlineStart: 2 }}>
                    {item.listName && (
                      <Chip
                        label={item.listName}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {dateStr} {t("analytics.atTime")} {timeStr}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
