/**
 * Mobile Bottom Navigation Component
 *
 * Fixed bottom navigation bar for mobile viewports with full
 * safe-area insets support (avoiding home indicators & 3-button navigation bars).
 */

import { Paper, BottomNavigation, BottomNavigationAction } from "@mui/material";
import {
  ViewKanban,
  ViewList,
  CalendarMonth,
  GridView,
} from "@mui/icons-material";
import { useRecoilState } from "recoil";
import { taskViewModeAtom, TaskViewMode, viewStateAtom } from "../../store/atoms";
import { useTranslation } from "../../i18n";

export default function MobileBottomNav() {
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
      elevation={3}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        pb: "max(12px, env(safe-area-inset-bottom))",
        minHeight: "calc(56px + max(12px, env(safe-area-inset-bottom)))",
        boxSizing: "border-box",
      }}
    >
      <BottomNavigation
        showLabels
        value={currentSelectedMode}
        onChange={(_, val) => selectMode(val)}
        sx={{
          bgcolor: "transparent",
          height: 56,
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
