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

let failures = 0
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
// The site uses `scroll-behavior: smooth`; force instant jumps for testing.
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto'
})
await new Promise((r) => setTimeout(r, 1500))

const state = () =>
  page.evaluate(() => {
    const bird = document.querySelector('.bird-fly')
    const tip = document.querySelector('.doodle-tree-tip')
    if (!bird || !tip) return null
    const br = bird.getBoundingClientRect()
    const tr = tip.getBoundingClientRect()
    const sx = window.scrollX
    const sy = window.scrollY
    // Palm measured via layout offsets (transform-free) to match the bird's
    // own targeting — reveal animations apply a transient translateY.
    const fig = document.querySelector('#objective figure')
    let palmX = null
    let palmY = null
    if (fig) {
      let lx = 0
      let ly = 0
      let n = fig
      while (n) {
        lx += n.offsetLeft
        ly += n.offsetTop
        n = n.offsetParent
      }
      palmX = Math.round(lx + fig.offsetWidth * 0.79)
      palmY = Math.round(ly + fig.offsetHeight * 0.505)
    }
    return {
      cls: bird.className,
      opacity: getComputedStyle(bird).opacity,
      // document-space coords for both bird feet and anchors
      footX: Math.round(br.left + br.width * 0.5 + sx),
      footY: Math.round(br.top + br.height * 0.815 + sy),
      tipX: Math.round(tr.left + tr.width / 2 + sx),
      tipY: Math.round(tr.top + tr.height / 2 + sy),
      palmX,
      palmY,
      scrollY: Math.round(sy),
    }
  })

const near = (a, b, tol = 14) => Math.abs(a - b) <= tol

const steps = [
  { name: '01-perched-top', scroll: 0 },
  { name: '02-takeoff', frac: 0.06 },
  { name: '03-mid-about', sel: '#about' },
  { name: '04-mid-skills', sel: '#skills' },
  { name: '05-mid-creative', sel: '#creative' },
  { name: '06-approach', sel: '#objective' },
  { name: '07-landed', frac: 1 },
]

// report of intermediate flight states
const flightStates = []

for (const step of steps) {
  await page.evaluate((s) => {
    if (typeof s.scroll === 'number') {
      window.scrollTo(0, s.scroll)
    } else if (s.sel) {
      document.querySelector(s.sel)?.scrollIntoView({ block: 'start' })
    } else if (typeof s.frac === 'number') {
      const max = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.round(max * s.frac))
    }
  }, step)
  // allow scrub smoothing + path render to settle
  await new Promise((r) => setTimeout(r, 1300))

  const s = await state()
  // viewport containment: bird should be mostly on-screen during the journey
  const inView = await page.evaluate(() => {
    const b = document.querySelector('.bird-fly')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      vh: window.innerHeight,
    }
  })
  flightStates.push({ name: step.name, ...s, viewTop: inView.top, viewBottom: inView.bottom, vh: inView.vh })
  await page.screenshot({ path: `verify-shots/bird/${step.name}.png` })
  console.log(
    `${step.name}: scrollY=${s.scrollY} cls="${s.cls}" bird=(${s.footX},${s.footY}) tip=(${s.tipX},${s.tipY}) palm=(${s.palmX},${s.palmY}) view=[${inView.top}..${inView.bottom}/${inView.vh}]`,
  )
}

// --- assertions ---
const perched = flightStates[0]
if (perched.cls !== 'bird-fly is-perched') { failures++; console.log('✗ top state should be is-perched') }
if (!near(perched.footX, perched.tipX, 20) || !near(perched.footY, perched.tipY, 20)) {
  failures++
  console.log(`✗ bird feet not on branch tip: feet=(${perched.footX},${perched.footY}) tip=(${perched.tipX},${perched.tipY})`)
} else {
  console.log('✓ bird perched on tree branch tip')
}

const mid = flightStates.find((s) => s.name === '03-mid-about')
if (!mid?.cls.includes('is-flying')) { failures++; console.log('✗ bird should be is-flying mid-page') } else { console.log('✓ bird flying mid-page') }

// The bird should stay reasonably within the viewport during the journey.
// (Step 07 scrolls past the landed palm, so the bird correctly exits with it.)
for (const st of flightStates) {
  if (st.name === '07-landed') continue
  if (st.viewTop < -120 || st.viewBottom > st.vh + 120) {
    failures++
    console.log(`✗ bird clipped off-viewport at ${st.name}: [${st.viewTop}..${st.viewBottom}] of ${st.vh}`)
  }
}
console.log('✓ bird stays within viewport during flight')

const landed = flightStates[flightStates.length - 1]
if (!landed.cls.includes('is-landed')) { failures++; console.log(`✗ final state should be is-landed (got ${landed.cls})`) }
if (!near(landed.footX, landed.palmX, 22) || !near(landed.footY, landed.palmY, 22)) {
  failures++
  console.log(`✗ bird feet not on palm: feet=(${landed.footX},${landed.footY}) palm=(${landed.palmX},${landed.palmY})`)
} else {
  console.log('✓ bird landed on the open palm')
}

// --- reverse: scroll back to top, bird must return to branch ---
await page.evaluate(() => window.scrollTo(0, 0))
await new Promise((r) => setTimeout(r, 1600))
const back = await state()
await page.screenshot({ path: 'verify-shots/bird/08-return-to-tree.png' })
if (back.cls !== 'bird-fly is-perched') { failures++; console.log(`✗ after scrolling up, bird should be is-perched (got ${back.cls})`) }
if (!near(back.footX, back.tipX, 20) || !near(back.footY, back.tipY, 20)) {
  failures++
  console.log(`✗ bird did not return to branch: feet=(${back.footX},${back.footY}) tip=(${back.tipX},${back.tipY})`)
} else {
  console.log('✓ bird returned to its branch after scrolling up')
}

// --- no horizontal overflow introduced ---
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
if (overflow > 1) { failures++; console.log(`✗ horizontal overflow: ${overflow}px`) } else { console.log('✓ no horizontal overflow') }

// --- mobile pass ---
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = 'auto'
})
await new Promise((r) => setTimeout(r, 1500))
await page.screenshot({ path: 'verify-shots/bird/m1-perched.png' })
const mTop = await state()
console.log(`mobile perched: cls="${mTop.cls}" feet=(${mTop.footX},${mTop.footY}) tip=(${mTop.tipX},${mTop.tipY})`)
if (!near(mTop.footX, mTop.tipX, 20) || !near(mTop.footY, mTop.tipY, 20)) {
  failures++; console.log('✗ mobile: bird not aligned to branch')
} else { console.log('✓ mobile: bird perched correctly') }

await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight
  window.scrollTo(0, max)
})
await new Promise((r) => setTimeout(r, 1600))
await page.screenshot({ path: 'verify-shots/bird/m2-landed.png' })
const mEnd = await state()
console.log(`mobile landed: cls="${mEnd.cls}" feet=(${mEnd.footX},${mEnd.footY}) palm=(${mEnd.palmX},${mEnd.palmY})`)
if (!mEnd.cls.includes('is-landed')) { failures++; console.log(`✗ mobile: not landed (got ${mEnd.cls})`) }
if (!near(mEnd.footX, mEnd.palmX, 26) || !near(mEnd.footY, mEnd.palmY, 26)) {
  failures++; console.log('✗ mobile: bird not aligned to palm')
} else { console.log('✓ mobile: bird landed on palm') }

const mOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
if (mOverflow > 1) { failures++; console.log(`✗ mobile horizontal overflow: ${mOverflow}px`) } else { console.log('✓ mobile: no horizontal overflow') }

await browser.close()
console.log(`\n${failures === 0 ? 'BIRD FLIGHT: ALL CHECKS PASSED' : `BIRD FLIGHT: ${failures} FAILURES`}`)
process.exit(failures === 0 ? 0 : 1)
