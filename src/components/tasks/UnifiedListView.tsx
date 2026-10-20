/**
 * Unified List View Component
 * 
 * Provides a dense, organized single list/table of tasks with:
 * - Grouping by List, Eisenhower Quadrant, or Due Date
 * - Search & status filters
 * - Fast check/uncheck, starring, and detail editing
 */

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import {
  Search,
  Star,
  StarBorder,
  CalendarToday,
  MoreVert,
  DeleteOutline,
  FolderOutlined,
  Add,
  Clear,
} from "@mui/icons-material";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store/atoms";
import { useTasks } from "../../hooks";
import { AppTask, AppTaskList } from "../../types/app";
import { extractQuadrant, cleanTitleFromQuadrant } from "../../services/history.service";
import TaskDetailModal from "./TaskDetailModal";

const QUADRANT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  Q1: { bg: "#fee2e2", color: "#dc2626", label: "Q1 عاجل ومهم" },
  Q2: { bg: "#fef3c7", color: "#d97706", label: "Q2 مهم / تخطيط" },
  Q3: { bg: "#e0e7ff", color: "#4f46e5", label: "Q3 عاجل / تفويض" },
  Q4: { bg: "#f3f4f6", color: "#4b5563", label: "Q4 غير عاجل" },
};

type GroupByOption = "list" | "quadrant" | "dueDate";
type StatusFilter = "all" | "pending" | "completed";

export default function UnifiedListView() {
  const taskLists = useRecoilValue(taskListsAtom);
  const {
    toggleTaskComplete,
    toggleTaskStar,
    deleteTask,
    updateTask,
    createTask,
    createSubtask,
    moveTaskToList,
  } = useTasks();

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [detailTask, setDetailTask] = useState<AppTask | null>(null);

  // Quick action menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTask, setMenuTask] = useState<AppTask | null>(null);

  // Quick add input state per group
  const [quickAddGroup, setQuickAddGroup] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");

  // Flatten all tasks with their list info
  const allTasksWithList = useMemo(() => {
    const items: Array<{ task: AppTask; list: AppTaskList }> = [];
    for (const list of taskLists) {
      if (!list.isVisible) continue;
      for (const task of list.tasks || []) {
        items.push({ task, list });
      }
    }
    return items;
  }, [taskLists]);

  // Filter tasks
  const filteredItems = useMemo(() => {
    return allTasksWithList.filter(({ task }) => {
      // Status filter
      if (statusFilter === "pending" && task.status === "completed") return false;
      if (statusFilter === "completed" && task.status !== "completed") return false;

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }

      return true;
    });
  }, [allTasksWithList, statusFilter, search]);

  // Group filtered tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Array<{ task: AppTask; list: AppTaskList }>> = {};

    if (groupBy === "list") {
      for (const item of filteredItems) {
        const key = item.list.title;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
    } else if (groupBy === "quadrant") {
      groups["Q1 عاجل ومهم"] = [];
      groups["Q2 مهم / تخطيط"] = [];
      groups["Q3 عاجل / تفويض"] = [];
      groups["Q4 غير عاجل"] = [];
      groups["غير مصنفة (Unassigned)"] = [];

      for (const item of filteredItems) {
        const q = extractQuadrant(item.task.title);
        if (q === "Q1") groups["Q1 عاجل ومهم"].push(item);
        else if (q === "Q2") groups["Q2 مهم / تخطيط"].push(item);
        else if (q === "Q3") groups["Q3 عاجل / تفويض"].push(item);
        else if (q === "Q4") groups["Q4 غير عاجل"].push(item);
        else groups["غير مصنفة (Unassigned)"].push(item);
      }
    } else if (groupBy === "dueDate") {
      const today = new Date().toISOString().split("T")[0];
      groups["متأخرة (Overdue)"] = [];
      groups["اليوم (Today)"] = [];
      groups["القادمة (Upcoming)"] = [];
      groups["بدون موعد (No Due Date)"] = [];

      for (const item of filteredItems) {
        if (!item.task.due) {
          groups["بدون موعد (No Due Date)"].push(item);
        } else {
          const dueDay = item.task.due.split("T")[0];
          if (dueDay < today) groups["متأخرة (Overdue)"].push(item);
          else if (dueDay === today) groups["اليوم (Today)"].push(item);
          else groups["القادمة (Upcoming)"].push(item);
        }
      }
    }

    return groups;
  }, [filteredItems, groupBy]);

  const handleQuickAdd = async (groupKey: string) => {
    const title = quickAddText.trim();
    if (!title) return;

    // Resolve target list
    let targetListId = taskLists[0]?.id || "default";
    if (groupBy === "list") {
      const found = taskLists.find((l) => l.title === groupKey);
      if (found) targetListId = found.id;
    }

    await createTask({
      listId: targetListId,
      title,
    });

    setQuickAddText("");
    setQuickAddGroup(null);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, task: AppTask) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuTask(task);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTask(null);
  };

  const handleDeleteTask = async () => {
    if (menuTask) {
      await deleteTask(menuTask.listId, menuTask.id);
    }
    handleMenuClose();
  };

  const handleTaskUpdate = async (t: AppTask, title: string, notes?: string, due?: Date) => {
    await updateTask(t.listId, t.id, title, notes, due);
  };
  const handleTaskToggle = async (t: AppTask) => {
    await toggleTaskComplete(t.listId, t.id);
  };
  const handleTaskStar = async (t: AppTask) => {
    await toggleTaskStar(t.listId, t.id);
  };
  const handleTaskDelete = async (t: AppTask) => {
    await deleteTask(t.listId, t.id);
  };
  const handleTaskMove = async (t: AppTask, toListId: string) => {
    await moveTaskToList(t.listId, t.id, toListId);
  };
  const handleAddSubtask = async (t: AppTask, title: string) => {
    await createSubtask(t.listId, t.id, title);
  };

  return (
    <Box
      sx={{
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        bgcolor: "background.default",
        overflowY: "auto",
      }}
    >
      {/* Top Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          mb: 2.5,
          borderRadius: 3,
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
        {/* Search Input */}
        <TextField
          placeholder="بحث في جميع المهام..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            width: 280,
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              fontFamily: "Cairo, sans-serif",
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Group By selector */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "Cairo, sans-serif", fontWeight: 600 }}>
            تجميع حسب:
          </Typography>
          <Chip
            size="small"
            label="القائمة"
            clickable
            color={groupBy === "list" ? "primary" : "default"}
            onClick={() => setGroupBy("list")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 600 }}
          />
          <Chip
            size="small"
            label="أيزنهاور"
            clickable
            color={groupBy === "quadrant" ? "primary" : "default"}
            onClick={() => setGroupBy("quadrant")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 600 }}
          />
          <Chip
            size="small"
            label="موعد الاستحقاق"
            clickable
            color={groupBy === "dueDate" ? "primary" : "default"}
            onClick={() => setGroupBy("dueDate")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 600 }}
          />
        </Box>

        {/* Status filter */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Chip
            size="small"
            label="المعلقة"
            variant={statusFilter === "pending" ? "filled" : "outlined"}
            color={statusFilter === "pending" ? "primary" : "default"}
            clickable
            onClick={() => setStatusFilter("pending")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.75rem" }}
          />
          <Chip
            size="small"
            label="المكتملة"
            variant={statusFilter === "completed" ? "filled" : "outlined"}
            color={statusFilter === "completed" ? "success" : "default"}
            clickable
            onClick={() => setStatusFilter("completed")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.75rem" }}
          />
          <Chip
            size="small"
            label="الكل"
            variant={statusFilter === "all" ? "filled" : "outlined"}
            clickable
            onClick={() => setStatusFilter("all")}
            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.75rem" }}
          />
        </Box>
      </Paper>

      {/* Task Groups */}
      {Object.entries(groupedTasks).map(([groupTitle, items]) => {
        if (items.length === 0 && groupBy !== "list") return null;

        const isAddingInThisGroup = quickAddGroup === groupTitle;

        return (
          <Box key={groupTitle} sx={{ mb: 3 }}>
            {/* Group Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
                px: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <FolderOutlined fontSize="small" sx={{ color: "primary.main" }} />
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.98rem" }}
                >
                  {groupTitle}
                </Typography>
                <Chip
                  size="small"
                  label={items.length}
                  sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
                />
              </Box>

              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setQuickAddGroup(groupTitle);
                  setQuickAddText("");
                }}
                sx={{
                  fontFamily: "Cairo, sans-serif",
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                إضافة مهمة
              </Button>
            </Box>

            {/* Quick Add Bar */}
            {isAddingInThisGroup && (
              <Paper
                sx={{
                  p: 1.25,
                  mb: 1,
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <TextField
                  placeholder={`إضافة مهمة جديدة في "${groupTitle}"...`}
                  size="small"
                  fullWidth
                  autoFocus
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAdd(groupTitle);
                    if (e.key === "Escape") setQuickAddGroup(null);
                  }}
                  inputProps={{
                    dir: "auto",
                    style: { fontFamily: "Cairo, sans-serif", fontSize: "0.9rem" },
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleQuickAdd(groupTitle)}
                  disabled={!quickAddText.trim()}
                  sx={{ fontFamily: "Cairo, sans-serif" }}
                >
                  حفظ
                </Button>
                <Button
                  size="small"
                  onClick={() => setQuickAddGroup(null)}
                  sx={{ fontFamily: "Cairo, sans-serif" }}
                >
                  إلغاء
                </Button>
              </Paper>
            )}

            {/* Tasks Table / Card List */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
              }}
            >
              {items.length === 0 ? (
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "Cairo, sans-serif" }}>
                    لا توجد مهام في هذا التصنيف حالياً.
                  </Typography>
                </Box>
              ) : (
                items.map(({ task, list }) => {
                  const isCompleted = task.status === "completed";
                  const quadrant = extractQuadrant(task.title);
                  const cleanTitle = cleanTitleFromQuadrant(task.title);
                  // Clean notes from standalone quadrant marks [Q1]-[Q4]
                  const rawNotes = task.notes?.trim() || "";
                  const cleanNotes = cleanTitleFromQuadrant(rawNotes).trim();
                  const hasRealNotes = Boolean(
                    cleanNotes &&
                    !/^\[?Q[1-4]\]?$/i.test(cleanNotes) &&
                    !/^\[?(مربع|ربع)\s*[1-4]\]?$/i.test(cleanNotes)
                  );

                  return (
                    <Box
                      key={task.id}
                      onClick={() => setDetailTask(task)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 2,
                        py: 1.2,
                        borderBottom: 1,
                        borderColor: "divider",
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        "&:last-child": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      {/* Left side: checkbox, star, title */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflow: "hidden", flex: 1 }}>
                        <Checkbox
                          size="small"
                          checked={isCompleted}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskComplete(list.id, task.id);
                          }}
                          sx={{ p: 0.5, flexShrink: 0 }}
                        />

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskStar(list.id, task.id);
                          }}
                          sx={{ p: 0.5, color: task.isStarred ? "#f59e0b" : "text.disabled", flexShrink: 0 }}
                        >
                          {task.isStarred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            title={cleanTitle}
                            sx={{
                              fontFamily: "Cairo, sans-serif",
                              fontSize: "0.92rem",
                              fontWeight: 600,
                              textDecoration: isCompleted ? "line-through" : "none",
                              color: isCompleted ? "text.secondary" : "text.primary",
                              unicodeBidi: "plaintext",
                              textAlign: "start",
                            }}
                            dir="auto"
                            noWrap
                          >
                            {cleanTitle}
                          </Typography>
                          {hasRealNotes && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              title={cleanNotes}
                              sx={{
                                fontFamily: "Cairo, sans-serif",
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                unicodeBidi: "plaintext",
                                textAlign: "start",
                              }}
                              dir="auto"
                            >
                              {cleanNotes}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Right side: badges & actions */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, ml: 1.5 }}>
                        {/* List Name Badge (if not grouped by list) */}
                        {groupBy !== "list" && (
                          <Chip
                            size="small"
                            label={list.title}
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontFamily: "Cairo, sans-serif",
                            }}
                          />
                        )}

                        {/* Quadrant Badge */}
                        {quadrant && (
                          <Chip
                            size="small"
                            label={quadrant}
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              bgcolor: QUADRANT_COLORS[quadrant]?.bg,
                              color: QUADRANT_COLORS[quadrant]?.color,
                            }}
                          />
                        )}

                        {/* Due Date */}
                        {task.due && (
                          <Chip
                            size="small"
                            icon={<CalendarToday sx={{ fontSize: "0.75rem !important" }} />}
                            label={task.due.split("T")[0]}
                            variant="outlined"
                            sx={{ height: 22, fontSize: "0.72rem" }}
                          />
                        )}

                        {/* More menu */}
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, task)}
                          sx={{ p: 0.5, opacity: 0.6, "&:hover": { opacity: 1 } }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Paper>
          </Box>
        );
      })}

      {/* Item Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem onClick={handleDeleteTask}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: "error.main", fontFamily: "Cairo, sans-serif" }}>
            حذف المهمة
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={detailTask}
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        onUpdate={handleTaskUpdate}
        onToggle={handleTaskToggle}
        onStar={handleTaskStar}
        onDelete={handleTaskDelete}
        onMove={handleTaskMove}
        onAddSubtask={handleAddSubtask}
      />
    </Box>
  );
}
