import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Dynamic dates for tasks
function getDateOffset(dayOffset, hours = 9, minutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const today = getDateOffset(0);
const tomorrow = getDateOffset(1);
const in2Days = getDateOffset(2);

const sampleTaskLists = [
  {
    kind: "tasks#taskList",
    id: "list-launch",
    title: "🎯 Product Launch",
    updated: today,
    isVisible: true,
    incompleteCount: 4,
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
    ],
  },
  {
    kind: "tasks#taskList",
    id: "list-core",
    title: "💡 Core Architecture",
    updated: today,
    isVisible: true,
    incompleteCount: 3,
    tasks: [
      {
        id: "task-core-1",
        listId: "list-core",
        title: "[Q2] Benchmark SQLite Local Storage vs Caching",
        notes: "Measure cold startup latency and memory overhead on 10,000+ cached tasks.",
        status: "needsAction",
        due: in2Days,
        exactTime: "10:30",
        isStarred: true,
        updated: in2Days,
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
    ],
  },
];

const sampleAiSettings = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  apiKey: "AIzaSyD-DEMO-SIMULATED-KEY-FOR-PROMO",
  apiKeys: ["AIzaSyD-DEMO-SIMULATED-KEY-FOR-PROMO"],
  temperature: 0.7,
  enableThinking: false,
  backupEnabled: false,
  providers: {
    gemini: {
      provider: "gemini",
      model: "gemini-2.5-flash",
      apiKey: "AIzaSyD-DEMO-SIMULATED-KEY-FOR-PROMO",
      apiKeys: ["AIzaSyD-DEMO-SIMULATED-KEY-FOR-PROMO"],
    },
  },
};

const simulatedAiResponse = `### 🚀 Strategic Analysis & Priority Recommendations

I analyzed your active tasks across **🎯 Product Launch** and **💡 Core Architecture**. Here is your optimal plan:

1. **Verify v2.1 Release First:** Complete Android APK and macOS release testing before opening OAuth review.
2. **Handle API Security Gate:** Ensure privacy documentation is ready for Google Cloud verification.
3. **Automate Quality Audits:** Run end-to-end regression tests on offline caching and sync queue.

I prepared **2 high-impact actions** to apply directly to your board:

\`\`\`actions
[
  {
    "type": "CREATE_TASK",
    "listId": "list-launch",
    "title": "[Q1] Run Automated Release Validation & Smoke Tests",
    "notes": "Verify offline sync queue, APK signatures, and dark/light mode switching.",
    "quadrant": "Q1"
  },
  {
    "type": "SET_QUADRANT",
    "taskId": "task-launch-2",
    "quadrant": "Q1",
    "reason": "OAuth verification blocks production publication"
  }
]
\`\`\``;

async function recordAiDemo() {
  console.log("1. Starting Vite dev server on port 5178...");
  const server = await createServer({
    server: { port: 5178 },
  });
  await server.listen();

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`);
  }

  console.log("2. Launching Chrome...");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,720',
      '--disable-notifications',
      '--mute-audio',
    ],
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    },
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Mocking') || msg.text().includes('ai')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  // Mock fetch at browser level to avoid CORS "failed to fetch"
  await page.evaluateOnNewDocument((aiText) => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = String(args[0] || "");
      if (url.includes('generateContent') || url.includes('generativelanguage.googleapis.com')) {
        console.log("Mocking generateContent response via evaluateOnNewDocument fetch");
        await new Promise(r => setTimeout(r, 700));
        return new Response(JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: aiText }],
              },
            },
          ],
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
      return originalFetch.apply(this, args);
    };
  }, simulatedAiResponse);

  // Intercept network requests for AI responses with full CORS headers as backup
  await page.setRequestInterception(true);
  page.on('request', async (req) => {
    const url = req.url();
    if (url.includes('generateContent') || url.includes('generativelanguage.googleapis.com')) {
      console.log("-> Intercepted Gemini generateContent request:", req.method(), url);
      if (req.method() === 'OPTIONS') {
        await req.respond({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, OPTIONS',
            'access-control-allow-headers': '*',
          },
        });
        return;
      }
      await new Promise(r => setTimeout(r, 700));
      await req.respond({
        status: 200,
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
        },
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: simulatedAiResponse }],
              },
            },
          ],
        }),
      });
    } else {
      req.continue();
    }
  });

  await page.goto('http://localhost:5178', { waitUntil: 'domcontentloaded' });

  // Prepare LocalStorage
  await page.evaluate((tasks, aiSettings) => {
    localStorage.clear();
    localStorage.setItem("is_guest_mode", "true");
    localStorage.setItem("google_tasks_guest_user", JSON.stringify({
      id: "guest-user",
      name: "Demo Account",
      email: "alex.chen@workspace.dev",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
    }));
    localStorage.setItem("google_tasks_offline_snapshot_guest", JSON.stringify(tasks));
    localStorage.setItem("google_tasks_ai_settings", JSON.stringify(aiSettings));
    localStorage.setItem("google_tasks_chat_sessions_guest", JSON.stringify([]));
    localStorage.setItem("google_tasks_app_language", "en");
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, sampleTaskLists, sampleAiSettings);

  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));

  // Inject professional cursor
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

  const mp4Path = path.resolve('docs/ai-demo.mp4');
  const gifPath = path.resolve('docs/ai-demo.gif');

  console.log("3. Spawning FFmpeg process with steady 24fps stream...");
  const fps = 24;
  const ffmpeg = spawn('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', String(fps),
    '-i', '-',
    '-c:v', 'libx264',
    '-preset', 'faster',
    '-crf', '19',
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

  console.log("4. Scene 1: Starting at Board View, moving cursor to AI Copilot in Sidebar...");
  await new Promise(r => setTimeout(r, 1200));

  // Find AI Copilot button in sidebar
  const aiButtonBox = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.MuiListItemButton-root, button'));
    const btn = items.find(el => el.textContent && el.textContent.includes('AI Copilot'));
    if (btn) {
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  if (aiButtonBox) {
    await page.mouse.move(aiButtonBox.x, aiButtonBox.y, { steps: 18 });
  } else {
    await page.mouse.move(100, 480, { steps: 18 });
  }
  await new Promise(r => setTimeout(r, 600));

  console.log("5. Scene 2: Clicking AI Copilot button...");
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 80));
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 1800));

  console.log("6. Scene 3: Moving cursor to input box and typing prompt...");
  const inputBox = await page.evaluate(() => {
    const textarea = document.querySelector('.MuiDialogActions-root textarea');
    if (textarea) {
      const rect = textarea.getBoundingClientRect();
      return { x: rect.left + 50, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  if (inputBox) {
    await page.mouse.move(inputBox.x, inputBox.y, { steps: 16 });
    await page.mouse.click(inputBox.x, inputBox.y);
  } else {
    await page.mouse.move(500, 670, { steps: 16 });
    await page.mouse.click(500, 670);
  }
  await new Promise(r => setTimeout(r, 400));

  const promptText = "Prioritize my product launch tasks and suggest immediate action items";
  await page.keyboard.type(promptText, { delay: 35 });
  await new Promise(r => setTimeout(r, 800));

  console.log("7. Scene 4: Clicking Send button...");
  const sendBox = await page.evaluate(() => {
    const sendBtn = document.querySelector('.MuiDialogActions-root button:not([disabled])');
    if (sendBtn) {
      const rect = sendBtn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  if (sendBox) {
    await page.mouse.move(sendBox.x, sendBox.y, { steps: 12 });
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 80));
    await page.mouse.up();
  } else {
    await page.keyboard.press('Enter');
  }

  console.log("8. Scene 5: AI thinking and rendering response...");
  await new Promise(r => setTimeout(r, 2200));

  // Scroll down smoothly inside dialog content to reveal full response and suggested actions
  await page.evaluate(() => {
    const dialogContent = document.querySelector('.MuiDialogContent-root');
    if (dialogContent) {
      dialogContent.scrollTo({ top: dialogContent.scrollHeight, behavior: 'smooth' });
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log("9. Scene 6: Moving cursor to 'Apply Selected' button and clicking it...");
  const applyBtnBox = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('.MuiDialogContent-root button'));
    const btn = buttons.find(b => b.textContent && b.textContent.includes('Apply Selected'));
    if (btn) {
      const rect = btn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  if (applyBtnBox) {
    await page.mouse.move(applyBtnBox.x, applyBtnBox.y, { steps: 16 });
    await new Promise(r => setTimeout(r, 400));
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 80));
    await page.mouse.up();
  }
  await new Promise(r => setTimeout(r, 1800));

  console.log("10. Scene 7: Moving to close button and returning to Board View...");
  const closeBtnBox = await page.evaluate(() => {
    const closeBtn = document.querySelector('.MuiDialogTitle-root button');
    if (closeBtn) {
      const rect = closeBtn.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }
    return null;
  });

  if (closeBtnBox) {
    await page.mouse.move(closeBtnBox.x, closeBtnBox.y, { steps: 14 });
    await page.mouse.click(closeBtnBox.x, closeBtnBox.y);
  } else {
    await page.keyboard.press('Escape');
  }

  // Display the board with the newly created task
  await page.mouse.move(600, 300, { steps: 14 });
  await new Promise(r => setTimeout(r, 2200));

  console.log("11. Finalizing video encoding...");
  isRecording = false;
  clearInterval(timer);
  await client.send('Page.stopScreencast');
  ffmpeg.stdin.end();

  await new Promise((resolve) => ffmpeg.on('close', resolve));
  await browser.close();
  await server.close();

  console.log(`✅ AI Demo MP4 recorded successfully (${framesWritten} frames at 24fps = ${(framesWritten / fps).toFixed(1)}s) at ${mp4Path}`);

  console.log("12. Generating optimized GIF from MP4...");
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

  console.log(`✅ Animated AI GIF generated successfully at ${gifPath}`);
}

recordAiDemo().catch(err => {
  console.error("AI Demo recording failed:", err);
  process.exit(1);
});
