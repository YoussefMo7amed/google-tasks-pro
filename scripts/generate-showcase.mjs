import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Generate dynamic ISO date helper relative to now
function getDateOffset(dayOffset, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function getLocalDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = getDateOffset(0);
const tomorrow = getDateOffset(1);
const in2Days = getDateOffset(2);
const in3Days = getDateOffset(3);
const in4Days = getDateOffset(4);
const in5Days = getDateOffset(5);

const sampleTaskLists = [
  {
    kind: "tasks#taskList",
    id: "list-launch",
    title: "🎯 Product Launch",
    updated: today,
    isVisible: true,
    incompleteCount: 5,
    tasks: [
      {
        id: "task-launch-1",
        listId: "list-launch",
        title: "[Q1] Ship v2.1 Desktop & Android Release",
        notes: "Verify macOS signed builds, offline cache sync, and responsive RTL layout.",
        status: "needsAction",
        due: today,
        exactTime: "09:30",
        isStarred: true,
        updated: today,
      },
      {
        id: "task-launch-2",
        listId: "list-launch",
        title: "[Q1] Review API Security & OAuth Consent",
        notes: "Ensure limited-use disclosure and privacy policy match Google Cloud Console guidelines.",
        status: "needsAction",
        due: today,
        exactTime: "11:00",
        isStarred: true,
        updated: today,
      },
      {
        id: "task-launch-3",
        listId: "list-launch",
        title: "[Q2] Design Marketing Showcase Assets",
        notes: "Prepare high-resolution showcase graphics for GitHub README and documentation.",
        status: "needsAction",
        due: tomorrow,
        exactTime: "14:00",
        isStarred: false,
        updated: tomorrow,
        subtasks: [
          {
            id: "sub-1",
            listId: "list-launch",
            title: "Capture crisp dark mode window screenshots",
            status: "completed",
            isStarred: false,
            updated: today,
          },
          {
            id: "sub-2",
            listId: "list-launch",
            title: "Highlight Eisenhower matrix and recurring tasks",
            status: "needsAction",
            isStarred: false,
            updated: today,
          },
          {
            id: "sub-3",
            listId: "list-launch",
            title: "Format bilingual English & Arabic captions",
            status: "needsAction",
            isStarred: false,
            updated: today,
          },
        ],
      },
      {
        id: "task-launch-4",
        listId: "list-launch",
        title: "[Q2] Finalize Onboarding & Keyboard Cheatsheet",
        notes: "Cover Cmd+Z (Undo), Cmd+K (AI Copilot), and 1-4 view shortcuts.",
        status: "needsAction",
        due: in2Days,
        exactTime: "16:00",
        recurrence: { frequency: "weekly", interval: 1, endType: "never" },
        isStarred: false,
        updated: in2Days,
      },
      {
        id: "task-launch-5",
        listId: "list-launch",
        title: "[Q3] Coordinate Beta User Feedback Interviews",
        status: "needsAction",
        due: today,
        exactTime: "15:30",
        isStarred: false,
        updated: today,
      },
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-core",
    title: "💡 Core Architecture",
    updated: today,
    isVisible: true,
    incompleteCount: 4,
    tasks: [
      {
        id: "task-core-1",
        listId: "list-core",
        title: "[Q2] Benchmark SQLite Local Storage vs Caching",
        notes: "Measure cold startup latency and memory overhead on 10,000+ cached tasks.",
        status: "needsAction",
        due: in3Days,
        exactTime: "10:30",
        isStarred: true,
        updated: in3Days,
      },
      {
        id: "task-core-2",
        listId: "list-core",
        title: "[Q2] Optimize Startup Bundle Size & Tree-Shaking",
        notes: "Target: sub-100ms first paint with zero UI allocation overhead.",
        status: "needsAction",
        due: today,
        exactTime: "17:00",
        isStarred: false,
        updated: today,
      },
      {
        id: "task-core-3",
        listId: "list-core",
        title: "[Q1] Fix Touch Drag-and-Drop Auto-Scroll Sensitivity",
        status: "needsAction",
        due: today,
        exactTime: "13:00",
        isStarred: false,
        updated: today,
      },
      {
        id: "task-core-4",
        listId: "list-core",
        title: "[Q3] Review Incoming Open-Source PRs",
        status: "needsAction",
        due: tomorrow,
        exactTime: "11:30",
        isStarred: false,
        updated: tomorrow,
      },
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-habits",
    title: "⚡ Daily Habits & Focus",
    updated: today,
    isVisible: true,
    incompleteCount: 3,
    tasks: [
      {
        id: "task-habits-1",
        listId: "list-habits",
        title: "[Q2] 45-min Deep Focus Reading & Skill Research",
        status: "needsAction",
        due: today,
        exactTime: "12:00",
        recurrence: { frequency: "daily", interval: 1, endType: "never" },
        isStarred: true,
        updated: today,
      },
      {
        id: "task-habits-2",
        listId: "list-habits",
        title: "[Q2] Afternoon Team Standup & Sync",
        status: "needsAction",
        due: today,
        exactTime: "14:30",
        isStarred: false,
        updated: today,
      },
      {
        id: "task-habits-3",
        listId: "list-habits",
        title: "[Q3] Clear Inbox & Respond to Non-Urgent Emails",
        status: "needsAction",
        due: today,
        exactTime: "16:45",
        isStarred: false,
        updated: today,
      },
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-ideas",
    title: "📚 Learning & Ideas",
    updated: today,
    isVisible: true,
    incompleteCount: 3,
    tasks: [
      {
        id: "task-ideas-1",
        listId: "list-ideas",
        title: "[Q2] Explore Rust / WebAssembly Mobile Plugins",
        status: "needsAction",
        due: in4Days,
        isStarred: false,
        updated: in4Days,
      },
      {
        id: "task-ideas-2",
        listId: "list-ideas",
        title: "[Q2] Read 'Building Data-Intensive Applications'",
        status: "needsAction",
        due: in5Days,
        isStarred: false,
        updated: in5Days,
      },
      {
        id: "task-ideas-3",
        listId: "list-ideas",
        title: "[Q3] Follow Up on Design System Component Tokens",
        status: "needsAction",
        due: in5Days,
        isStarred: false,
        updated: in5Days,
      },
    ],
  },
];

// Arabic lists for RTL showcase
const arabicTaskLists = [
  {
    kind: "tasks#taskList",
    id: "list-ar-launch",
    title: "🎯 إطلاق المشروع",
    updated: today,
    isVisible: true,
    incompleteCount: 4,
    tasks: [
      {
        id: "ar-task-1",
        listId: "list-ar-launch",
        title: "[مربع 1] إصدار النسخة v2.1 لتطبيقي الديسكتوب والأندرويد",
        notes: "التحقق من المزامنة دون إنترنت ودعم الواجهة العربية بالكامل.",
        status: "needsAction",
        due: today,
        exactTime: "09:30",
        isStarred: true,
        updated: today,
      },
      {
        id: "ar-task-2",
        listId: "list-ar-launch",
        title: "[مربع 1] مراجعة إعدادات الأمان وموافقة Google OAuth",
        status: "needsAction",
        due: today,
        exactTime: "11:00",
        isStarred: true,
        updated: today,
      },
      {
        id: "ar-task-3",
        listId: "list-ar-launch",
        title: "[مربع 2] تجهيز الصور الترويجية للمستودع والتوثيق",
        status: "needsAction",
        due: tomorrow,
        exactTime: "14:00",
        isStarred: false,
        updated: tomorrow,
      },
      {
        id: "ar-task-4",
        listId: "list-ar-launch",
        title: "[مربع 2] مراجعة اختصارات لوحة المفاتيح التفاعلية",
        status: "needsAction",
        due: in2Days,
        exactTime: "16:00",
        isStarred: false,
        updated: in2Days,
      },
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-ar-core",
    title: "💡 التطوير والبنية التحتية",
    updated: today,
    isVisible: true,
    incompleteCount: 3,
    tasks: [
      {
        id: "ar-task-5",
        listId: "list-ar-core",
        title: "[مربع 2] تسريع سرعة الإقلاع البارد وتقليل استهلاك الذاكرة",
        status: "needsAction",
        due: today,
        exactTime: "17:00",
        isStarred: true,
        updated: today,
      },
      {
        id: "ar-task-6",
        listId: "list-ar-core",
        title: "[مربع 1] معالجة حساسية التمرير التلقائي أثناء السحب والإفلات",
        status: "needsAction",
        due: today,
        exactTime: "13:00",
        isStarred: false,
        updated: today,
      },
      {
        id: "ar-task-7",
        listId: "list-ar-core",
        title: "[مربع 3] مراجعة طلبات السحب والمساهمات المفتوحة",
        status: "needsAction",
        due: tomorrow,
        exactTime: "11:30",
        isStarred: false,
        updated: tomorrow,
      },
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-ar-habits",
    title: "⚡ الروتين والتركيز العميق",
    updated: today,
    isVisible: true,
    incompleteCount: 3,
    tasks: [
      {
        id: "ar-task-8",
        listId: "list-ar-habits",
        title: "[مربع 2] جلسة قراءة وبحث تقني لمدة 45 دقيقة",
        status: "needsAction",
        due: today,
        exactTime: "12:00",
        recurrence: { frequency: "daily", interval: 1, endType: "never" },
        isStarred: true,
        updated: today,
      },
      {
        id: "ar-task-9",
        listId: "list-ar-habits",
        title: "[مربع 2] الاجتماع اليومي السريع لمزامنة الفريق",
        status: "needsAction",
        due: today,
        exactTime: "14:30",
        isStarred: false,
        updated: today,
      },
      {
        id: "ar-task-10",
        listId: "list-ar-habits",
        title: "[مربع 3] الرد على الرسائل والبريد الإلكتروني",
        status: "needsAction",
        due: today,
        exactTime: "16:45",
        isStarred: false,
        updated: today,
      },
    ],
  },
];

// Generate 14-day history for streaks
const sampleHistory = [];
for (let i = 0; i < 14; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dateKey = getLocalDateKey(d);
  const count = i === 0 ? 3 : (i % 3) + 1;
  for (let j = 0; j < count; j++) {
    const quadrants = ["Q1", "Q2", "Q2", "Q3"];
    const q = quadrants[(i + j) % quadrants.length];
    sampleHistory.push({
      id: `hist-task-${i}-${j}`,
      title: `[${q}] Completed item ${i}-${j}`,
      listId: "list-launch",
      listName: "Product Launch",
      completedAt: d.toISOString(),
      dateKey,
      quadrant: q,
    });
  }
}

// AI Chat with Suggested Actions
const sampleAIChatSessions = [
  {
    id: "session-release-planning",
    title: "Release Planning & Subtasks",
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Review my current task lists and suggest improvements for vague titles, add missing due dates, and break down complex goals into subtasks.",
        timestamp: Date.now() - 300000,
      },
      {
        id: "msg-2",
        role: "assistant",
        content: `Here is an analysis and strategic breakdown of your upcoming sprint:

### 1. Title Clarifications
* **Vague:** \`Follow up on design system component token ideas\`
  * **Improved:** *"Document design token specs for dark/light theme components"* — provides a crisp, actionable deliverable.
* **Routine vs. Deep Priority:** \`Afternoon team standup & sync\` is currently marked as **Q2**, but daily coordination belongs in **Q3** so your Q2 quadrant remains dedicated to uninterrupted focus work.

### 2. Suggested Actions
I've prepared 6 automated adjustments. You can apply them individually or all at once:`,
        timestamp: Date.now() - 250000,
        actions: [
          {
            type: "UPDATE_TASK",
            taskId: "task-ideas-3",
            taskTitle: "[Q3] Follow up on design system component tokens",
            newTitle: "[Q2] Document design token specs for dark/light theme components",
          },
          {
            type: "SET_QUADRANT",
            taskId: "task-habits-2",
            taskTitle: "Afternoon team standup & sync",
            quadrant: "Q3",
          },
          {
            type: "CREATE_SUBTASK",
            parentTaskId: "task-launch-3",
            parentTaskTitle: "Design Marketing Showcase Assets",
            title: "Export high-res 2x Retina PNGs for GitHub and LinkedIn",
          },
          {
            type: "CREATE_TASK",
            title: "[Q1] Verify APK installation on physical Android test device",
            due: tomorrow.slice(0, 10),
            quadrant: "Q1",
            listName: "🎯 Product Launch",
            listId: "list-launch",
          },
          {
            type: "UPDATE_TASK",
            taskId: "task-core-2",
            taskTitle: "[Q2] Optimize Startup Bundle Size & Tree-Shaking",
            notes: "Analyze vite rollup chunks and inspect dependencies with source-map-explorer.",
          },
          {
            type: "CREATE_TASK",
            title: "[Q2] Draft announcement thread for LinkedIn and Twitter/X",
            due: in2Days.slice(0, 10),
            quadrant: "Q2",
            listName: "🎯 Product Launch",
            listId: "list-launch",
          },
        ],
      },
    ],
  },
];

// Trashed items
const sampleTrashItems = [
  {
    id: "trash-1",
    task: {
      id: "old-task-1",
      listId: "list-launch",
      title: "Draft deprecated migration scripts for legacy v1 client",
      notes: "Obsolete since Tauri v2 migration was verified.",
      status: "needsAction",
      updated: today,
    },
    originalListId: "list-launch",
    originalListTitle: "🎯 Product Launch",
    deletedAt: today,
    expiresAt: in5Days,
  },
  {
    id: "trash-2",
    task: {
      id: "old-task-2",
      listId: "list-core",
      title: "Clean up deprecated electron configuration files",
      status: "completed",
      updated: today,
    },
    originalListId: "list-core",
    originalListTitle: "💡 Core Architecture",
    deletedAt: today,
    expiresAt: in4Days,
  },
];

async function main() {
  const screenshotsDir = path.resolve('docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log("1. Starting Vite dev server...");
  const server = await createServer({
    server: { port: 5175 },
  });
  await server.listen();
  console.log("Vite dev server running on http://localhost:5175");

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  console.log("2. Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  // Helper to setup page with data
  async function setupPage(viewport, isArabic = false) {
    const page = await browser.newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle0' });

    await page.evaluate((tasks, history, aiSessions, trash, isAr) => {
      localStorage.setItem("is_guest_mode", "true");
      localStorage.setItem("google_tasks_app_language", isAr ? "ar" : "en");
      localStorage.setItem("google_tasks_offline_snapshot_guest", JSON.stringify(tasks));
      localStorage.setItem("google_tasks_completed_history_guest", JSON.stringify(history));
      localStorage.setItem("google_tasks_ai_chat_sessions_v1", JSON.stringify(aiSessions));
      localStorage.setItem("google_tasks_ai_chat_active_session_id_v1", aiSessions[0].id);
      localStorage.setItem("google_tasks_trash_items_guest", JSON.stringify(trash));
      localStorage.setItem("google_tasks_trash_settings_guest", JSON.stringify({ retention: "7d" }));
      localStorage.setItem("google_tasks_ai_settings", JSON.stringify({
        provider: "gemini",
        apiKey: "sk-showcase-gemini-key",
        model: "gemini-3.8-flash",
        temperature: 0.7,
        enableThinking: true,
      }));
      if (isAr) {
        document.documentElement.dir = "rtl";
        document.documentElement.lang = "ar";
      } else {
        document.documentElement.dir = "ltr";
        document.documentElement.lang = "en";
      }
    }, isArabic ? arabicTaskLists : sampleTaskLists, sampleHistory, sampleAIChatSessions, sampleTrashItems, isArabic);

    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));
    return page;
  }

  const desktopViewport = { width: 1440, height: 900 };
  const mobileViewport = { width: 390, height: 844, isMobile: true, hasTouch: true };

  console.log("3. Capturing 01-board-view.png...");
  let page = await setupPage(desktopViewport);
  await page.screenshot({ path: path.join(screenshotsDir, '01-board-view.png') });

  console.log("4. Capturing 02-list-view.png...");
  await page.keyboard.press('2');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, '02-list-view.png') });

  console.log("5. Capturing 03-calendar-view.png...");
  await page.keyboard.press('3');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, '03-calendar-view.png') });

  console.log("6. Capturing 04-eisenhower-matrix.png...");
  await page.keyboard.press('4');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, '04-eisenhower-matrix.png') });

  console.log("7. Capturing 05-analytics-view.png...");
  // Navigate to Analytics in sidebar
  await page.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const analyticsBtn = listItems.find(el => el.textContent && el.textContent.includes('Analytics'));
    if (analyticsBtn) analyticsBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotsDir, '05-analytics-view.png') });

  console.log("8. Capturing 06-ai-copilot-chat.png...");
  // Return to Board view
  await page.keyboard.press('1');
  await new Promise(r => setTimeout(r, 400));
  // Open AI Copilot using keyboard shortcut
  await page.keyboard.down('Meta');
  await page.keyboard.press('k');
  await page.keyboard.up('Meta');
  await new Promise(r => setTimeout(r, 1000));
  // Ensure scrolled to top to show user query and introductory analysis
  await page.evaluate(() => {
    const dialogContent = document.querySelector('.MuiDialogContent-root');
    if (dialogContent) dialogContent.scrollTop = 0;
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(screenshotsDir, '06-ai-copilot-chat.png') });

  console.log("9. Capturing 07-ai-copilot-actions.png...");
  // Scroll AI modal down to see suggested action chips
  await page.evaluate(() => {
    const dialogContent = document.querySelector('.MuiDialogContent-root');
    if (dialogContent) dialogContent.scrollTop = dialogContent.scrollHeight;
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, '07-ai-copilot-actions.png') });
  await page.close();

  console.log("10. Capturing 08-arabic-rtl-view.png...");
  page = await setupPage(desktopViewport, true);
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(screenshotsDir, '08-arabic-rtl-view.png') });
  await page.close();

  console.log("11. Capturing 09-mobile-board-view.png...");
  page = await setupPage(mobileViewport, false);
  await page.screenshot({ path: path.join(screenshotsDir, '09-mobile-board-view.png') });

  console.log("12. Capturing 10-mobile-eisenhower.png...");
  // Click Eisenhower in mobile bottom nav
  await page.evaluate(() => {
    const bottomNavActions = Array.from(document.querySelectorAll('.MuiBottomNavigationAction-root'));
    if (bottomNavActions.length >= 4) {
      bottomNavActions[3].click();
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotsDir, '10-mobile-eisenhower.png') });

  console.log("13. Capturing 11-mobile-calendar.png...");
  // Click Calendar in mobile bottom nav
  await page.evaluate(() => {
    const bottomNavActions = Array.from(document.querySelectorAll('.MuiBottomNavigationAction-root'));
    if (bottomNavActions.length >= 3) {
      bottomNavActions[2].click();
    }
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotsDir, '11-mobile-calendar.png') });
  await page.close();

  console.log("14. Capturing 12-trash-view.png...");
  page = await setupPage(desktopViewport, false);
  await page.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.MuiListItemButton-root'));
    const trashBtn = listItems.find(el => el.textContent && el.textContent.includes('Trash'));
    if (trashBtn) trashBtn.click();
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(screenshotsDir, '12-trash-view.png') });

  console.log("15. Capturing 13-account-switcher.png...");
  await page.keyboard.press('1');
  await new Promise(r => setTimeout(r, 600));
  // Click user profile avatar button in header to open account switcher
  await page.evaluate(() => {
    const avatar = document.querySelector('.MuiAvatar-root');
    if (avatar && avatar.parentElement) {
      avatar.parentElement.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(screenshotsDir, '13-account-switcher.png') });
  await page.close();

  await browser.close();
  await server.close();
  console.log("✅ All screenshots successfully generated in docs/screenshots/!");
}

main().catch(err => {
  console.error("Screenshot generator failed:", err);
  process.exit(1);
});
