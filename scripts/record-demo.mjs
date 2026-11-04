import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Dynamic dates
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
        notes: "Ensure limited-use disclosure and privacy policy match Google Cloud guidelines.",
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
      },
      {
        id: "task-launch-4",
        listId: "list-launch",
        title: "[Q2] Finalize Onboarding & Keyboard Cheatsheet",
        status: "needsAction",
        due: in2Days,
        exactTime: "16:00",
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
];

// Arabic lists
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
    ],
  },
];

// History items
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
      id: `hist-${i}-${j}`,
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
        content: "Review my current task lists and break down our launch goals into actionable subtasks.",
        timestamp: Date.now() - 300000,
      },
      {
        id: "msg-2",
        role: "assistant",
        content: `Here is an analysis and strategic breakdown of your upcoming sprint:

### 1. Priority Recommendations
* **Q1 Crises:** Verify production APK installation and OAuth consent parameters first.
* **Q2 Strategic:** High-resolution showcase assets and keyboard cheatsheet should precede the public launch.

### 2. Suggested Actions
I've prepared automated adjustments with 1-click execution chips below:`,
        timestamp: Date.now() - 250000,
        actions: [
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
        ],
      },
    ],
  },
];

async function record() {
  console.log("1. Starting Vite dev server...");
  const server = await createServer({
    server: { port: 5176 },
  });
  await server.listen();
  console.log("Vite running on http://localhost:5176");

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  // 1280x720 16:9 standard video viewport
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5176', { waitUntil: 'networkidle0' });

  // Inject initial state
  await page.evaluate((tasks, history, aiSessions) => {
    localStorage.setItem("is_guest_mode", "true");
    localStorage.setItem("google_tasks_app_language", "en");
    localStorage.setItem("google_tasks_offline_snapshot_guest", JSON.stringify(tasks));
    localStorage.setItem("google_tasks_completed_history_guest", JSON.stringify(history));
    localStorage.setItem("google_tasks_ai_chat_sessions_v1", JSON.stringify(aiSessions));
    localStorage.setItem("google_tasks_ai_chat_active_session_id_v1", aiSessions[0].id);
    localStorage.setItem("google_tasks_ai_settings", JSON.stringify({
      provider: "gemini",
      apiKey: "sk-showcase-gemini-key",
      model: "gemini-3.8-flash",
      temperature: 0.7,
      enableThinking: true,
    }));
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, sampleTaskLists, sampleHistory, sampleAIChatSessions);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  async function injectCursor() {
    await page.evaluate(() => {
      if (document.getElementById('demo-cursor')) return;
      const cursor = document.createElement('div');
      cursor.id = 'demo-cursor';
      cursor.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 24px;
        height: 24px;
        background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%231a73e8"><path d="M3 3l7 18 3-7 7-3L3 3z" stroke="white" stroke-width="1.8"/></svg>') no-repeat;
        pointer-events: none;
        z-index: 99999999;
        transform: translate(640px, 360px);
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        transition: transform 0.04s ease-out;
      `;
      document.body.appendChild(cursor);

      window.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      });
    });
  }

  await injectCursor();
  await page.mouse.move(640, 360);

  async function clickButtonWithText(textMatch) {
    const box = await page.evaluate((text) => {
      const items = Array.from(document.querySelectorAll('.MuiListItemButton-root, button, [role="button"]'));
      const target = items.find(el => el.textContent && el.textContent.includes(text));
      if (target) {
        const rect = target.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return null;
    }, textMatch);

    if (box) {
      await page.mouse.move(box.x, box.y, { steps: 16 });
      await new Promise(r => setTimeout(r, 100));
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 80));
      await page.mouse.up();
    }
  }

  const mp4Path = path.resolve('docs/demo.mp4');
  const gifPath = path.resolve('docs/demo.gif');

  console.log("2. Spawning FFmpeg process with steady 24fps stream...");
  const fps = 24;
  const ffmpeg = spawn('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'faster',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    mp4Path,
  ]);

  const client = await page.target().createCDPSession();
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    everyNthFrame: 1,
  });

  let latestFrameBuffer = null;
  let isRecording = true;
  let framesWritten = 0;

  client.on('Page.screencastFrame', async ({ data, sessionId }) => {
    latestFrameBuffer = Buffer.from(data, 'base64');
    try {
      await client.send('Page.screencastFrameAck', { sessionId });
    } catch {}
  });

  // Wait for initial frame
  while (!latestFrameBuffer) {
    await new Promise(r => setTimeout(r, 50));
  }

  // Steady clock pushes frames to ffmpeg at exact 24 fps
  const frameIntervalMs = 1000 / fps;
  const timer = setInterval(() => {
    if (isRecording && latestFrameBuffer) {
      ffmpeg.stdin.write(latestFrameBuffer);
      framesWritten++;
    }
  }, frameIntervalMs);

  console.log("3. Recording scene 1: Board View...");
  await page.mouse.move(500, 300, { steps: 15 });
  await new Promise(r => setTimeout(r, 1500));
  await page.mouse.move(750, 260, { steps: 12 });
  await new Promise(r => setTimeout(r, 1500));

  console.log("4. Recording scene 2: Eisenhower Matrix...");
  await clickButtonWithText('Eisenhower');
  await new Promise(r => setTimeout(r, 1000));
  await page.mouse.move(450, 280, { steps: 14 });
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.move(850, 480, { steps: 14 });
  await new Promise(r => setTimeout(r, 1200));

  console.log("5. Recording scene 3: Calendar View...");
  await clickButtonWithText('Calendar');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.move(600, 320, { steps: 14 });
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.move(720, 450, { steps: 12 });
  await new Promise(r => setTimeout(r, 1200));

  console.log("6. Recording scene 4: Analytics View...");
  await clickButtonWithText('Analytics');
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.move(400, 340, { steps: 14 });
  await new Promise(r => setTimeout(r, 1200));
  await page.mouse.move(800, 480, { steps: 14 });
  await new Promise(r => setTimeout(r, 1200));

  console.log("7. Recording scene 5: AI Copilot...");
  await clickButtonWithText('All Tasks');
  await new Promise(r => setTimeout(r, 600));
  await page.keyboard.down('Meta');
  await page.keyboard.press('k');
  await page.keyboard.up('Meta');
  await new Promise(r => setTimeout(r, 1800));

  // Smooth scroll down dialog content to show AI quick actions
  await page.evaluate(() => {
    const dialogContent = document.querySelector('.MuiDialogContent-root');
    if (dialogContent) dialogContent.scrollTo({ top: 320, behavior: 'smooth' });
  });
  await new Promise(r => setTimeout(r, 2200));

  // Close AI modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 800));

  console.log("8. Recording scene 6: Arabic RTL Mode...");
  await page.evaluate((arTasks) => {
    localStorage.setItem("google_tasks_app_language", "ar");
    localStorage.setItem("google_tasks_offline_snapshot_guest", JSON.stringify(arTasks));
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, arabicTaskLists);
  await page.reload({ waitUntil: 'networkidle0' });
  await injectCursor();
  await page.mouse.move(1100, 200, { steps: 12 });
  await new Promise(r => setTimeout(r, 1500));
  await page.mouse.move(800, 350, { steps: 15 });
  await new Promise(r => setTimeout(r, 1800));

  console.log("9. Recording scene 7: Account Switcher & Guest Mode...");
  const avatarBox = await page.evaluate(() => {
    const avatar = document.querySelector('.MuiAvatar-root');
    if (avatar && avatar.parentElement) {
      const rect = avatar.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });
  if (avatarBox) {
    await page.mouse.move(avatarBox.x, avatarBox.y, { steps: 14 });
    await new Promise(r => setTimeout(r, 100));
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 80));
    await page.mouse.up();
  }
  await new Promise(r => setTimeout(r, 2500));

  console.log("10. Finalizing video encoding...");
  isRecording = false;
  clearInterval(timer);
  await client.send('Page.stopScreencast');
  ffmpeg.stdin.end();

  await new Promise((resolve) => ffmpeg.on('close', resolve));
  await browser.close();
  await server.close();

  console.log(`✅ MP4 Video recorded successfully (${framesWritten} frames at 24fps = ${(framesWritten / fps).toFixed(1)}s) at ${mp4Path}`);

  console.log("11. Generating optimized GIF from MP4...");
  await new Promise((resolve, reject) => {
    const gifFfmpeg = spawn('/opt/homebrew/bin/ffmpeg', [
      '-y',
      '-i', mp4Path,
      '-vf', 'fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
      gifPath,
    ]);
    gifFfmpeg.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`GIF conversion failed with code ${code}`));
    });
  });

  console.log(`✅ Animated GIF generated successfully at ${gifPath}`);
}

record().catch(err => {
  console.error("Recording failed:", err);
  process.exit(1);
});
