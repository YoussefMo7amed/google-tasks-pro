import { useEffect } from "react";
import {
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  getAccessToken,
  saveAuthCode,
  handleInitialLogin,
  handleLoadFrom,
  handleLogin,
  handleLogout,
  cancelLoginSession,
  handleManualAuthCode,
} from "./helpers/auth";
import { loadContextmenu } from "./helpers/windowhelper";
import TaskPage from "./components/TaskPage";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  activeTaskCategoryState,
  attemptLoginState,
  attemptLogoutState,
  authLoadingState,
  isOnlineSelector,
  loggedInSelector,
  messageState,
} from "./config/states";
import Header from "./components/ui/Header";
import SplashScreen from "./components/ui/SplashScreen";
import LoginChoice from "./components/ui/LoginChoice";
import { Sidebar } from "./components/layout";
import { aiCopilotOpenAtom, settingsOpenAtom, shortcutsModalOpenAtom } from "./store";
import AICopilotModal from "./components/ai/AICopilotModal";
import SettingsDialog from "./components/ui/SettingsDialog";
import KeyboardShortcutsModal from "./components/ui/KeyboardShortcutsModal";
import QuickCreateTaskDialog from "./components/ui/QuickCreateTaskDialog";
import { useGlobalKeyboardShortcuts, useTaskLists } from "./hooks";
import { listen_for_auth_code } from "./helpers/eventlistner";
import { SettingsStore } from "./helpers/DBStores";
import settings from "./config/settings";

// disable default context menu on build
loadContextmenu();

function App() {
  const [loading, setLoading] = useRecoilState<boolean>(authLoadingState);
  const activeCategoryValue = useRecoilValue(activeTaskCategoryState);
  const loggedIn = useRecoilValue(loggedInSelector);
  const [attemptedLogin, setAttemptedLogin] =
    useRecoilState<boolean>(attemptLoginState);
  const [attemptedLogout, setAttemptedLogout] =
    useRecoilState<boolean>(attemptLogoutState);
  const [toastMessage, setToastMessage] = useRecoilState(messageState);
  const [aiCopilotOpen, setAiCopilotOpen] = useRecoilState(aiCopilotOpenAtom);
  const [settingsOpen, setSettingsOpen] = useRecoilState(settingsOpenAtom);
  const [shortcutsOpen, setShortcutsOpen] = useRecoilState(shortcutsModalOpenAtom);
  const setIsOnline = useSetRecoilState(isOnlineSelector);
  const refreshIsOnline = () => setIsOnline(() => navigator.onLine);
  const { fetchTaskLists } = useTaskLists();

  // Global keyboard shortcuts (Undo/Redo, ?, Cmd+K, 1-4, Esc, etc.)
  useGlobalKeyboardShortcuts({
    onSync: () => fetchTaskLists(true),
  });

  // Handle toast messages with MUI Snackbar
  const handleCloseToast = () => {
    setToastMessage(null);
  };

  useEffect(() => {
    if (attemptedLogin) {
      handleLogin(false);
      setAttemptedLogin(false);
    }
  }, [attemptedLogin]);

  useEffect(() => {
    if (attemptedLogout) {
      handleLogout();
      setAttemptedLogout(false);
    }
  }, [attemptedLogout]);

  useEffect(() => {
    SettingsStore.set(
      settings.storage.constants.last_active_category,
      activeCategoryValue
    ).then(() => {
      console.log("Setting active category");
    });
  }, [activeCategoryValue]);

  // Generate port and listen for auth code
  useEffect(() => {
    listen_for_auth_code({
      onSucess: (code) => {
        console.log(code, "code generated");
        if (code) {
          saveAuthCode(code).then(() => {
            console.log("code saved");
          });
          getAccessToken(code)
            .then((accessTokenBody) => {
              handleLoadFrom(accessTokenBody);
            })
            .catch((err) => {
              console.error("Failed to get access token from code:", err);
              setLoading(false);
              setToastMessage({
                title: "Error",
                body: "Could not retrieve access token. Please try again.",
                type: "error",
              });
            });
        }
      },
      onError: (err) => {
        console.log(err);
        setLoading(false);
        setToastMessage({
          title: "Error",
          body: "Error signing in",
          type: "error",
        });
      },
    });
  }, []);

  // Check offline data for access token
  useEffect(() => {
    setLoading(true);

    // Safety timeout: Ensure splash screen never hangs indefinitely
    const safetyTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Auth initialization timed out")), 4000)
    );

    Promise.race([handleInitialLogin(), safetyTimeout])
      .catch((err) => {
        console.log("Initial login attempt finished:", err?.message || err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setToastMessage({
        title: "Network Changed",
        body: "Internet restored - syncing changes",
        type: "success",
      });
      refreshIsOnline();
    };

    const handleOffline = () => {
      setToastMessage({
        title: "Network Changed",
        body: "Working offline - changes will sync when reconnected",
        type: "info",
      });
      refreshIsOnline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshIsOnline, setToastMessage]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* Main Layout */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar - only show when logged in */}
        {loggedIn && <Sidebar />}

        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Header />

          {/* Content */}
          {loggedIn ? (
            <TaskPage />
          ) : loading ? (
            <SplashScreen
              message="Connecting to Google"
              onCancel={() => {
                cancelLoginSession();
                setLoading(false);
              }}
              onManualCode={handleManualAuthCode}
            />
          ) : (
            <LoginChoice
              onContinueAsUser={() => setAttemptedLogin(true)}
              onSignInAnother={() => handleLogin(true)}
            />
          )}
        </Box>
      </Box>

      {/* Toast Messages */}
      <Snackbar
        open={!!toastMessage}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={
            toastMessage &&
            ["error", "warning", "info", "success"].includes(toastMessage.type)
              ? (toastMessage.type as "error" | "warning" | "info" | "success")
              : "info"
          }
          variant="filled"
        >
          <div>{toastMessage ? toastMessage.title : ""}</div>
          {toastMessage && toastMessage.body && (
            <>
              <br />
              {toastMessage.body}
            </>
          )}
        </Alert>
      </Snackbar>

      {/* AI Copilot Assistant Modal */}
      <AICopilotModal
        open={aiCopilotOpen}
        onClose={() => setAiCopilotOpen(false)}
        onOpenSettings={() => {
          setAiCopilotOpen(false);
          setSettingsOpen(true);
        }}
      />

      {/* Global Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Quick Create Task Modal (N / C) */}
      <QuickCreateTaskDialog />
    </Box>
  );
}

export default App;