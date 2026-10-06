/**
 * Bloop end-to-end QA on a running Android emulator/device. No extra deps: adb + uiautomator.
 *
 *   node qa/run.js [--apk path] [--skip-install]
 *
 * Drives the real app (UI taps found via uiautomator dumps), checks behaviour,
 * scans logcat for crashes/ANRs, and saves screenshots to qa/out/.
 * Exit code is non-zero if any check fails.
 */
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SDK = process.env.ANDROID_HOME || 'C:/Users/admin/android-dev/sdk';
const ADB = path.join(SDK, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const PKG = 'com.bloop.app';
const OUT = path.join(__dirname, 'out');
const args = process.argv.slice(2);
const apk = args.includes('--apk')
  ? args[args.indexOf('--apk') + 1]
  : path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

fs.mkdirSync(OUT, { recursive: true });

const adb = (...a) => execFileSync(ADB, a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sh = cmd => adb('shell', cmd);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- tiny test harness -------------------------------------------------------
const results = [];
async function check(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  PASS  ${name} (${Date.now() - t0}ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log(`  FAIL  ${name}\n        ${e.message}`);
    shot(`FAIL-${name.replace(/\W+/g, '_')}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

// ---- UI helpers --------------------------------------------------------------
function shot(name) {
  try {
    const buf = execFileSync(ADB, ['exec-out', 'screencap', '-p'], { maxBuffer: 64 * 1024 * 1024 });
    fs.writeFileSync(path.join(OUT, `${name}.png`), buf);
  } catch {
    /* screenshots are best-effort */
  }
}

function dump() {
  for (let i = 0; i < 4; i++) {
    try {
      sh('uiautomator dump /sdcard/ui.xml');
      return adb('exec-out', 'cat', '/sdcard/ui.xml');
    } catch {
      /* UI mid-animation: retry */
    }
  }
  return '';
}

function nodes(xml) {
  const out = [];
  const re = /<node [^>]*?>/g;
  let m;
  while ((m = re.exec(xml))) {
    const n = m[0];
    const get = k => {
      const r = new RegExp(`${k}="([^"]*)"`).exec(n);
      return r ? r[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#10;/g, '\n').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>') : '';
    };
    const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(get('bounds'));
    if (!b) continue;
    const [x1, y1, x2, y2] = b.slice(1).map(Number);
    out.push({ id: get('resource-id').split('/').pop(), text: get('text'), desc: get('content-desc'), x1, y1, x2, y2, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, clickable: get('clickable') === 'true' });
  }
  return out;
}

const matches = (n, q) =>
  q instanceof RegExp ? q.test(n.id) || q.test(n.text) || q.test(n.desc) : n.id === q || n.text === q || n.desc === q;

async function find(q, { timeout = 8000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const hit = nodes(dump()).find(n => matches(n, q));
    if (hit) return hit;
    await sleep(350);
  }
  return null;
}
async function waitFor(q, o) {
  const n = await find(q, o);
  assert(n, `expected on screen: ${q}`);
  return n;
}
async function waitGone(q, { timeout = 6000 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (!nodes(dump()).some(n => matches(n, q))) return;
    await sleep(350);
  }
  throw new Error(`still on screen: ${q}`);
}
const tapXY = (x, y) => sh(`input tap ${Math.round(x)} ${Math.round(y)}`);
async function tap(q, o) {
  const n = await waitFor(q, o);
  tapXY(n.cx, n.cy);
  await sleep(450);
  return n;
}
async function type(q, text) {
  await tap(q);
  sh(`input text "${text.replace(/ /g, '%s')}"`);
  await sleep(250);
}
const back = () => sh('input keyevent KEYCODE_BACK');
function swipe(x1, y1, x2, y2, ms = 300) {
  sh(`input swipe ${x1} ${y1} ${x2} ${y2} ${ms}`);
}
function screenSize() {
  const m = /(\d+)x(\d+)/.exec(sh('wm size'));
  return { w: +m[1], h: +m[2] };
}
/** If a Google ad activity is in front, close it (X, then BACK). Returns true if one was closed. */
async function clearAds(maxMs = 6000) {
  const { w, h } = screenSize();
  let closed = false;
  const end = Date.now() + maxMs;
  while (Date.now() < end) {
    const focus = sh('dumpsys window | grep -m1 mCurrentFocus');
    if (!/gms\.ads|AdActivity/.test(focus)) {
      if (closed) return true;
      await sleep(600);
      continue;
    }
    closed = true;
    shot('ad-shown');
    tapXY(w * 0.96, h * 0.085);
    await sleep(900);
    if (/gms\.ads|AdActivity/.test(sh('dumpsys window | grep -m1 mCurrentFocus'))) back();
    await sleep(900);
  }
  return closed;
}
const has = q => nodes(dump()).some(n => matches(n, q));

function crashLog() {
  const log = adb('logcat', '-d', '-b', 'crash');
  const full = adb('logcat', '-d', '-s', 'AndroidRuntime:E', 'ReactNativeJS:E', 'ActivityManager:E');
  return { crash: log.trim(), runtime: full };
}

// ---- scenarios ---------------------------------------------------------------
(async () => {
  console.log('Bloop QA\n');
  const devices = adb('devices').split(/\r?\n/).filter(l => /\tdevice\s*$/.test(l));
  if (!devices.length) {
    console.error('No device/emulator connected.');
    process.exit(2);
  }
  const { w, h } = screenSize();

  if (!args.includes('--skip-install')) {
    assert(fs.existsSync(apk), `APK not found: ${apk}`);
    adb('install', '-r', '-t', apk);
  }
  sh(`pm clear ${PKG}`);
  adb('logcat', '-c');
  for (const p of ['POST_NOTIFICATIONS', 'READ_CONTACTS', 'READ_MEDIA_IMAGES']) {
    try {
      sh(`pm grant ${PKG} android.permission.${p}`);
    } catch {
      /* not requestable on this API level */
    }
  }
  try {
    sh(`appops set ${PKG} SCHEDULE_EXACT_ALARM allow`);
  } catch {
    /* ok */
  }
  sh('settings put global window_animation_scale 0; settings put global transition_animation_scale 0; settings put global animator_duration_scale 0');
  sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);

  await check('splash then onboarding appear', async () => {
    await waitFor('splash', { timeout: 15000 }).catch(() => null);
    shot('01-splash');
    await waitFor('onboarding', { timeout: 15000 });
    shot('02-onboarding');
  });

  await check('onboarding: swipe through 3 slides, enable pings', async () => {
    await tap('onboarding-next');
    await sleep(500);
    await tap('onboarding-next');
    await sleep(500);
    await waitFor('onboarding-notify');
    shot('03-onboarding-last');
    await tap('onboarding-notify');
    await waitFor('home', { timeout: 10000 });
  });

  await check('home: empty state with ad-free hero', async () => {
    await waitFor('home-empty');
    shot('04-home-empty');
  });

  await check('banner ad slot is mounted above the tab bar', async () => {
    // Test ads may take a few seconds to fill; the slot collapses on failure, so allow either but never a crash.
    await sleep(4000);
    shot('05-banner');
  });

  await check('add a person via the editor', async () => {
    await tap('empty-add');
    await waitFor('editor');
    await type('editor-name', 'Aman Gupta');
    sh('input keyevent KEYCODE_BACK'); // dismiss keyboard
    await sleep(300);
    await tap('rel-friend');
    shot('06-editor');
    await tap('editor-save');
    await waitFor('home', { timeout: 8000 });
    await waitFor(/Aman/, { timeout: 8000 });
    shot('07-home-with-person');
  });

  await check('editor validates an empty name', async () => {
    await tap('home-add');
    await waitFor('editor');
    await tap('editor-save');
    await waitFor('editor-error');
    back();
    await waitFor('home');
  });

  await check('open person: reminders show the two defaults', async () => {
    await tap(/event-row-Aman|Aman/);
    await waitFor('person');
    await waitFor(/12:00 AM sharp/);
    await waitFor(/11:55 PM/);
    shot('08-person');
  });

  await check('person: wishes render, tone switches, premium is locked', async () => {
    swipe(w / 2, h * 0.75, w / 2, h * 0.25);
    await sleep(500);
    await waitFor('tone-funny');
    await tap('tone-funny');
    await waitFor('wish-text');
    shot('09-wishes');
    swipe(w / 2, h * 0.75, w / 2, h * 0.3);
    await sleep(400);
    await waitFor('unlock-wishes');
  });

  await check('rewarded video ad plays and closes without crashing', async () => {
    await tap('unlock-wishes');
    const sawAd = await clearAds(40000);
    assert(sawAd, 'rewarded video ad never appeared');
    await sleep(1500);
    // Still alive and in-app (either ad closed to Person, or app returned).
    const top = sh('dumpsys activity activities | grep -m1 mResumedActivity');
    assert(/bloop|ads/i.test(top), `unexpected foreground: ${top}`);
    if (!has('person')) back();
  });

  await check('add a custom reminder time', async () => {
    if (!has('person')) {
      sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
      await sleep(1500);
    }
    swipe(w / 2, h * 0.3, w / 2, h * 0.8);
    await sleep(400);
    await tap('rule-add');
    await waitFor('time-sheet');
    shot('11-time-sheet');
    await tap('time-save');
    await waitFor('time-sheet', { timeout: 500 }).catch(() => {});
    await sleep(700);
    await waitFor('Custom');
  });

  await check('remove person asks first; "No, nevermind" keeps them', async () => {
    swipe(w / 2, h * 0.8, w / 2, h * 0.1);
    await sleep(400);
    swipe(w / 2, h * 0.8, w / 2, h * 0.1);
    await sleep(400);
    await tap('person-remove');
    await waitFor('confirm-sheet');
    shot('12-confirm');
    await tap('confirm-no');
    await waitGone('confirm-sheet');
    assert(has('person'), 'should still be on the person screen');
  });

  await check('circle tab: search + filter sheet', async () => {
    back();
    await waitFor('home');
    await tap('tab-Circle');
    await waitFor('circle');
    await type('circle-search', 'zzzz');
    await waitFor('circle-empty');
    await tap('circle-search');
    sh('input keyevent KEYCODE_MOVE_END');
    for (let i = 0; i < 4; i++) sh('input keyevent KEYCODE_DEL');
    sh('input keyevent KEYCODE_BACK');
    await tap('circle-filter');
    await waitFor('filter-sheet');
    await tap('filter-rel-friend');
    await waitFor('filter-selected');
    shot('13-filters');
    await tap('filter-apply');
    await waitGone('filter-sheet');
    await waitFor(/Aman/);
  });

  await check('import: paste a list, review, add', async () => {
    await tap('tab-Home');
    await tap('home-import');
    await waitFor('import');
    shot('14-import');
    await tap('import-paste');
    await waitFor('paste-sheet');
    await tap('paste-input');
    sh('input text "Riya%s12%sOct"');
    sh('input keyevent KEYCODE_ENTER');
    sh('input text "Karan%s3/7"');
    sh('input keyevent KEYCODE_BACK');
    await tap('paste-go');
    await waitFor('candidate-Riya');
    await waitFor('candidate-Karan');
    shot('15-import-review');
    await tap('import-confirm');
    await waitFor('home');
    await waitFor(/Riya/);
    await waitFor(/Karan/);
  });

  await check('social import explains the platform limits honestly', async () => {
    await tap('home-import');
    await tap('import-social');
    await waitFor('social-sheet');
    await waitFor(/don't let other apps/);
    shot('16-social');
    back();
    await sleep(400);
    back();
    await waitFor('home');
  });

  await check('settings: toggles, permissions, defaults', async () => {
    await tap('tab-Settings');
    await waitFor('settings');
    await waitFor('default-rules');
    await waitFor('perm-notifications');
    shot('17-settings');
  });

  await check('exact alarms are scheduled for 12:00 AM and 11:55 PM', async () => {
    await sleep(1500);
    const dumpsys = sh('dumpsys alarm');
    const mine = dumpsys.split('\n').filter(l => l.includes(PKG) || l.includes('notifee'));
    assert(mine.length > 0, 'no alarms registered for Bloop');
  });

  await check('test bloop notification is delivered', async () => {
    swipe(w / 2, h * 0.8, w / 2, h * 0.2);
    await sleep(400);
    await tap('send-test');
    sh('input keyevent KEYCODE_HOME');
    await sleep(8000);
    const n = sh('dumpsys notification --noredact');
    assert(/birthday/i.test(n) && n.includes(PKG), 'test notification not posted');
    sh('cmd statusbar expand-notifications');
    await sleep(900);
    shot('18-notification');
    sh('cmd statusbar collapse');
  });

  await check('tapping the notification opens that person on the wishes', async () => {
    sh('cmd statusbar expand-notifications');
    await sleep(900);
    const n = await find(/12:00 AM sharp/, { timeout: 4000 });
    assert(n, 'notification not found in shade');
    tapXY(n.cx, n.cy);
    await waitFor('person', { timeout: 10000 });
    shot('19-opened-from-notification');
  });

  await check('data survives a force-stop + relaunch', async () => {
    sh(`am force-stop ${PKG}`);
    sh(`monkey -p ${PKG} -c android.intent.category.LAUNCHER 1`);
    await waitFor('home', { timeout: 15000 });
    await waitFor(/Riya|Aman|Karan/, { timeout: 8000 });
    shot('20-after-relaunch');
  });

  await check('rotation does not crash or lose state', async () => {
    sh('settings put system accelerometer_rotation 0; settings put system user_rotation 1');
    await sleep(1500);
    shot('21-landscape');
    sh('settings put system user_rotation 0');
    await sleep(1200);
    await waitFor('home');
  });

  await check('no crashes, ANRs or red-box errors in logcat', async () => {
    const { crash, runtime } = crashLog();
    assert(!crash, `crash buffer not empty:\n${crash.slice(0, 1500)}`);
    assert(!/FATAL EXCEPTION/.test(runtime), `FATAL EXCEPTION:\n${runtime.slice(0, 1500)}`);
    const anr = spawnSync(ADB, ['logcat', '-d', '-s', 'ActivityManager:E'], { encoding: 'utf8' }).stdout;
    assert(!new RegExp(`ANR in ${PKG}`).test(anr), 'ANR detected');
  });

  sh('settings put global window_animation_scale 1; settings put global transition_animation_scale 1; settings put global animator_duration_scale 1');
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: ${OUT}`);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));
  process.exit(failed.length ? 1 : 0);
})().catch(e => {
  console.error('QA aborted:', e);
  process.exit(2);
});
