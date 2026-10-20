/**
 * Task Page
 * 
 * Main page that displays task lists.
 * Bridges old auth system with new hooks.
 */

import { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, Button, Paper } from "@mui/material";
import { LockOutlined, Google } from "@mui/icons-material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accessTokenSelector } from "../config/states";
import { accessTokenAtom, viewStateAtom, taskViewModeAtom } from "../store";
import { useTaskLists } from "../hooks";
import { handleLogin } from "../helpers/auth";
import {
  TaskListsContainer,
  EisenhowerMatrixView,
  AnalyticsView,
  UnifiedListView,
  CalendarTasksView,
  TrashTasksView,
} from "./tasks";

export default function TaskPage() {
  // Get access token from OLD auth system
  const access_token = useRecoilValue(accessTokenSelector);
  
  // Set access token in NEW store system
  const setNewAccessToken = useSetRecoilState(accessTokenAtom);

  // View state
  const viewState = useRecoilValue(viewStateAtom);
  const taskViewMode = useRecoilValue(taskViewModeAtom);

  // Get task lists state from NEW hooks
  const { taskLists, loading, error, fetchTaskLists } = useTaskLists();

  // Sync access token from old system to new system
  useEffect(() => {
    if (access_token) {
      console.log("TaskPage: syncing access token to new store");
      setNewAccessToken(access_token);
    }
  }, [access_token, setNewAccessToken]);

  // Fetch task lists when access token is available
  useEffect(() => {
    if (access_token) {
      console.log("TaskPage: fetching task lists");
      fetchTaskLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access_token]);

  if (!access_token) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" flex={1}>
        <Typography>Not logged in</Typography>
      </Box>
    );
  }

  if (loading && taskLists.length === 0) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={2} flex={1}>
        <CircularProgress size={48} />
        <Typography variant="body2" color="text.secondary">
          Loading your tasks...
        </Typography>
      </Box>
    );
  }

  if (error && taskLists.length === 0) {
    const isAuthError = typeof error === "string" && (error.includes("401") || error.toLowerCase().includes("session") || error.toLowerCase().includes("unauthorized"));
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" gap={2} flex={1} p={3}>
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
              انتهت صلاحية جلسة Google Tasks. يرجى إعادة تسجيل الدخول لمزامنة مهامك وتحديثها.
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
          <>
            <Typography color="error">{error}</Typography>
            <Button variant="outlined" onClick={() => fetchTaskLists(true)}>
              Retry
            </Button>
          </>
        )}
      </Box>
    );
  }

  const currentViewKey =
    viewState.view === "analytics"
      ? "analytics"
      : viewState.view === "eisenhower"
      ? "eisenhower"
      : viewState.view === "trash"
      ? "trash"
      : taskViewMode === "list"
      ? "list"
      : taskViewMode === "calendar"
      ? "calendar"
      : "board";

  const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set([currentViewKey]));

  useEffect(() => {
    setMountedViews((prev) => {
      if (prev.has(currentViewKey)) return prev;
      return new Set(prev).add(currentViewKey);
    });
  }, [currentViewKey]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "hidden",
        display: "flex",
        position: "relative",
        bgcolor: "background.default",
      }}
    >
      {mountedViews.has("board") && (
        <Box sx={{ flex: 1, display: currentViewKey === "board" ? "flex" : "none", width: "100%", height: "100%" }}>
          <TaskListsContainer />
        </Box>
      )}
      {mountedViews.has("list") && (
        <Box sx={{ flex: 1, display: currentViewKey === "list" ? "flex" : "none", width: "100%", height: "100%" }}>
          <UnifiedListView />
        </Box>
      )}
      {mountedViews.has("calendar") && (
        <Box sx={{ flex: 1, display: currentViewKey === "calendar" ? "flex" : "none", width: "100%", height: "100%" }}>
          <CalendarTasksView />
        </Box>
      )}
      {mountedViews.has("eisenhower") && (
        <Box sx={{ flex: 1, display: currentViewKey === "eisenhower" ? "flex" : "none", width: "100%", height: "100%" }}>
          <EisenhowerMatrixView />
        </Box>
      )}
      {mountedViews.has("analytics") && (
        <Box sx={{ flex: 1, display: currentViewKey === "analytics" ? "flex" : "none", width: "100%", height: "100%" }}>
          <AnalyticsView isVisible={currentViewKey === "analytics"} />
        </Box>
      )}
      {mountedViews.has("trash") && (
        <Box sx={{ flex: 1, display: currentViewKey === "trash" ? "flex" : "none", width: "100%", height: "100%" }}>
          <TrashTasksView />
        </Box>
      )}
    </Box>
  );
}
