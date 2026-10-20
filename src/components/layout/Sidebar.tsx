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
  KeyboardAltOutlined,
} from "@mui/icons-material";
import { useRecoilState, useRecoilValue } from "recoil";
import { viewStateAtom, starredTaskIdsAtom, aiCopilotOpenAtom, settingsOpenAtom, taskViewModeAtom, shortcutsModalOpenAtom, addCategoryOpenAtom } from "../../store";
import { useTaskLists } from "../../hooks";
import { syncQueueService } from "../../services/sync-queue.service";
import AddCategoryDialog from "../ui/AddCategoryDialog";
import SettingsDialog from "../ui/SettingsDialog";
import { useTranslation } from "../../i18n";

interface SidebarProps {
  onViewChange?: (view: SidebarView, listId?: string) => void;
}

export default function Sidebar({ onViewChange }: SidebarProps) {
  const { t, isRtl } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [listsExpanded, setListsExpanded] = useState(true);
  const [showAddCategory, setShowAddCategory] = useRecoilState(addCategoryOpenAtom);
  const [showSettings, setShowSettings] = useRecoilState(settingsOpenAtom);
  const [, setShowAiCopilot] = useRecoilState(aiCopilotOpenAtom);
  const [, setShowShortcuts] = useRecoilState(shortcutsModalOpenAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);
  const [taskViewMode, setTaskViewMode] = useRecoilState(taskViewModeAtom);
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
    if (taskViewMode === "eisenhower") {
      setTaskViewMode("board");
    }
    onViewChange?.("all");
  };

  const handleViewStarred = () => {
    setViewState({ view: "starred", activeListId: undefined, activeListIndex: -2 });
    if (taskViewMode === "eisenhower") {
      setTaskViewMode("board");
    }
    onViewChange?.("starred");
  };

  const handleViewEisenhower = () => {
    setViewState({ view: "eisenhower", activeListId: undefined, activeListIndex: -3 });
    setTaskViewMode("eisenhower");
    onViewChange?.("eisenhower");
  };

  const handleViewAnalytics = () => {
    setViewState({ view: "analytics", activeListId: undefined, activeListIndex: -4 });
    onViewChange?.("analytics");
  };

  const handleListClick = (listId: string, index: number) => {
    setViewState({ view: "list", activeListId: listId, activeListIndex: index });
    if (taskViewMode === "eisenhower") {
      setTaskViewMode("board");
    }
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
          borderRight: isRtl ? 0 : 1,
          borderLeft: isRtl ? 1 : 0,
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
            justifyContent: isCollapsed ? "center" : isRtl ? "flex-start" : "flex-end",
            p: 1,
          }}
        >
          <Tooltip title={isCollapsed ? t("navigation.expandSidebar") : t("navigation.collapseSidebar")}>
            <IconButton size="small" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? (isRtl ? <ChevronLeft fontSize="small" /> : <ChevronRight fontSize="small" />) : (isRtl ? <ChevronRight fontSize="small" /> : <ChevronLeft fontSize="small" />)}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Create Button */}
        {!isCollapsed && (
          <Box sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
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
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
            >
              <Add fontSize="small" />
              <span>{t("common.create")}</span>
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
              <Tooltip title={t("navigation.createList")} placement={isRtl ? "left" : "right"}>
                <IconButton onClick={() => setShowAddCategory(true)}>
                  <Add />
                </IconButton>
              </Tooltip>
              <Divider sx={{ width: "80%", my: 0.5 }} />
              <Tooltip title={t("navigation.allTasks")} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={handleViewAll}
                  color={viewState.view === "all" ? "primary" : "default"}
                >
                  <TaskAlt />
                </IconButton>
              </Tooltip>
              <Tooltip title={`${t("navigation.starred")} (${starredCount})`} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={handleViewStarred}
                  color={viewState.view === "starred" ? "warning" : "default"}
                >
                  {viewState.view === "starred" ? <Star /> : <StarBorder />}
                </IconButton>
              </Tooltip>
              <Tooltip title={t("navigation.eisenhower")} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={handleViewEisenhower}
                  color={viewState.view === "eisenhower" ? "primary" : "default"}
                >
                  <GridView />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("navigation.analytics")} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={handleViewAnalytics}
                  color={viewState.view === "analytics" ? "warning" : "default"}
                >
                  <LocalFireDepartment />
                </IconButton>
              </Tooltip>
              <Tooltip title={`${t("navigation.aiCopilot")} (⌘K)`} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={() => setShowAiCopilot(true)}
                  color="primary"
                >
                  <AutoAwesome />
                </IconButton>
              </Tooltip>
              <Tooltip title={`${t("shortcuts.modalTitle")} (?)`} placement={isRtl ? "left" : "right"}>
                <IconButton 
                  onClick={() => setShowShortcuts(true)}
                  sx={{ color: "text.secondary" }}
                >
                  <KeyboardAltOutlined />
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
                    borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                    ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                    "&.Mui-selected": {
                      bgcolor: "primary.dark",
                      "&:hover": { bgcolor: "primary.dark" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                    <TaskAlt fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("navigation.allTasks")}
                    primaryTypographyProps={{
                      variant: "body2",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  />
                </ListItemButton>

                {/* Starred */}
                <ListItemButton
                  selected={viewState.view === "starred"}
                  onClick={handleViewStarred}
                  sx={{
                    borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                    ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                    "&.Mui-selected": {
                      bgcolor: "warning.dark",
                      "&:hover": { bgcolor: "warning.dark" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                    {viewState.view === "starred" ? (
                      <Star fontSize="small" color="warning" />
                    ) : (
                      <StarBorder fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={t("navigation.starred")}
                    primaryTypographyProps={{
                      variant: "body2",
                      textAlign: isRtl ? "right" : "left",
                    }}
                  />
                  {starredCount > 0 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        ...(isRtl ? { mr: "auto", ml: 0 } : { ml: "auto", mr: 0 }),
                        fontWeight: 600,
                      }}
                    >
                      {starredCount}
                    </Typography>
                  )}
                </ListItemButton>

                {/* Eisenhower Matrix */}
                <ListItemButton
                  selected={viewState.view === "eisenhower"}
                  onClick={handleViewEisenhower}
                  sx={{
                    borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                    ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                    "&.Mui-selected": {
                      bgcolor: "rgba(138, 180, 248, 0.16)",
                      "&:hover": { bgcolor: "rgba(138, 180, 248, 0.2)" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                    <GridView
                      fontSize="small"
                      color={viewState.view === "eisenhower" ? "primary" : "inherit"}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("navigation.eisenhower")}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: viewState.view === "eisenhower" ? 600 : 400,
                      textAlign: isRtl ? "right" : "left",
                    }}
                  />
                </ListItemButton>

                {/* Analytics & Streaks */}
                <ListItemButton
                  selected={viewState.view === "analytics"}
                  onClick={handleViewAnalytics}
                  sx={{
                    borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                    ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                    "&.Mui-selected": {
                      bgcolor: "rgba(251, 140, 0, 0.16)",
                      "&:hover": { bgcolor: "rgba(251, 140, 0, 0.2)" },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
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
                    primary={t("navigation.analytics")}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: viewState.view === "analytics" ? 600 : 400,
                      textAlign: isRtl ? "right" : "left",
                    }}
                  />
                </ListItemButton>

                {/* AI Copilot */}
                <ListItemButton
                  onClick={() => setShowAiCopilot(true)}
                  sx={{
                    borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                    ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <AutoAwesome
                      fontSize="small"
                      sx={{ color: "primary.main" }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={t("navigation.aiCopilot")}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 600,
                      color: "primary.main",
                      textAlign: isRtl ? "right" : "left",
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
                      ...(isRtl ? { mr: "auto", ml: 0 } : { ml: "auto", mr: 0 }),
                    }}
                  />
                </ListItemButton>
              </List>

              <Divider sx={{ my: 1 }} />

              {/* Lists Section Header */}
              <ListItemButton
                onClick={() => setListsExpanded(!listsExpanded)}
                sx={{ height: "40px", flexGrow: 0, px: 2 }}
              >
                <ListItemText
                  primary={t("navigation.lists")}
                  primaryTypographyProps={{
                    variant: "caption",
                    color: "text.secondary",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    textAlign: isRtl ? "right" : "left",
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
                        borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                        ...(isRtl ? { ml: 1.5, mr: 0 } : { mr: 1.5, ml: 0 }),
                        py: 0.75,
                        px: 1.5,
                        opacity: list.isVisible ? 1 : 0.5,
                        "&.Mui-selected": {
                          bgcolor: "action.selected",
                          "&:hover": { bgcolor: "action.selected" },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 26, ...(isRtl ? { ml: 0.5 } : { mr: 0.5 }) }}>
                        <Checkbox
                          size="small"
                          checked={list.isVisible}
                          onClick={(e) => handleToggleVisibility(e, list.id)}
                          sx={{ p: 0.25 }}
                        />
                      </ListItemIcon>
                      <ListItemIcon sx={{ minWidth: 28, ...(isRtl ? { ml: 0.5 } : { mr: 0.5 }) }}>
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
                            textAlign: isRtl ? "right" : "left",
                          },
                        }}
                      />
                      {list.incompleteCount > 0 && (
                        <Typography
                          variant="caption"
                          dir="ltr"
                          sx={{
                            ...(isRtl ? { mr: "auto", ml: 0 } : { ml: "auto", mr: 0 }),
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
                      borderRadius: isRtl ? "24px 0 0 24px" : "0 24px 24px 0",
                      ...(isRtl ? { ml: 2, mr: 0 } : { mr: 2, ml: 0 }),
                      py: 0.75,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Add fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={t("navigation.createList")}
                      primaryTypographyProps={{
                        variant: "body2",
                        color: "text.secondary",
                        textAlign: isRtl ? "right" : "left",
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
                    ? `${t("sync.offlineMode")} (${t("sync.pendingChanges", { count: pendingCount })})`
                    : pendingCount > 0
                    ? `${t("sync.syncing")} (${t("sync.pendingChanges", { count: pendingCount })}) - ${t("sync.clickToSync")}`
                    : `${t("sync.online")} - ${t("sync.allChangesSynced")}`
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
                      {!isOnline ? t("sync.offlineMode") : isSyncing ? t("sync.syncing") : t("sync.online")}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                      {!isOnline
                        ? t("sync.queuedChanges", { count: pendingCount })
                        : pendingCount > 0
                        ? t("sync.pendingChanges", { count: pendingCount })
                        : t("sync.syncedWithGoogle")}
                    </Typography>
                  </Box>
                </Box>
                {isOnline && pendingCount > 0 && (
                  <Chip label={t("common.sync")} size="small" color="primary" sx={{ height: 20, fontSize: "0.65rem" }} />
                )}
              </>
            )}
          </Box>

          {/* Shortcuts & Settings Buttons */}
          <Divider sx={{ mb: 0.5 }} />

          {/* Keyboard Shortcuts Button */}
          <ListItemButton
            onClick={() => setShowShortcuts(true)}
            sx={{
              py: 0.8,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36 }}>
              <KeyboardAltOutlined fontSize="small" sx={{ color: "text.secondary" }} />
            </ListItemIcon>
            {!isCollapsed && (
              <>
                <ListItemText
                  primary={t("shortcuts.modalTitle")}
                  primaryTypographyProps={{
                    variant: "body2",
                    textAlign: isRtl ? "right" : "left",
                    color: "text.secondary",
                  }}
                />
                <Chip
                  label="?"
                  size="small"
                  sx={{
                    height: 18,
                    minWidth: 18,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    bgcolor: "action.selected",
                    color: "text.secondary",
                    ...(isRtl ? { mr: "auto", ml: 0 } : { ml: "auto", mr: 0 }),
                  }}
                />
              </>
            )}
          </ListItemButton>

          {/* Settings Button */}
          <ListItemButton
            onClick={() => setShowSettings(true)}
            sx={{
              py: 0.8,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
            }}
          >
            <ListItemIcon sx={{ minWidth: isCollapsed ? 0 : 36 }}>
              <Settings fontSize="small" />
            </ListItemIcon>
            {!isCollapsed && (
              <ListItemText
                primary={t("settings.title")}
                primaryTypographyProps={{
                  variant: "body2",
                  textAlign: isRtl ? "right" : "left",
                }}
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
