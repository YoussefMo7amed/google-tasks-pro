/**
 * Service Provider Hook
 * 
 * Creates and provides singleton service instances.
 * Services are recreated when access token changes.
 */

import { useMemo } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { setRecoil } from "recoil-nexus";
import { accessTokenAtom } from "../store";
import { accessTokenSelector, accessTokenState } from "../config/states";
import { createApiClient, GoogleTasksClient } from "../api";
import { TaskListRepository, TaskRepository, StarredRepository } from "../repositories";
import { TaskListService, TaskService } from "../services";
import { getAccessTokenFromStorage, refreshAndSaveAccessToken } from "../helpers/auth";

interface Services {
  client: GoogleTasksClient | null;
  taskLists: TaskListService | null;
  tasks: TaskService | null;
  starred: StarredRepository;
}

// Singleton starred repository (doesn't need token)
const starredRepo = new StarredRepository();

/**
 * Hook to get all services
 * Services are recreated when access token changes.
 */
export function useServices(): Services {
  const atomToken = useRecoilValue(accessTokenAtom);
  const selectorToken = useRecoilValue(accessTokenSelector);
  const setAtomToken = useSetRecoilState(accessTokenAtom);
  const accessToken = atomToken || selectorToken;

  const services = useMemo(() => {
    if (!accessToken) {
      return {
        client: null,
        taskLists: null,
        tasks: null,
        starred: starredRepo,
      };
    }

    // Create API client
    const client = createApiClient({
      accessToken,
      refreshToken: async () => {
        try {
          const storedToken = await getAccessTokenFromStorage();
          if (storedToken && storedToken.refresh_token) {
            console.log("useServices: refreshing access token via refreshAndSaveAccessToken");
            const refreshed = await refreshAndSaveAccessToken(storedToken.refresh_token);
            if (refreshed && refreshed.access_token) {
              setAtomToken(refreshed.access_token);
              setRecoil(accessTokenState, refreshed.access_token);
              return refreshed.access_token;
            }
          }
        } catch (err) {
          console.warn("useServices: failed to refresh token:", err);
        }
        return null;
      },
      onTokenExpired: () => {
        console.warn("Token expired and auto-refresh unavailable - need re-auth");
      },
      onError: (error) => {
        console.error("API error:", error);
      },
    });

    // Create repositories
    const taskListRepo = new TaskListRepository(client);
    const taskRepo = new TaskRepository(client);

    // Create services
    const taskListService = new TaskListService(taskListRepo, taskRepo, starredRepo);
    const taskService = new TaskService(taskRepo, starredRepo);

    return {
      client,
      taskLists: taskListService,
      tasks: taskService,
      starred: starredRepo,
    };
  }, [accessToken]);

  return services;
}

/**
 * Hook to check if services are ready
 */
export function useServicesReady(): boolean {
  const { client }= useServices();
  return client !== null;
}
