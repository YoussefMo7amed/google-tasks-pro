/**
 * View Switcher Component
 * 
 * Elegant segmented control in the top bar to switch between
 * Board (الأعمدة), List (القائمة الموحدة), Calendar (التقويم), and Eisenhower Matrix (أيزنهاور).
 */

import {
  ToggleButtonGroup,
  ToggleButton,
  Box,
  Typography,
  Tooltip,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
} from "@mui/material";
import {
  ViewKanban,
  ViewList,
  CalendarMonth,
  GridView,
} from "@mui/icons-material";
import { useRecoilState } from "recoil";
import { taskViewModeAtom, TaskViewMode, viewStateAtom } from "../../store/atoms";
import { useTranslation } from "../../i18n";

export default function ViewSwitcher() {
  const { t, isRtl } = useTranslation();
  const [viewMode, setViewMode] = useRecoilState(taskViewModeAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);

  const selectMode = (newMode: TaskViewMode) => {
    if (!newMode) return;
    setViewMode(newMode);

    if (newMode === "eisenhower") {
      setViewState((prev) => ({ ...prev, view: "eisenhower" }));
    } else if (
      viewState.view === "eisenhower" ||
      viewState.view === "analytics" ||
      viewState.view === "trash"
    ) {
      setViewState((prev) => ({ ...prev, view: "all" }));
    }
  };

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: TaskViewMode | null
  ) => {
    if (newMode) selectMode(newMode);
  };

  // If viewState is currently eisenhower or analytics, reflect that
  const currentSelectedMode: TaskViewMode =
    viewState.view === "eisenhower"
      ? "eisenhower"
      : viewMode === "eisenhower"
      ? "board"
      : viewMode;

  return (
    <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
      <ToggleButtonGroup
        value={currentSelectedMode}
        exclusive
        onChange={handleModeChange}
        size="small"
        sx={{
          bgcolor: "action.hover",
          p: 0.35,
          borderRadius: "12px",
          border: 1,
          borderColor: "divider",
          "& .MuiToggleButtonGroup-grouped": {
            border: 0,
            borderRadius: "9px !important",
            mx: 0.25,
            px: 1.5,
            py: 0.4,
            textTransform: "none",
            color: "text.secondary",
            fontFamily: "Cairo, sans-serif",
            fontSize: "0.82rem",
            fontWeight: 600,
            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            "&.Mui-selected": {
              bgcolor: "background.paper",
              color: "primary.main",
              boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              "&:hover": {
                bgcolor: "background.paper",
              },
            },
            "&:hover": {
              bgcolor: "action.selected",
            },
          },
        }}
      >
        <Tooltip title={t("navigation.boardView")}>
          <ToggleButton value="board" aria-label={t("navigation.boardView")}>
            <ViewKanban sx={{ fontSize: 18, ...(isRtl ? { ml: { xs: 0, sm: 0.75 } } : { mr: { xs: 0, sm: 0.75 } }) }} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              {t("navigation.boardView")}
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title={t("navigation.listView")}>
          <ToggleButton value="list" aria-label={t("navigation.listView")}>
            <ViewList sx={{ fontSize: 18, ...(isRtl ? { ml: { xs: 0, sm: 0.75 } } : { mr: { xs: 0, sm: 0.75 } }) }} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              {t("navigation.listView")}
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title={t("navigation.calendarView")}>
          <ToggleButton value="calendar" aria-label={t("navigation.calendarView")}>
            <CalendarMonth sx={{ fontSize: 18, ...(isRtl ? { ml: { xs: 0, sm: 0.75 } } : { mr: { xs: 0, sm: 0.75 } }) }} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              {t("navigation.calendarView")}
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title={t("navigation.eisenhowerView")}>
          <ToggleButton value="eisenhower" aria-label={t("navigation.eisenhowerView")}>
            <GridView sx={{ fontSize: 18, ...(isRtl ? { ml: { xs: 0, sm: 0.75 } } : { mr: { xs: 0, sm: 0.75 } }) }} />
            <Typography variant="caption" sx={{ fontWeight: "inherit", display: { xs: "none", sm: "inline" } }}>
              {t("navigation.eisenhowerView")}
            </Typography>
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useRecoilState(taskViewModeAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);

  const selectMode = (newMode: TaskViewMode) => {
    if (!newMode) return;
    setViewMode(newMode);

    if (newMode === "eisenhower") {
      setViewState((prev) => ({ ...prev, view: "eisenhower" }));
    } else if (
      viewState.view === "eisenhower" ||
      viewState.view === "analytics" ||
      viewState.view === "trash"
    ) {
      setViewState((prev) => ({ ...prev, view: "all" }));
    }
  };

  const currentSelectedMode: TaskViewMode =
    viewState.view === "eisenhower"
      ? "eisenhower"
      : viewMode === "eisenhower"
      ? "board"
      : viewMode;

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "block", md: "none" },
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        flexShrink: 0,
      }}
    >
      <BottomNavigation
        showLabels
        value={currentSelectedMode}
        onChange={(_, val) => selectMode(val)}
        sx={{
          bgcolor: "transparent",
          height: 58,
          "& .MuiBottomNavigationAction-root": {
            minWidth: "auto",
            px: 1,
            py: 0.5,
            color: "text.secondary",
            "&.Mui-selected": {
              color: "primary.main",
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.75rem",
              fontWeight: 600,
              mt: 0.25,
              "&.Mui-selected": {
                fontSize: "0.75rem",
              },
            },
          },
        }}
      >
        <BottomNavigationAction
          label={t("navigation.boardView")}
          value="board"
          icon={<ViewKanban sx={{ fontSize: 22 }} />}
        />
        <BottomNavigationAction
          label={t("navigation.listView")}
          value="list"
          icon={<ViewList sx={{ fontSize: 22 }} />}
        />
        <BottomNavigationAction
          label={t("navigation.calendarView")}
          value="calendar"
          icon={<CalendarMonth sx={{ fontSize: 22 }} />}
        />
        <BottomNavigationAction
          label={t("navigation.eisenhowerView")}
          value="eisenhower"
          icon={<GridView sx={{ fontSize: 22 }} />}
        />
      </BottomNavigation>
    </Paper>
  );
}
