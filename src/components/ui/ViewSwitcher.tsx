/**
 * View Switcher Component
 * 
 * Elegant segmented control in the top bar to switch between
 * Board (الأعمدة), List (القائمة الموحدة), Calendar (التقويم), and Eisenhower Matrix (أيزنهاور).
 */

import { ToggleButtonGroup, ToggleButton, Box, Typography, Tooltip } from "@mui/material";
import {
  ViewKanban,
  ViewList,
  CalendarMonth,
  GridView,
} from "@mui/icons-material";
import { useRecoilState } from "recoil";
import { taskViewModeAtom, TaskViewMode, viewStateAtom } from "../../store/atoms";

export default function ViewSwitcher() {
  const [viewMode, setViewMode] = useRecoilState(taskViewModeAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);

  const handleModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: TaskViewMode | null
  ) => {
    if (!newMode) return;
    setViewMode(newMode);

    // Synchronize with viewState if necessary
    if (newMode === "eisenhower") {
      setViewState((prev) => ({ ...prev, view: "eisenhower" }));
    } else if (viewState.view === "eisenhower") {
      setViewState((prev) => ({ ...prev, view: "all" }));
    }
  };

  // If viewState is currently eisenhower or analytics, reflect that
  const currentSelectedMode: TaskViewMode =
    viewState.view === "eisenhower"
      ? "eisenhower"
      : viewMode === "eisenhower"
      ? "board"
      : viewMode;

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
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
        <Tooltip title="لوحة الأعمدة (Board View)">
          <ToggleButton value="board" aria-label="لوحة الأعمدة">
            <ViewKanban sx={{ fontSize: 18, mr: 0.75 }} />
            <Typography variant="caption" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "inherit" }}>
              الأعمدة
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title="القائمة الموحدة (List View)">
          <ToggleButton value="list" aria-label="قائمة موحدة">
            <ViewList sx={{ fontSize: 18, mr: 0.75 }} />
            <Typography variant="caption" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "inherit" }}>
              القائمة
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title="التقويم والمواعيد (Calendar View)">
          <ToggleButton value="calendar" aria-label="التقويم والمواعيد">
            <CalendarMonth sx={{ fontSize: 18, mr: 0.75 }} />
            <Typography variant="caption" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "inherit" }}>
              التقويم
            </Typography>
          </ToggleButton>
        </Tooltip>

        <Tooltip title="مصفوفة أيزنهاور (Eisenhower Matrix)">
          <ToggleButton value="eisenhower" aria-label="مصفوفة أيزنهاور">
            <GridView sx={{ fontSize: 18, mr: 0.75 }} />
            <Typography variant="caption" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: "inherit" }}>
              أيزنهاور
            </Typography>
          </ToggleButton>
        </Tooltip>
      </ToggleButtonGroup>
    </Box>
  );
}
