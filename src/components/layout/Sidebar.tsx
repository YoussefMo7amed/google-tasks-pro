/**
 * Sidebar Component
 * 
 * Navigation sidebar with starred view, task list management, and collapse functionality.
 */

import { useState, useEffect } from "react";
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Collapse,
  Divider,
  Checkbox,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import { SidebarView } from "../../types/app";
import {
  Add,
  TaskAlt,
  StarBorder,
  Star,
  ExpandLess,
  ExpandMore,
  FormatListBulleted,
  ChevronLeft,
  ChevronRight,
  Settings,
  GridView,
  LocalFireDepartment,
  CloudDone,
  CloudOff,
  Sync,
  AutoAwesome,
} from "@mui/icons-material";
import { useRecoilState, useRecoilValue } from "recoil";
import { viewStateAtom, starredTaskIdsAtom, aiCopilotOpenAtom, settingsOpenAtom } from "../../store";
import { useTaskLists } from "../../hooks";
import { syncQueueService } from "../../services/sync-queue.service";
import AddCategoryDialog from "../ui/AddCategoryDialog";
import SettingsDialog from "../ui/SettingsDialog";

interface SidebarProps {
  onViewChange?: (view: SidebarView, listId?: string) => void;
}

export default function Sidebar({ onViewChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [listsExpanded, setListsExpanded] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showSettings, setShowSettings] = useRecoilState(settingsOpenAtom);
  const [, setShowAiCopilot] = useRecoilState(aiCopilotOpenAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);
  const starredIds = useRecoilValue(starredTaskIdsAtom);
  const { taskLists, toggleListVisibility, fetchTaskLists } = useTaskLists();

  const [pendingCount, setPendingCount] = useState(syncQueueService.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(syncQueueService.getIsSyncing());
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const unsubscribe = syncQueueService.subscribe((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });

    const handleOnline = () => {
      setIsOnline(true);
      fetchTaskLists(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchTaskLists]);

  const handleViewAll = () => {
    setViewState({ view: "all", activeListId: undefined, activeListIndex: -1 });
    onViewChange?.("all");
  };

  const handleViewStarred = () => {
    setViewState({ view: "starred", activeListId: undefined, activeListIndex: -2 });
    onViewChange?.("starred");
  };

  const handleViewEisenhower = () => {
    setViewState({ view: "eisenhower", activeListId: undefined, activeListIndex: -3 });
    onViewChange?.("eisenhower");
  };

  const handleViewAnalytics = () => {
    setViewState({ view: "analytics", activeListId: undefined, activeListIndex: -4 });
    onViewChange?.("analytics");
  };

  const handleListClick = (listId: string, index: number) => {
    setViewState({ view: "list", activeListId: listId, activeListIndex: index });
    onViewChange?.("list", listId);
  };

  const handleToggleVisibility = (e: React.MouseEvent, listId: string) => {
    e.stopPropagation();
    console.log("Toggling visibility for list:", listId);
    toggleListVisibility(listId);
  };

  const starredCount = starredIds.size;
  const sidebarWidth = isCollapsed ? 64 : 260;

  return (
    <>
      <Box
        sx={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: "100%",
          borderRight: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          overflow: "hidden",
          transition: "width 0.2s ease-in-out, min-width 0.2s ease-in-out",
        }}
      >
        {/* Collapse Toggle */}
        <Box
          sx={{
            display: "flex",
            justifyContent: isCollapsed ? "center" : "flex-end",
            p: 1,
          }}
        >
          <Tooltip title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Create Button */}
        {!isCollapsed && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddCategory(true)}
              sx={{
                borderRadius: "28px",
                textTransform: "none",
                py: 1.25,
                px: 2.75,
                fontWeight: 600,
                fontSize: "0.9rem",
                bgcolor: "background.paper",
                color: "primary.main",
                border: 1,
                borderColor: "divider",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
            >
              Create
            </Button>
          </Box>
        )}

        {/* Middle Scrollable Section: Navigation & Lists */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 4 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "action.disabled",
              borderRadius: 2,
            },
          }}
        >
          {isCollapsed ? (
            /* Collapsed Mode Icons */
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, py: 1 }}>
              <Tooltip title="Create new list" placement="right">
                <IconButton onClick={() => setShowAddCategory(true)}>
                  <Add />
                </IconButton>
              </Tooltip>
              <Divider sx={{ width: "80%", my: 0.5 }} />
              <Tooltip title="All tasks" placement="right">
                <IconButton 
                  onClick={handleViewAll}
                  color={viewState.view === "all" ? "primary" : "default"}
                >
                  <TaskAlt />
                </IconButton>
              </Tooltip>
              <Tooltip title={`Starred (${starredCount})`} placement="right">
                <IconButton 
                  onClick={handleViewStarred}
                  color={viewState.view === "starred" ? "warning" : "default"}
                >
                  {viewState.view === "starred" ? <Star /> : <StarBorder />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Eisenhower Matrix" placement="right">
                <IconButton 
                  onClick={handleViewEisenhower}
                  color={viewState.view === "eisenhower" ? "primary" : "default"}
                >
                  <GridView />
                </IconButton>
              </Tooltip>
              <Tooltip title="Analytics & Streaks" placement="right">
                <IconButton 
                  onClick={handleViewAnalytics}
                  color={viewState.view === "analytics" ? "warning" : "default"}
                >
                  <LocalFireDepartment />
                </IconButton>
              </Tooltip>
              <Tooltip title="AI Copilot (⌘K)" placement="right">
                <IconButton 
                  onClick={() => setShowAiCopilot(true)}
                  color="primary"
                >
                  <AutoAwesome />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            /* Expanded Mode Items */
            <>
              {/* Navigation Items */}
              <List sx={{ py: 0 }}>
                {/* All Tasks */}
                <ListItemButton
                  selected={viewState.view === "all"}
                  onClick={handleViewAll}
                  sx={{
                    borderRadius: "0 24px 24px 0",
                    mr: 2,
                    "&.Mui-selected": {
                      bgcolor: "primary.dark",
                      "&:hover": { bgcolor: "primary.dark" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <TaskAlt fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="All tasks"
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </ListItemButton>

                {/* Starred */}
                <ListItemButton
                  selected={viewState.view === "starred"}
                  onClick={handleViewStarred}
                  sx={{
                    borderRadius: "0 24px 24px 0",
                    mr: 2,
                    "&.Mui-selected": {
                      bgcolor: "warning.dark",
                      "&:hover": { bgcolor: "warning.dark" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {viewState.view === "starred" ? (
                      <Star fontSize="small" color="warning" />
                    ) : (
                      <StarBorder fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary="Starred"
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                  {starredCount > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {starredCount}
                    </Typography>
                  )}
                </ListItemButton>

                {/* Eisenhower Matrix */}
                <ListItemButton
                  selected={viewState.view === "eisenhower"}
                  onClick={handleViewEisenhower}
                  sx={{
                    borderRadius: "0 24px 24px 0",
                    mr: 2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(138, 180, 248, 0.16)",
                      "&:hover": { bgcolor: "rgba(138, 180, 248, 0.2)" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <GridView
                      fontSize="small"
                      color={viewState.view === "eisenhower" ? "primary" : "inherit"}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Eisenhower Matrix"
                    secondary="مصفوفة أيزنهاور"
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: viewState.view === "eisenhower" ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                  />
                </ListItemButton>

                {/* Analytics & Streaks */}
                <ListItemButton
                  selected={viewState.view === "analytics"}
                  onClick={handleViewAnalytics}
                  sx={{
                    borderRadius: "0 24px 24px 0",
                    mr: 2,
                    "&.Mui-selected": {
                      bgcolor: "rgba(251, 140, 0, 0.16)",
                      "&:hover": { bgcolor: "rgba(251, 140, 0, 0.2)" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LocalFireDepartment
                      fontSize="small"
                      sx={{
                        color:
                          viewState.view === "analytics"
                            ? "#ff9800"
                            : "text.secondary",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="Analytics & Streaks"
                    secondary="الإحصائيات والإنجاز"
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: viewState.view === "analytics" ? 600 : 400,
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                  />
                </ListItemButton>

                {/* AI Copilot */}
                <ListItemButton
                  onClick={() => setShowAiCopilot(true)}
                  sx={{
                    borderRadius: "0 24px 24px 0",
                    mr: 2,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AutoAwesome
                      fontSize="small"
                      sx={{ color: "primary.main" }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary="AI Copilot"
                    secondary="المساعد الذكي للمهام"
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                      color: "primary.main",
                    }}
                    secondaryTypographyProps={{
                      variant: "caption",
                      color: "text.secondary",
                    }}
                  />
                  <Chip
                    label="⌘K"
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      bgcolor: "action.selected",
                      color: "text.secondary",
                    }}
                  />
                </ListItemButton>
              </List>

              <Divider sx={{ my: 1 }} />

              {/* Lists Section Header */}
              <ListItemButton
                onClick={() => setListsExpanded(!listsExpanded)}
                sx={{ height: "40px", flexGrow: 0 }}
              >
                <ListItemText
                  primary="Lists"
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                />
                {listsExpanded ? (
                  <ExpandLess fontSize="small" />
                ) : (
                  <ExpandMore fontSize="small" />
                )}
              </ListItemButton>

              {/* Task Lists */}
              <Collapse in={listsExpanded} timeout="auto">
                <List sx={{ py: 0 }}>
                  {taskLists.map((list, index) => (
                    <ListItemButton
                      key={list.id}
                      selected={viewState.activeListId === list.id}
                      onClick={() => handleListClick(list.id, index)}
                      sx={{
                        borderRadius: "0 24px 24px 0",
                        mr: 1.5,
                        py: 0.75,
                        px: 1.5,
                        opacity: list.isVisible ? 1 : 0.5,
                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                          "&:hover": { bgcolor: "action.selected" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <Checkbox
                          size="small"
                          checked={list.isVisible}
                          onClick={(e) => handleToggleVisibility(e, list.id)}
                          sx={{ p: 0.5 }}
                        />
                      </ListItemIcon>
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <FormatListBulleted fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={list.title}
                        dir="auto"
                        primaryTypographyProps={{
                          variant: "body2",
                          noWrap: true,
                          sx: {
                            textDecoration: list.isVisible ? "none" : "line-through",
                            fontWeight: viewState.activeListId === list.id ? 600 : 400,
                            unicodeBidi: "plaintext",
                            textAlign: "start",
                          },
                        }}
                      />
                      {list.incompleteCount > 0 && (
                        <Typography
                          variant="caption"
                          dir="ltr"
                          sx={{
                            ml: 1,
                            fontSize: "0.75rem",
                            color: "text.secondary",
                            bgcolor: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "10px",
                            px: 0.8,
                            py: 0.1,
                            fontWeight: 500,
                          }}
                        >
                          {list.incompleteCount}
                        </Typography>
                      )}
                    </ListItemButton>
                  ))}

                  {/* Create new list */}
                  <ListItemButton
                    onClick={() => setShowAddCategory(true)}
                    sx={{
                      borderRadius: "0 24px 24px 0",
                      mr: 2,
                      py: 0.75,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Add fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Create new list"
                      primaryTypographyProps={{
                        variant: "body2",
                        color: "text.secondary",
                      }}
                    />
                  </ListItemButton>
                </List>
              </Collapse>
            </>
          )}
        </Box>

        {/* Pinned Bottom Section: Sync Status & Settings */}
        <Box
          sx={{
            flexShrink: 0,
            mt: "auto",
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "background.default",
            pt: 1.25,
            pb: 0.5,
          }}
        >
          {/* Offline & Sync Status Indicator */}
          <Box
            onClick={() => {
              if (isOnline) {
                fetchTaskLists(true);
              }
            }}
            sx={{
              mx: isCollapsed ? 1 : 2,
              mb: 1,
              py: 0.75,
              px: isCollapsed ? 0.5 : 1.5,
              borderRadius: "12px",
              bgcolor: !isOnline
                ? "rgba(251, 140, 0, 0.12)"
                : pendingCount > 0
                ? "rgba(138, 180, 248, 0.12)"
                : "rgba(255, 255, 255, 0.03)",
              border: "1px solid",
              borderColor: !isOnline
                ? "warning.main"
                : pendingCount > 0
                ? "primary.main"
                : "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "space-between",
              cursor: isOnline ? "pointer" : "default",
              transition: "all 0.2s ease",
              "&:hover": isOnline
                ? {
                    bgcolor: "action.hover",
                  }
                : {},
            }}
          >
            {isCollapsed ? (
              <Tooltip
                title={
                  !isOnline
                    ? `Offline Mode (${pendingCount} pending changes)`
                    : pendingCount > 0
                    ? `Syncing (${pendingCount} pending) - Click to sync`
                    : "Online - All changes synced"
                }
                placement="right"
              >
                <IconButton size="small" sx={{ p: 0.5 }}>
                  {!isOnline ? (
                    <CloudOff fontSize="small" sx={{ color: "warning.main", fontSize: 18 }} />
                  ) : isSyncing || pendingCount > 0 ? (
                    <Sync fontSize="small" sx={{ color: "primary.main", fontSize: 18 }} />
                  ) : (
                    <CloudDone fontSize="small" sx={{ color: "success.main", fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {!isOnline ? (
                    <CloudOff fontSize="small" sx={{ color: "warning.main", fontSize: 18 }} />
                  ) : isSyncing || pendingCount > 0 ? (
                    <Sync
                      fontSize="small"
                      sx={{
                        color: "primary.main",
                        fontSize: 18,
                        animation: isSyncing ? "spin 1s linear infinite" : "none",
                        "@keyframes spin": {
                          "0%": { transform: "rotate(0deg)" },
                          "100%": { transform: "rotate(360deg)" },
                        },
                      }}
                    />
                  ) : (
                    <CloudDone fontSize="small" sx={{ color: "success.main", fontSize: 18 }} />
                  )}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        display: "block",
                        lineHeight: 1.2,
                        color: !isOnline ? "warning.main" : "text.primary",
                      }}
                    >
                      {!isOnline ? "Offline Mode" : isSyncing ? "Syncing..." : "Online"}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                      {!isOnline
                        ? `${pendingCount} queued change${pendingCount !== 1 ? "s" : ""}`
                        : pendingCount > 0
                        ? `${pendingCount} pending`
                        : "Synced with Google"}
                    </Typography>
                  </Box>
                </Box>
                {isOnline && pendingCount > 0 && (
                  <Chip label="Sync" size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem" }} />
                )}
              </>
            )}
          </Box>

          {/* Settings Button */}
          <Divider sx={{ mb: 0.5 }} />
          <ListItemButton
            onClick={() => setShowSettings(true)}
            sx={{
              py: 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 40 }}>
              <Settings fontSize="small" />
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText
                primary="Settings"
                primaryTypographyProps={{ variant: "body2" }}
              />
            )}
          </ListItemButton>
        </Box>
      </Box>

      <AddCategoryDialog
        open={showAddCategory}
        onClose={() => setShowAddCategory(false)}
      />

      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </>
  );
}
