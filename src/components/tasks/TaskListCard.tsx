/**
 * Task List Card
 * 
 * Displays a single task list as a sticky-note style card.
 * Supports drag-drop reordering of tasks.
 */

import { useState, useMemo } from "react";
import {
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Typography,
  Box,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AppTaskList, AppTask } from "../../types/app";
import { useTasks } from "../../hooks";
import TaskListHeader from "./TaskListHeader";
import SortableTaskItem from "./SortableTaskItem";
import TaskListItem from "./TaskListItem";
import AddTaskInput from "./AddTaskInput";
import TaskDetailModal from "./TaskDetailModal";
import { useTranslation } from "../../i18n";

interface TaskListCardProps {
  taskList: AppTaskList;
  isActive: boolean;
  isDragOverlay?: boolean;
  dragHandleProps?: Record<string, any>;
}

export default function TaskListCard({ 
  taskList, 
  isActive, 
  isDragOverlay = false,
  dragHandleProps,
}: TaskListCardProps) {
  const { t } = useTranslation();
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<string>("my_order");
  const [detailTask, setDetailTask] = useState<AppTask | null>(null);
  const { 
    createTask, 
    createSubtask,
    updateTask,
    toggleTaskComplete, 
    toggleTaskStar, 
    deleteTask, 
    moveTaskToList,
    indentTask,
    unindentTask,
  } = useTasks();

  // Droppable container so tasks from other lists can be dropped here
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable_${taskList.id}`,
    data: {
      type: "list_droppable",
      listId: taskList.id,
    },
  });

  // Organize tasks so subtasks appear immediately after their parent
  const organizeWithSubtasks = (tasks: AppTask[]): AppTask[] => {
    const topLevel = tasks.filter(t => !t.parent);
    const subtasks = tasks.filter(t => t.parent);
    const subtaskMap = new Map<string, AppTask[]>();
    
    // Group subtasks by parent
    for (const st of subtasks) {
      if (st.parent) {
        const existing = subtaskMap.get(st.parent) || [];
        existing.push(st);
        subtaskMap.set(st.parent, existing);
      }
    }
    
    // Insert subtasks after each parent
    const result: AppTask[] = [];
    for (const task of topLevel) {
      result.push(task);
      const children = subtaskMap.get(task.id) || [];
      result.push(...children);
    }
    
    // Add orphan subtasks (parent not in current view) at the end
    for (const st of subtasks) {
      if (st.parent && !topLevel.find(t => t.id === st.parent)) {
        result.push(st);
      }
    }
    
    return result;
  };

  // Sort function for tasks (applies to top-level, subtasks follow parents)
  const sortTasks = (tasks: AppTask[], sortType: string): AppTask[] => {
    // First separate top-level and subtasks
    const topLevel = tasks.filter(t => !t.parent);
    const subtasks = tasks.filter(t => t.parent);
    
    // Sort only top-level tasks
    let sortedTopLevel: AppTask[];
    switch (sortType) {
      case "date":
        sortedTopLevel = [...topLevel].sort((a, b) => {
          const dateA = new Date(a.updated || 0).getTime();
          const dateB = new Date(b.updated || 0).getTime();
          return dateB - dateA; // Newest first
        });
        break;
      case "deadline":
        sortedTopLevel = [...topLevel].sort((a, b) => {
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        });
        break;
      case "starred":
        sortedTopLevel = [...topLevel].sort((a, b) => {
          if (a.isStarred === b.isStarred) return 0;
          return a.isStarred ? -1 : 1;
        });
        break;
      case "title":
        sortedTopLevel = [...topLevel].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "my_order":
      default:
        sortedTopLevel = [...topLevel];
    }
    
    // Now organize with subtasks following parents
    return organizeWithSubtasks([...sortedTopLevel, ...subtasks]);
  };

  // Separate and sort tasks
  const incompleteTasks = useMemo(() => {
    return sortTasks(
      taskList.tasks.filter((task) => task.status === "needsAction"),
      sortBy
    );
  }, [taskList.tasks, sortBy]);

  const completedTasks = useMemo(() => {
    return taskList.tasks.filter((task) => task.status === "completed");
  }, [taskList.tasks]);

  // Create a map of task IDs to titles for parent lookup
  const taskTitleMap = useMemo(() => {
    return new Map(taskList.tasks.map((t) => [t.id, t.title]));
  }, [taskList.tasks]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
  };

  const handleAddTask = async (title: string, dueDate?: Date) => {
    await createTask({
      title,
      due: dueDate,
      listId: taskList.id,
    });
  };

  const handleTaskToggle = async (task: AppTask) => {
    await toggleTaskComplete(taskList.id, task.id);
  };

  const handleTaskStar = async (task: AppTask) => {
    await toggleTaskStar(taskList.id, task.id);
  };

  const handleTaskDelete = async (task: AppTask) => {
    await deleteTask(taskList.id, task.id);
  };

  const handleTaskMove = async (task: AppTask, toListId: string) => {
    await moveTaskToList(taskList.id, task.id, toListId);
  };

  const handleTaskUpdate = async (task: AppTask, title: string, notes?: string, due?: Date) => {
    await updateTask(taskList.id, task.id, title, notes, due);
  };

  const handleAddSubtask = async (task: AppTask, title: string) => {
    await createSubtask(taskList.id, task.id, title);
  };

  const handleIndentTask = async (task: AppTask) => {
    await indentTask(taskList.id, task.id);
  };

  const handleUnindentTask = async (task: AppTask) => {
    await unindentTask(taskList.id, task.id);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: 330,
        minWidth: 330,
        height: isDragOverlay ? "auto" : "calc(100% - 16px)",
        maxHeight: isDragOverlay ? "none" : "calc(100% - 16px)",
        flexShrink: 0,
        bgcolor: isOver ? "action.hover" : "background.paper",
        borderRadius: "16px",
        border: "1.5px solid",
        borderColor: isOver ? "primary.main" : isActive ? "primary.main" : "divider",
        display: "flex",
        flexDirection: "column",
        transition: "border-color 0.2s, box-shadow 0.2s, background-color 0.2s",
        boxShadow: isOver
          ? "0 0 0 2px rgba(25, 118, 210, 0.35)"
          : isActive
          ? "0 0 0 1px rgba(138, 180, 248, 0.35)"
          : "none",
        overflow: "hidden",
        pointerEvents: isDragOverlay ? "none" : "auto",
      }}
    >
      {/* Header */}
      <TaskListHeader 
        title={taskList.title} 
        listId={taskList.id}
        currentSort={sortBy}
        onSortChange={handleSortChange}
        dragHandleProps={dragHandleProps}
      />

      {/* Add Task */}
      <AddTaskInput onAdd={handleAddTask} />

      {/* Task List - Droppable Area */}
      <List
        ref={setDroppableRef}
        sx={{
          py: 0,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          bgcolor: isOver ? "rgba(25, 118, 210, 0.05)" : "transparent",
          transition: "background-color 0.2s",
          scrollbarWidth: "thin",
          scrollbarColor: "transparent transparent",
          "&:hover": {
            scrollbarColor: "rgba(155, 155, 155, 0.5) transparent",
          },
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "transparent",
            borderRadius: 3,
          },
          "&:hover::-webkit-scrollbar-thumb": {
            background: "rgba(155, 155, 155, 0.5)",
          },
        }}
      >
        {incompleteTasks.length === 0 && completedTasks.length === 0 && (
          <Box
            sx={{
              py: 5,
              textAlign: "center",
              border: isOver ? "2px dashed" : "none",
              borderColor: "primary.main",
              borderRadius: 2,
              m: 1,
            }}
          >
            <Typography variant="body2" color={isOver ? "primary.main" : "text.secondary"}>
              {isOver ? t("tasks.moveToList") : t("tasks.noTasks")}
            </Typography>
          </Box>
        )}

        {/* Sortable incomplete tasks in unified parent DndContext */}
        <SortableContext
          items={incompleteTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {incompleteTasks.map((task) => (
            <SortableTaskItem
              key={`incomplete-${task.id}`}
              task={task}
              onToggle={handleTaskToggle}
              onStar={handleTaskStar}
              onDelete={handleTaskDelete}
              onMove={handleTaskMove}
              onUpdate={handleTaskUpdate}
              onAddSubtask={handleAddSubtask}
              onIndent={handleIndentTask}
              onUnindent={handleUnindentTask}
              onOpenDetail={setDetailTask}
              parentTaskTitle={task.parent ? taskTitleMap.get(task.parent) : undefined}
            />
          ))}
        </SortableContext>

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <>
            <ListItemButton
              onClick={() => setShowCompleted(!showCompleted)}
              sx={{ py: 1, borderTop: 1, borderColor: "divider" }}
            >
              <ListItemText
                primary={`${t("tasks.completed")} (${completedTasks.length})`}
                primaryTypographyProps={{
                  variant: "body2",
                  color: "text.secondary",
                }}
              />
              {showCompleted ? (
                <ExpandLess fontSize="small" />
              ) : (
                <ExpandMore fontSize="small" />
              )}
            </ListItemButton>
            <Collapse in={showCompleted} timeout="auto" unmountOnExit>
              {completedTasks.map((task) => (
                <TaskListItem
                  key={`completed-${task.id}`}
                  task={task}
                  onToggle={handleTaskToggle}
                  onStar={handleTaskStar}
                  onDelete={handleTaskDelete}
                  onMove={handleTaskMove}
                  onUnindent={handleUnindentTask}
                  onOpenDetail={setDetailTask}
                  parentTaskTitle={task.parent ? taskTitleMap.get(task.parent) : undefined}
                />
              ))}
            </Collapse>
          </>
        )}
      </List>

      {/* Task Detail Modal / Sub-Window */}
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
    </Paper>
  );
}
