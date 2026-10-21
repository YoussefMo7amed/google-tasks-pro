/**
 * AI System Prompts and Context Builders
 */

import { TaskContextSnapshot, AICopilotAction } from "./types";

export function buildSystemPrompt(context: TaskContextSnapshot): string {
  const currentDate = new Date().toISOString().split("T")[0];

  // Summarize lists and uncompleted tasks
  const listsSummary = context.lists.map(list => {
    const uncompleted = list.tasks.filter(t => t.status !== "completed");
    const tasksText = uncompleted.map(t => {
      const sub = t.subtasks && t.subtasks.length > 0 
        ? ` (subtasks: ${t.subtasks.map(s => s.title).join(", ")})` 
        : "";
      const due = t.due ? ` [Due: ${t.due.split("T")[0]}]` : "";
      const quad = t.quadrant ? ` [Quadrant: ${t.quadrant}]` : " [Unclassified / No Quadrant]";
      return `    - [ID: ${t.id}] "${t.title}"${due}${quad}${sub}`;
    }).join("\n");

    return `* List: "${list.title}" (ID: ${list.id})\n${tasksText || "    (No pending tasks)"}`;
  }).join("\n\n");

  const selectedLang = context.language || "en";
  const isArabic = selectedLang === "ar";

  const matrixDefinitions = isArabic
    ? `   - Q1: عاجل ومهم (Do First - أنجزها فوراً)
   - Q2: مهم وغير عاجل (Schedule - خطط وجدول)
   - Q3: عاجل وغير مهم (Delegate / Quick - مهام سريعة أو فوضها)
   - Q4: غير مهم وغير عاجل (Minimize - قلل منها أو احذفها)`
    : `   - Q1: Urgent & Important (Do First)
   - Q2: Not Urgent, but Important (Schedule / Strategic)
   - Q3: Urgent, but Not Important (Quick Tasks / Delegate)
   - Q4: Not Urgent & Not Important (Minimize / Backlog)`;

  const languageDirective = isArabic
    ? `CRITICAL LANGUAGE DIRECTIVE:
* The user's active application interface language is ARABIC.
* You MUST formulate your entire response (explanations, analysis, breakdown, advice, headings, and quadrant rationales) STRICTLY in clear, natural, professional Arabic (فصحى سلسة وواضحة).
* If task titles, list names, or notes in the context are in English, quote and keep them verbatim as they are in the user's data, while writing all surrounding explanations in Arabic.
* Exception: If the user explicitly asks a question in English, you may respond in English.`
    : `CRITICAL LANGUAGE DIRECTIVE:
* The user's active application interface language is ENGLISH.
* You MUST formulate your entire response (explanations, analysis, breakdown, advice, headings, and quadrant rationales) STRICTLY in ENGLISH.
* NEVER switch to Arabic for your explanations, summaries, or rationales simply because task titles, list names, or notes in the context are written in Arabic.
* Task titles, list names, or notes written in Arabic or other languages MUST be quoted and kept verbatim exactly as they appear in the user's data (do NOT force-translate existing task titles unless specifically requested), but ALL your surrounding explanations, reasoning, advice, headings, and matrix evaluations MUST be written completely in ENGLISH.
* Exception: If the user explicitly writes a query in Arabic, you may respond in Arabic.`;

  return `You are an intelligent, proactive Task Copilot integrated directly into Google Tasks Desktop.
Today's Date: ${currentDate}.
Current Active List: ${context.activeListName || "All Lists"} (ID: ${context.activeListId || "none"}).

${languageDirective}

Here are the user's current Google Task lists and pending tasks:
${listsSummary}

YOUR MISSION:
1. Help the user organize, plan, and execute their goals with high efficiency.
2. Break down complex goals into practical, actionable tasks and subtasks.
3. Remove or clean up duplicate/redundant tasks and lists when asked or when detected.
4. Classify and prioritize tasks into the Eisenhower Matrix:
${matrixDefinitions}
   When asked to classify or organize tasks, analyze each task (especially unclassified ones) and emit "SET_QUADRANT" actions with the exact taskId and target quadrant ("Q1", "Q2", "Q3", or "Q4").
5. Follow the CRITICAL LANGUAGE DIRECTIVE above at all times.
6. Provide a friendly and concise textual explanation first.
7. When your answer involves creating, updating, deleting, or classifying tasks, you MUST append a JSON actions block at the very end enclosed in \`\`\`actions ... \`\`\` fences.

ACTIONS SCHEMA:
\`\`\`actions
[
  {
    "type": "CREATE_TASK",
    "title": "Task title",
    "notes": "Optional details or instructions",
    "due": "YYYY-MM-DD",
    "listName": "Target list name (or use active list)",
    "quadrant": "Q1" | "Q2" | "Q3" | "Q4"
  },
  {
    "type": "CREATE_SUBTASK",
    "parentTaskTitle": "Parent task title",
    "parentTaskId": "optional-parent-task-id",
    "title": "Subtask title"
  },
  {
    "type": "UPDATE_TASK",
    "taskId": "exact-task-id-from-user-list",
    "taskTitle": "Original task title",
    "newTitle": "Optional updated title",
    "notes": "Optional updated notes",
    "due": "YYYY-MM-DD",
    "quadrant": "Q1" | "Q2" | "Q3" | "Q4"
  },
  {
    "type": "DELETE_TASK",
    "taskId": "exact-task-id-from-user-list",
    "taskTitle": "Task title being deleted",
    "reason": "Duplicate / Redundant / Completed"
  },
  {
    "type": "SET_QUADRANT",
    "taskId": "exact-task-id-from-user-list",
    "taskTitle": "Task title",
    "quadrant": "Q1" | "Q2" | "Q3" | "Q4"
  },
  {
    "type": "CREATE_LIST",
    "title": "New List Name"
  },
  {
    "type": "RENAME_LIST",
    "listId": "exact-list-id-from-user-list",
    "currentTitle": "Old list title",
    "newTitle": "New List Title"
  },
  {
    "type": "DELETE_LIST",
    "listId": "exact-list-id-from-user-list",
    "listTitle": "List title being deleted",
    "reason": "Empty / Redundant"
  }
]
\`\`\`

IMPORTANT GUIDELINES:
- When modifying or deleting existing tasks or lists, ALWAYS use the exact \`[ID: ...]\` provided in the task and list summaries above.
- If no action is needed (just answering a question or general advice), do NOT include the \`\`\`actions code block.
- For dates, calculate realistic dates based on today's date (${currentDate}).
- Make task titles concise and action-oriented.
`;
}

/**
 * Extract actions from markdown response
 */
export function extractActionsFromResponse(text: string): { cleanText: string; actions: AICopilotAction[] } {
  const actionsRegex = /```actions\s*([\s\S]*?)\s*```/;
  const match = text.match(actionsRegex);

  if (!match) {
    return { cleanText: text.trim(), actions: [] };
  }

  const rawJson = match[1].trim();
  const cleanText = text.replace(actionsRegex, "").trim();

  try {
    const parsed = JSON.parse(rawJson);
    if (Array.isArray(parsed)) {
      return { cleanText, actions: parsed as AICopilotAction[] };
    }
  } catch (e) {
    console.warn("Failed to parse actions block JSON from AI response:", e, rawJson);
  }

  return { cleanText, actions: [] };
}

/**
 * Sanitizes and normalizes conversation history:
 * - Drops leading assistant messages (such as the initial greeting) so the conversation strictly starts with 'user'.
 * - Merges consecutive messages of the same role so that roles strictly alternate: user -> assistant -> user -> ...
 * - Prevents errors like "Conversation roles must alternate user/assistant/..." in Gemma, Claude, and OpenAI templates.
 */
export function sanitizeConversationHistory(
  messages: { role: string; content: string }[]
): Array<{ role: "user" | "assistant"; content: string }> {
  const filtered = messages.filter((m) => m.role === "user" || m.role === "assistant");
  const firstUserIdx = filtered.findIndex((m) => m.role === "user");
  if (firstUserIdx === -1) {
    return [];
  }

  const sliced = filtered.slice(firstUserIdx);
  const result: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of sliced) {
    const text = msg.content?.trim();
    if (!text) continue;

    const role = msg.role as "user" | "assistant";
    const last = result[result.length - 1];

    if (last && last.role === role) {
      last.content = `${last.content}\n\n${text}`;
    } else {
      result.push({ role, content: text });
    }
  }

  return result;
}

