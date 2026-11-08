/**
 * Eisenhower Matrix View (مصفوفة أيزنهاور)
 * 
 * 2x2 Priority Grid based on Urgency and Importance:
 * - Q1: Urgent & Important (Do First / هام وعاجل)
 * - Q2: Not Urgent & Important (Schedule & Deep Work / هام وغير عاجل)
 * - Q3: Urgent & Not Important (Delegate / عاجل وغير هام)
 * - Q4: Not Urgent & Not Important (Eliminate / غير هام وغير عاجل)
 * 
 * Includes an Unassigned Tasks Tray to rapidly categorize tasks with 1-click.
 */

import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Button,
  TextField,
  Collapse,
  Divider,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import {
  Whatshot,
  CalendarMonth,
  AltRoute,
  DeleteSweep,
  Add,
  ExpandMore,
  ExpandLess,
  Label,
  Fullscreen,
  FullscreenExit,
  GridView,
  SubdirectoryArrowRight,
} from "@mui/icons-material";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store";
import { useTasks } from "../../hooks";
import { AppTask } from "../../types/app";
import {
  QuadrantType,
  extractQuadrant,
  applyQuadrantToTitle,
  cleanTitleFromQuadrant,
} from "../../services/history.service";
import TaskListItem from "./TaskListItem";
import TaskDetailModal from "./TaskDetailModal";
import { useTranslation } from "../../i18n";

interface QuadrantConfig {
  id: QuadrantType;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  icon: React.ReactNode;
}

const QUADRANTS: QuadrantConfig[] = [
  {
    id: "Q1",
    title: "Urgent & Important",
    subtitle: "Crises, deadlines & pressing issues",
    color: "#f28b82",
    badgeBg: "rgba(242, 139, 130, 0.15)",
    icon: <Whatshot sx={{ color: "#f28b82", fontSize: 20 }} />,
  },
  {
    id: "Q2",
    title: "Important, Not Urgent",
    subtitle: "Deep work, goals, planning & learning",
    color: "#8ab4f8",
    badgeBg: "rgba(138, 180, 248, 0.15)",
    icon: <CalendarMonth sx={{ color: "#8ab4f8", fontSize: 20 }} />,
  },
  {
    id: "Q3",
    title: "Urgent, Not Important",
    subtitle: "Interruptions, some emails & quick favors",
    color: "#fdd663",
    badgeBg: "rgba(253, 214, 99, 0.15)",
    icon: <AltRoute sx={{ color: "#fdd663", fontSize: 20 }} />,
  },
  {
    id: "Q4",
    title: "Not Urgent & Not Important",
    subtitle: "Time wasters, trivia & distractions",
    color: "#c58af9",
    badgeBg: "rgba(197, 138, 249, 0.15)",
    icon: <DeleteSweep sx={{ color: "#c58af9", fontSize: 20 }} />,
  },
];

export default function EisenhowerMatrixView() {
  const { t, isRtl } = useTranslation();
  const taskLists = useRecoilValue(taskListsAtom);
  const {
    createTask,
    updateTask,
    toggleTaskComplete,
    toggleTaskStar,
    deleteTask,
    moveTaskToList,
    createSubtask,
  } = useTasks();

  const [detailTask, setDetailTask] = useState<AppTask | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [quickInput, setQuickInput] = useState<{ [key in QuadrantType]?: string }>({});
  const [expandedQuadrant, setExpandedQuadrant] = useState<QuadrantType | null>(null);

  // Map of all tasks across all lists by ID for instant parent resolution
  const taskMap = new Map<string, AppTask>();
  for (const list of taskLists) {
    for (const t of list.tasks) {
      taskMap.set(t.id, t);
    }
  }

  // Flatten active tasks
  const allTasks: { task: AppTask; listTitle: string }[] = [];
  for (const list of taskLists) {
    for (const t of list.tasks) {
      if (t.status === "needsAction") {
        allTasks.push({ task: t, listTitle: list.title });
      }
    }
  }

  // Resolve quadrant with parent inheritance for subtasks
  const resolveQuadrant = (task: AppTask): QuadrantType | undefined => {
    // 1. Direct tag on task takes precedence
    const directQ = extractQuadrant(task.title);
    if (directQ) return directQ;

    // 2. If it's a subtask, inherit quadrant from parent
    if (task.parent) {
      const parentTask = taskMap.get(task.parent);
      if (parentTask) {
        const parentQ = extractQuadrant(parentTask.title);
        if (parentQ) return parentQ;
      }
    }

    return undefined;
  };

  // Group by quadrant
  const qTasks: { [key in QuadrantType]: { task: AppTask; listTitle: string }[] } = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: [],
  };
  const unassignedTasks: { task: AppTask; listTitle: string }[] = [];

  for (const item of allTasks) {
    const q = resolveQuadrant(item.task);
    if (q) {
      qTasks[q].push(item);
    } else {
      unassignedTasks.push(item);
    }
  }

  // Primary list for adding new tasks
  const primaryList = taskLists[0];

  const handleQuickAdd = async (quadrant: QuadrantType) => {
    const text = quickInput[quadrant]?.trim();
    if (!text || !primaryList) return;

    const taggedTitle = applyQuadrantToTitle(text, quadrant);
    await createTask({
      title: taggedTitle,
      listId: primaryList.id,
    });
    setQuickInput((prev) => ({ ...prev, [quadrant]: "" }));
  };

  const handleAssignQuadrant = async (task: AppTask, quadrant: QuadrantType) => {
    const updatedTitle = applyQuadrantToTitle(task.title, quadrant);
    await updateTask(task.listId, task.id, updatedTitle, task.notes, task.due ? new Date(task.due) : undefined);
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        overflowY: "auto",
        bgcolor: "background.default",
      }}
    >
      {/* Header Banner */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
            🎯 {t("eisenhower.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {t("eisenhower.subtitle")}
          </Typography>
        </Box>
        <Chip
          label={`${allTasks.length} ${t("calendar.tasksCount")}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      {/* Unassigned Tasks Drawer (shown only in 2x2 grid mode) */}
      {!expandedQuadrant && unassignedTasks.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            p: 1.5,
            borderRadius: "14px",
            border: "1px dashed",
            borderColor: "warning.main",
            bgcolor: "rgba(253, 214, 99, 0.05)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowUnassigned(!showUnassigned)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Label sx={{ color: "warning.main", fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {t("eisenhower.unassignedTitle")} ({unassignedTasks.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("eisenhower.unassignedHelper")}
              </Typography>
            </Box>
            <IconButton size="small">
              {showUnassigned ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={showUnassigned} timeout="auto">
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1.5 }}>
              {unassignedTasks.map(({ task, listTitle }) => (
                <Paper
                  key={task.id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: "10px",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    maxWidth: 320,
                    minWidth: 260,
                  }}
                >
                  <Typography
                    variant="body2"
                    dir="auto"
                    sx={{
                      fontWeight: 500,
                      unicodeBidi: "plaintext",
                      textAlign: "start",
                      cursor: "pointer",
                      "&:hover": { color: "primary.main" },
                    }}
                    onClick={() => setDetailTask(task)}
                  >
                    {task.title}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "flex", alignItems: "center", gap: 0.5, overflow: "hidden", minWidth: 0 }}
                    >
                      {task.parent && taskMap.get(task.parent) ? (
                        <>
                          <SubdirectoryArrowRight
                            sx={{
                              fontSize: 13,
                              color: "text.secondary",
                              transform: isRtl ? "scaleX(-1)" : "none",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 600,
                              color: "inherit",
                              maxWidth: 110,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {cleanTitleFromQuadrant(taskMap.get(task.parent)!.title)}
                          </span>
                          <span>•</span>
                        </>
                      ) : null}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {listTitle}
                      </span>
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {(["Q1", "Q2", "Q3", "Q4"] as QuadrantType[]).map((q) => (
                        <Button
                          key={q}
                          size="small"
                          variant="outlined"
                          onClick={() => handleAssignQuadrant(task, q)}
                          sx={{
                            minWidth: 28,
                            px: 0.75,
                            py: 0.2,
                            fontSize: "0.7rem",
                            borderRadius: "6px",
                            fontWeight: 700,
                            borderColor:
                              q === "Q1"
                                ? "#f28b82"
                                : q === "Q2"
                                ? "#8ab4f8"
                                : q === "Q3"
                                ? "#fdd663"
                                : "#c58af9",
                            color:
                              q === "Q1"
                                ? "#f28b82"
                                : q === "Q2"
                                ? "#8ab4f8"
                                : q === "Q3"
                                ? "#fdd663"
                                : "#c58af9",
                          }}
                        >
                          {q}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* Expanded Quadrant Controls Banner */}
      {expandedQuadrant && (
        <Paper
          elevation={0}
          sx={{
            mb: 2,
            p: 1.25,
            px: 2,
            borderRadius: "14px",
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Button
            size="small"
            variant="outlined"
            startIcon={<GridView sx={{ fontSize: 18 }} />}
            onClick={() => setExpandedQuadrant(null)}
            sx={{
              borderRadius: "10px",
              fontWeight: 700,
              textTransform: "none",
              color: "text.primary",
              borderColor: "divider",
            }}
          >
            {t("eisenhower.backToMatrix")}
          </Button>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("eisenhower.quickJump")}
            </Typography>
            {QUADRANTS.map((quad) => (
              <Chip
                key={quad.id}
                label={`${quad.id} (${qTasks[quad.id].length})`}
                clickable
                color={expandedQuadrant === quad.id ? "primary" : "default"}
                variant={expandedQuadrant === quad.id ? "filled" : "outlined"}
                onClick={() => setExpandedQuadrant(quad.id)}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderColor: quad.color,
                  ...(expandedQuadrant === quad.id ? { bgcolor: quad.color, color: "#fff" } : {}),
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* 2x2 Grid or Maximized Single Quadrant */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: expandedQuadrant ? "1fr" : { xs: "1fr", md: "1fr 1fr" },
          gridTemplateRows: expandedQuadrant ? "1fr" : { xs: "auto", md: "1fr 1fr" },
          gap: 2,
          minHeight: expandedQuadrant ? 480 : 560,
        }}
      >
        {(expandedQuadrant ? QUADRANTS.filter((q) => q.id === expandedQuadrant) : QUADRANTS).map((q) => {
          const tasks = qTasks[q.id];
          const isMaximized = expandedQuadrant === q.id;

          return (
            <Paper
              key={q.id}
              elevation={0}
              sx={{
                borderRadius: "16px",
                border: "1px solid",
                borderColor: isMaximized ? q.color : "divider",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                borderTop: `4px solid ${q.color}`,
                boxShadow: isMaximized ? "0 4px 20px rgba(0,0,0,0.12)" : "none",
              }}
            >
              {/* Quadrant Header */}
              <Box
                onClick={() => setExpandedQuadrant(isMaximized ? null : q.id)}
                sx={{
                  p: 1.5,
                  px: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  bgcolor: q.badgeBg,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background-color 0.2s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {q.icon}
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: q.color, lineHeight: 1.2 }}
                    >
                      {t(`eisenhower.${q.id.toLowerCase()}Title`)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontWeight: 500, fontSize: "0.75rem" }}
                    >
                      {t(`eisenhower.${q.id.toLowerCase()}Subtitle`)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={tasks.length}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: "background.paper",
                      color: q.color,
                      border: 1,
                      borderColor: "divider",
                    }}
                  />
                  <Tooltip title={isMaximized ? t("eisenhower.minimizeQuadrant") : t("eisenhower.maximizeQuadrant")}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedQuadrant(isMaximized ? null : q.id);
                      }}
                      sx={{
                        color: q.color,
                        p: 0.5,
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.selected" },
                      }}
                    >
                      {isMaximized ? (
                        <FullscreenExit fontSize="small" />
                      ) : (
                        <Fullscreen fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Quick Add Input */}
              <Box sx={{ p: 1.5, pb: 1, display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={t("eisenhower.addTaskToQuadrant")}
                  value={quickInput[q.id] || ""}
                  onChange={(e) =>
                    setQuickInput((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd(q.id);
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Add fontSize="small" sx={{ color: "text.secondary", fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ dir: "auto" }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "10px",
                      bgcolor: "background.default",
                    },
                    "& .MuiInputBase-input": {
                      py: 0.75,
                      fontSize: "0.85rem",
                      unicodeBidi: "plaintext",
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleQuickAdd(q.id)}
                  disabled={!quickInput[q.id]?.trim()}
                  sx={{
                    borderRadius: "10px",
                    textTransform: "none",
                    minWidth: "auto",
                    px: 1.5,
                  }}
                >
                  <Add fontSize="small" />
                </Button>
              </Box>

              <Divider />

              {/* Task List */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  px: 1.5,
                  py: 1,
                  maxHeight: isMaximized ? "none" : { xs: 260, md: "none" },
                  scrollbarWidth: "thin",
                }}
              >
                {(() => {
                  if (tasks.length === 0) {
                    return (
                      <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography variant="body2" color="text.secondary">
                          {t("tasks.noTasks")}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                          {t(`eisenhower.${q.id.toLowerCase()}Subtitle`)}
                        </Typography>
                      </Box>
                    );
                  }

                  // 1. Separate into top-level tasks and subtasks
                  const topLevel = tasks.filter((i) => !i.task.parent || !taskMap.has(i.task.parent));
                  const subtasks = tasks.filter((i) => !!i.task.parent && taskMap.has(i.task.parent));

                  // Subtasks whose parent is in topLevel (same quadrant)
                  const sameQuadrantChildrenMap = new Map<string, typeof tasks>();
                  // Subtasks whose parent is in a DIFFERENT quadrant or list
                  const crossQuadrantMap = new Map<string, typeof tasks>();

                  for (const st of subtasks) {
                    const parentId = st.task.parent!;
                    if (topLevel.some((p) => p.task.id === parentId)) {
                      const list = sameQuadrantChildrenMap.get(parentId) || [];
                      list.push(st);
                      sameQuadrantChildrenMap.set(parentId, list);
                    } else {
                      const list = crossQuadrantMap.get(parentId) || [];
                      list.push(st);
                      crossQuadrantMap.set(parentId, list);
                    }
                  }

                  return (
                    <>
                      {/* Top-level tasks and their co-quadrant subtasks */}
                      {topLevel.map(({ task }) => {
                        const children = sameQuadrantChildrenMap.get(task.id) || [];
                        const cleanParentTitle = cleanTitleFromQuadrant(task.title);

                        return (
                          <Box key={task.id} sx={{ mb: 0.5 }}>
                            <TaskListItem
                              task={task}
                              onToggle={() => toggleTaskComplete(task.listId, task.id)}
                              onStar={() => toggleTaskStar(task.listId, task.id)}
                              onDelete={() => deleteTask(task.listId, task.id)}
                              onMove={(t, toListId) => moveTaskToList(t.listId, t.id, toListId)}
                              onUpdate={(t, title, notes, due) => updateTask(t.listId, t.id, title, notes, due)}
                              onAddSubtask={(t, stTitle) => createSubtask(t.listId, t.id, stTitle)}
                              onOpenDetail={setDetailTask}
                            />
                            {children.map((child) => (
                              <Box key={child.task.id} sx={{ marginInlineStart: 2 }}>
                                <TaskListItem
                                  task={child.task}
                                  parentTaskTitle={cleanParentTitle}
                                  onToggle={() => toggleTaskComplete(child.task.listId, child.task.id)}
                                  onStar={() => toggleTaskStar(child.task.listId, child.task.id)}
                                  onDelete={() => deleteTask(child.task.listId, child.task.id)}
                                  onMove={(t, toListId) => moveTaskToList(t.listId, t.id, toListId)}
                                  onUpdate={(t, title, notes, due) => updateTask(t.listId, t.id, title, notes, due)}
                                  onAddSubtask={(t, stTitle) => createSubtask(t.listId, t.id, stTitle)}
                                  onOpenDetail={setDetailTask}
                                />
                              </Box>
                            ))}
                          </Box>
                        );
                      })}

                      {/* Cross-quadrant subtasks (parent is in a different quadrant or completed) */}
                      {Array.from(crossQuadrantMap.entries()).map(([parentId, orphanChildren]) => {
                        const parentTask = taskMap.get(parentId);
                        const parentCleanTitle = parentTask ? cleanTitleFromQuadrant(parentTask.title) : t("tasks.defaultListName");
                        const parentQ = parentTask ? extractQuadrant(parentTask.title) : undefined;

                        return (
                          <Box key={`cross_group_${parentId}`} sx={{ mt: 1.5, mb: 1 }}>
                            <Box
                              onClick={() => parentTask && setDetailTask(parentTask)}
                              sx={{
                                py: 0.6,
                                px: 1.25,
                                mb: 0.5,
                                borderRadius: "8px",
                                bgcolor: "action.hover",
                                border: "1px dashed",
                                borderColor: "divider",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                cursor: parentTask ? "pointer" : "default",
                                transition: "background-color 0.15s ease",
                                "&:hover": parentTask ? { bgcolor: "action.selected" } : {},
                              }}
                            >
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0, overflow: "hidden" }}>
                                <SubdirectoryArrowRight
                                  fontSize="small"
                                  sx={{
                                    color: "text.secondary",
                                    fontSize: 16,
                                    transform: isRtl ? "scaleX(-1)" : "none",
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, flexShrink: 0 }}>
                                  {t("tasks.subtaskOf")}:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  dir="auto"
                                  sx={{
                                    fontWeight: 700,
                                    color: "primary.main",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {parentCleanTitle}
                                </Typography>
                              </Box>
                              {parentQ && (
                                <Chip
                                  size="small"
                                  label={parentQ}
                                  color={
                                    parentQ === "Q1"
                                      ? "error"
                                      : parentQ === "Q2"
                                      ? "primary"
                                      : parentQ === "Q3"
                                      ? "warning"
                                      : "default"
                                  }
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700, flexShrink: 0 }}
                                />
                              )}
                            </Box>

                            {orphanChildren.map((child) => (
                              <Box key={child.task.id} sx={{ marginInlineStart: 1 }}>
                                <TaskListItem
                                  task={child.task}
                                  parentTaskTitle={parentCleanTitle}
                                  onToggle={() => toggleTaskComplete(child.task.listId, child.task.id)}
                                  onStar={() => toggleTaskStar(child.task.listId, child.task.id)}
                                  onDelete={() => deleteTask(child.task.listId, child.task.id)}
                                  onMove={(t, toListId) => moveTaskToList(t.listId, t.id, toListId)}
                                  onUpdate={(t, title, notes, due) => updateTask(t.listId, t.id, title, notes, due)}
                                  onAddSubtask={(t, stTitle) => createSubtask(t.listId, t.id, stTitle)}
                                  onOpenDetail={setDetailTask}
                                />
                              </Box>
                            ))}
                          </Box>
                        );
                      })}
                    </>
                  );
                })()}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={detailTask}
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        onUpdate={async (t, title, notes, due) => {
          await updateTask(t.listId, t.id, title, notes, due);
        }}
        onToggle={async (t) => {
          await toggleTaskComplete(t.listId, t.id);
        }}
        onStar={async (t) => {
          await toggleTaskStar(t.listId, t.id);
        }}
        onDelete={async (t) => {
          await deleteTask(t.listId, t.id);
        }}
        onMove={async (t, toListId) => {
          await moveTaskToList(t.listId, t.id, toListId);
        }}
        onAddSubtask={async (t, stTitle) => {
          await createSubtask(t.listId, t.id, stTitle);
        }}
      />
    </Box>
  );
}
