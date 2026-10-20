/**
 * Task Lists Container
 * 
 * Horizontal scrollable container for task list cards with unified drag-and-drop.
 * Supports:
 * - Dragging tasks between different lists (Cross-list drag-and-drop)
 * - Reordering tasks within the same list
 * - Reordering task list columns
 * - Also shows StarredTasksCard when in starred view.
 */

import { useRef, useState, useEffect } from "react";
import { Box, IconButton, Typography, CircularProgress, Paper, Button, Alert } from "@mui/material";
import { ChevronLeft, ChevronRight, LockOutlined, Google } from "@mui/icons-material";
import { handleLogin } from "../../helpers/auth";
import {
  DndContext,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useTaskLists, useTasks } from "../../hooks";
import { useRecoilValue } from "recoil";
import { viewStateAtom } from "../../store";
import { AppTask, AppTaskList } from "../../types/app";
import TaskListCard from "./TaskListCard";
import SortableTaskCard from "./SortableTaskCard";
import StarredTasksCard from "./StarredTasksCard";
import TaskListItem from "./TaskListItem";
import { useTranslation } from "../../i18n";

export default function TaskListsContainer() {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { taskLists, loading, error, fetchTaskLists, reorderTaskLists } = useTaskLists();
  const { moveTaskToList, reorderTasksLocally } = useTasks();
  const viewState = useRecoilValue(viewStateAtom);

  const [activeTask, setActiveTask] = useState<AppTask | null>(null);
  const [activeList, setActiveList] = useState<AppTaskList | null>(null);

  // Fetch task lists on mount
  useEffect(() => {
    fetchTaskLists();
  }, [fetchTaskLists]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = 320;
      containerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "task") {
      setActiveTask(data.task);
      setActiveList(null);
    } else if (data?.type === "column") {
      setActiveList(data.list);
      setActiveTask(null);
    }
    document.body.style.cursor = "grabbing";
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveList(null);
    document.body.style.cursor = "";

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 1. Column reordering
    if (activeData?.type === "column") {
      const activeListId = activeData.listId;
      const overListId = overData?.listId;

      if (overListId && activeListId !== overListId) {
        const oldIndex = taskLists.findIndex((list) => list.id === activeListId);
        const newIndex = taskLists.findIndex((list) => list.id === overListId);

        if (oldIndex !== -1 && newIndex !== -1) {
          reorderTaskLists(oldIndex, newIndex);
        }
      }
      return;
    }

    // 2. Task moving or reordering
    if (activeData?.type === "task") {
      const sourceListId = activeData.listId;
      const taskId = activeData.taskId;

      // Resolve destination list ID
      let targetListId: string | undefined;

      if (overData?.type === "task") {
        targetListId = overData.listId;
      } else if (overData?.type === "list_droppable") {
        targetListId = overData.listId;
      } else if (overData?.type === "column") {
        targetListId = overData.listId;
      } else if (typeof over.id === "string") {
        if (over.id.startsWith("droppable_")) {
          targetListId = over.id.replace("droppable_", "");
        } else if (over.id.startsWith("col_")) {
          targetListId = over.id.replace("col_", "");
        }
      }

      if (!targetListId) return;

      // CASE 2A: Dropped onto ANOTHER list! (Cross-list drag-and-drop)
      if (sourceListId !== targetListId) {
        await moveTaskToList(sourceListId, taskId, targetListId);
        return;
      }

      // CASE 2B: Reordered within the SAME list
      if (sourceListId === targetListId && overData?.type === "task" && active.id !== over.id) {
        const list = taskLists.find((l) => l.id === sourceListId);
        if (!list) return;

        const tasks = [...list.tasks];
        const oldIndex = tasks.findIndex((t) => t.id === active.id);
        const newIndex = tasks.findIndex((t) => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(tasks, oldIndex, newIndex);
          reorderTasksLocally(sourceListId, reordered);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveList(null);
    document.body.style.cursor = "";
  };

  // Custom collision detection: checks pointerWithin first, then closestCorners
  const collisionDetection = (args: any) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return closestCorners(args);
  };

  // Filter visible lists
  const visibleLists = taskLists.filter((list) => list.isVisible);

  if (loading && taskLists.length === 0) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && taskLists.length === 0) {
    const isAuthError = typeof error === "string" && (error.includes("401") || error.toLowerCase().includes("session") || error.toLowerCase().includes("unauthorized"));
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
        {isAuthError ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              maxWidth: 420,
              textAlign: "center",
              bgcolor: "background.paper",
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "rgba(234, 67, 53, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlined sx={{ fontSize: 32, color: "error.main" }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>
              انتهت جلسة تسجيل الدخول
            </Typography>
            <Typography variant="body2" color="text.secondary">
              انتهت صلاحية جلسة Google Tasks. يرجى تسجيل الدخول مرة أخرى لمزامنة مهامك وتحديثها.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Google />}
              onClick={() => handleLogin(true)}
              sx={{ mt: 1, borderRadius: 2 }}
            >
              تسجيل الدخول مع Google
            </Button>
          </Paper>
        ) : (
          <Typography color="error">{error}</Typography>
        )}
      </Box>
    );
  }

  if (taskLists.length === 0) {
    return (
      <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Typography color="text.secondary">
          No task lists yet. Create one to get started!
        </Typography>
      </Box>
    );
  }

  // Show StarredTasksCard when in starred view
  if (viewState.view === "starred") {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          py: 2,
          px: 4,
        }}
      >
        <StarredTasksCard />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        flex: 1,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "stretch",
      }}
    >
      {/* Banner when viewing cached tasks during session expiration or offline */}
      {error && (
        <Box sx={{ position: "absolute", top: 8, left: 60, right: 60, zIndex: 12 }}>
          <Alert
            severity={error.toLowerCase().includes("session") || error.includes("401") ? "warning" : "info"}
            action={
              error.toLowerCase().includes("session") || error.includes("401") ? (
                <Button color="inherit" size="small" onClick={() => handleLogin(true)}>
                  {t("auth.signIn")}
                </Button>
              ) : (
                <Button color="inherit" size="small" onClick={() => fetchTaskLists(true)}>
                  {t("common.retry")}
                </Button>
              )
            }
          >
            {error.toLowerCase().includes("session") || error.includes("401")
              ? t("auth.cachedModeSessionBanner")
              : t("auth.cachedModeOfflineBanner")}
          </Alert>
        </Box>
      )}

      {/* Left scroll button */}
      <IconButton
        onClick={() => scroll("left")}
        sx={{
          position: "absolute",
          left: 10,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          bgcolor: "background.paper",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          border: 1,
          borderColor: "divider",
          opacity: 0.85,
          "&:hover": {
            opacity: 1,
            bgcolor: "background.paper",
          },
        }}
        size="small"
      >
        <ChevronLeft />
      </IconButton>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={visibleLists.map((list) => `col_${list.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          <Box
            ref={containerRef}
            sx={{
              display: "flex",
              gap: 2.5,
              overflowX: "auto",
              overflowY: "hidden",
              flexWrap: "nowrap",
              py: 2,
              px: 6,
              height: "100%",
              alignItems: "stretch",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            {visibleLists.map((list) => (
              <SortableTaskCard
                key={list.id}
                taskList={list}
                isActive={viewState.activeListId === list.id}
              />
            ))}
          </Box>
        </SortableContext>

        {/* Unified Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeList ? (
            <Box
              sx={{
                opacity: 0.9,
                transform: "rotate(2deg)",
                cursor: "grabbing",
              }}
            >
              <TaskListCard
                taskList={activeList}
                isActive={false}
                isDragOverlay
              />
            </Box>
          ) : activeTask ? (
            <Paper
              elevation={6}
              sx={{
                width: 310,
                borderRadius: 2,
                p: 0.5,
                bgcolor: "background.paper",
                border: "1.5px solid",
                borderColor: "primary.main",
                transform: "rotate(2deg)",
                cursor: "grabbing",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <TaskListItem
                task={activeTask}
                onToggle={() => {}}
                onStar={() => {}}
                onDelete={() => {}}
                onMove={() => {}}
              />
            </Paper>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Right scroll button */}
      <IconButton
        onClick={() => scroll("right")}
        sx={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          bgcolor: "background.paper",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          border: 1,
          borderColor: "divider",
          opacity: 0.85,
          "&:hover": {
            opacity: 1,
            bgcolor: "background.paper",
          },
        }}
        size="small"
      >
        <ChevronRight />
      </IconButton>
    </Box>
  );
}
