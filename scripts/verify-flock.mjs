import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:5173/'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

mkdirSync('verify-shots/bird', { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto'
})
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
await sleep(1600)

let failures = 0
const log = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failures++
}

/* =================================================================== *
 * SYSTEM A — background flock near the tree
 * =================================================================== */
console.log('\n--- Background flock (System A) ---')

const flock = await page.evaluate(() => {
  const root = document.querySelector('.bird-flock')
  const birds = [...document.querySelectorAll('.flock-bird')]
  const tip = document.querySelector('.doodle-tree-tip')
  const treeSvg = tip ? tip.closest('svg') : null
  const tr = treeSvg ? treeSvg.getBoundingClientRect() : null
  return {
    exists: !!root,
    count: birds.length,
    paused: root ? root.classList.contains('is-paused') : null,
    tree: tr ? { left: tr.left, top: tr.top, right: tr.right, bottom: tr.bottom } : null,
    birds: birds.map((b) => {
      const cs = getComputedStyle(b)
      const wing = b.querySelector('.flock-wing')
      const wcs = wing ? getComputedStyle(wing) : null
      const r = b.getBoundingClientRect()
      return {
        anim: cs.animationName,
        state: cs.animationPlayState,
        dur: cs.animationDuration,
        wingAnim: wcs ? wcs.animationName : null,
        wingDur: wcs ? wcs.animationDuration : null,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        w: r.width,
      }
    }),
  }
})

log(flock.exists, 'flock container exists')
log(flock.count >= 3 && flock.count <= 4, `has ~3–4 background birds (got ${flock.count})`)
log(!flock.paused, 'flock active while hero is in view')

// each bird animating independently with distinct timing
const animNames = flock.birds.map((b) => b.anim)
log(animNames.every((a) => a && a !== 'none'), `all birds have a flight animation (${animNames.join(', ')})`)
const durs = new Set(flock.birds.map((b) => b.dur))
log(durs.size >= 2, `birds use different flight timings (${[...durs].join(', ')})`)
const wingDurs = new Set(flock.birds.map((b) => b.wingDur))
log(wingDurs.size >= 2, `birds flap at different rates (${[...wingDurs].join(', ')})`)

// birds stay compactly around the tree
if (flock.tree) {
  const t = flock.tree
  const treeCx = (t.left + t.right) / 2
  const treeCy = (t.top + t.bottom) / 2
  let allNear = true
  for (const b of flock.birds) {
    const dist = Math.hypot(b.cx - treeCx, b.cy - treeCy)
    if (dist > 220) allNear = false
  }
  log(allNear, 'all background birds stay near the tree')
}

// birds actually move (transform changes over time) — independent of scroll
const before = await page.evaluate(() =>
  [...document.querySelectorAll('.flock-bird')].map((b) => getComputedStyle(b).transform),
)
await sleep(700)
const after = await page.evaluate(() =>
  [...document.querySelectorAll('.flock-bird')].map((b) => getComputedStyle(b).transform),
)
const moved = before.filter((t, i) => t !== after[i]).length
log(moved >= 2, `background birds are moving (${moved}/3 changed position while page idle)`)

// pause when the tree scrolls out of view
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
await sleep(700)
const pausedAway = await page.evaluate(() => {
  const root = document.querySelector('.bird-flock')
  const bird = document.querySelector('.flock-bird')
  return {
    hasClass: root ? root.classList.contains('is-paused') : false,
    playState: bird ? getComputedStyle(bird).animationPlayState : null,
  }
})
log(pausedAway.hasClass || pausedAway.playState === 'paused', 'flock pauses when scrolled out of view')
await page.screenshot({ path: 'verify-shots/bird/f1-flock-paused.png' })

// resume when back in view
await page.evaluate(() => window.scrollTo(0, 0))
await sleep(900)
const resumed = await page.evaluate(() => {
  const root = document.querySelector('.bird-flock')
  return root ? !root.classList.contains('is-paused') : false
})
log(resumed, 'flock resumes when tree returns to view')
await page.screenshot({ path: 'verify-shots/bird/f2-flock-resumed.png' })

/* =================================================================== *
 * SYSTEM B — main bird: facing, safe padding, no lag
 * =================================================================== */
console.log('\n--- Main bird: direction, safe padding, smoothness (System B) ---')

// settle first
await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.35)))
await sleep(1500)

async function capture(dir, steps, stepPx) {
  const out = []
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), dir * stepPx)
    await sleep(80)
    const s = await page.evaluate(() => {
      const b = document.querySelector('.bird-fly')
      const m = new DOMMatrix(getComputedStyle(b).transform)
      const r = b.getBoundingClientRect()
      return {
        x: r.left + r.width / 2,
        left: r.left,
        right: r.right,
        facing: m.a > 0 ? 1 : -1,
        cls: b.className,
        vw: window.innerWidth,
      }
    })
    out.push(s)
  }
  return out
}

function checkDirection(samples, label) {
  let checked = 0
  let correct = 0
  for (let i = 1; i < samples.length; i++) {
    const dx = samples[i].x - samples[i - 1].x
    if (Math.abs(dx) < 1.5) continue
    checked++
    if ((dx > 0 ? 1 : -1) === samples[i].facing) correct++
  }
  if (checked === 0) {
    log(false, `${label}: no clear horizontal movement to validate`)
    return
  }
  const ratio = correct / checked
  log(ratio >= 0.9, `${label}: bird faces its travel direction (${correct}/${checked} = ${Math.round(ratio * 100)}%)`)
}

function checkSafePad(samples, label) {
  let bad = 0
  for (const s of samples) {
    if (s.cls.includes('is-perched') || s.cls.includes('is-landed')) continue
    const padL = s.vw * 0.08
    const padR = s.vw * 0.92
    if (s.left < padL - 6 || s.right > padR + 6) bad++
  }
  log(bad === 0, `${label}: bird stays within the 8% horizontal safe padding (${bad} violations)`)
}

const down = await capture(1, 26, 38)
checkDirection(down, 'scrolling down')
checkSafePad(down, 'scrolling down')
await page.screenshot({ path: 'verify-shots/bird/f3-flying-down.png' })

const up = await capture(-1, 26, 38)
checkDirection(up, 'scrolling up')
checkSafePad(up, 'scrolling up')
await page.screenshot({ path: 'verify-shots/bird/f4-flying-up.png' })

// Smoothness: no single frame should teleport the bird an extreme distance
// (catches jumps during fast scrolling).
const jumps = await page.evaluate(async () => {
  const b = document.querySelector('.bird-fly')
  const positions = []
  let last = null
  let bigJumps = 0
  // drive a fast scroll and sample every animation frame
  const max = document.documentElement.scrollHeight - window.innerHeight
  const start = window.scrollY
  for (let i = 0; i < 40; i++) {
    window.scrollTo(0, start + ((max - start) * i) / 40)
    await new Promise((r) => requestAnimationFrame(r))
    const r = b.getBoundingClientRect()
    const cx = r.left + r.width / 2
    if (last !== null && Math.abs(cx - last) > 90) bigJumps++
    last = cx
    positions.push(Math.round(cx))
  }
  return { bigJumps, positions }
})
log(jumps.bigJumps === 0, `no sudden horizontal jumps during fast scrolling (${jumps.bigJumps} found)`)

/* --- reverse flight ends back on the branch --- */
await page.evaluate(() => window.scrollTo(0, 0))
await sleep(1600)
const back = await page.evaluate(() => {
  const b = document.querySelector('.bird-fly')
  const tip = document.querySelector('.doodle-tree-tip')
  const br = b.getBoundingClientRect()
  const tr = tip.getBoundingClientRect()
  const sx = window.scrollX
  const sy = window.scrollY
  return {
    cls: b.className,
    footX: br.left + br.width * 0.5 + sx,
    footY: br.top + br.height * 0.815 + sy,
    tipX: tr.left + tr.width / 2 + sx,
    tipY: tr.top + tr.height / 2 + sy,
  }
})
log(back.cls === 'bird-fly is-perched', `returns to perched state (got ${back.cls})`)
log(
  Math.abs(back.footX - back.tipX) < 20 && Math.abs(back.footY - back.tipY) < 20,
  'lands back on the original branch when scrolling up',
)

await browser.close()
console.log(`\n${failures === 0 ? 'FLOCK + FACING + SMOOTHNESS: ALL CHECKS PASSED' : `${failures} FAILURES`}`)
process.exit(failures === 0 ? 0 : 1)
