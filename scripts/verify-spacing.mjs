import puppeteer from 'puppeteer-core'

const URL = 'http://localhost:4173/'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const WIDTHS = [375, 768, 1440, 1920]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

let failures = 0

for (const width of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900 })
  await page.goto(URL, { waitUntil: 'networkidle0' })
  // Scroll through the page so lazy content/reveals settle at true positions.
  await page.evaluate(async () => {
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 60))
    }
    window.scrollTo(0, 0)
  })
  await new Promise((r) => setTimeout(r, 800))

  const gaps = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('main > section')]
    const bounds = sections.map((sec) => {
      let top = Infinity
      let bottom = -Infinity
      for (const el of sec.querySelectorAll('p, h1, h2, h3, li, figure, a.btn-outline, div.hairline, video')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) continue
        const style = getComputedStyle(el)
        if (style.visibility === 'hidden' || style.display === 'none') continue
        if (el.closest('.sr-only')) continue
        // Ignore elements inside hidden (lg:hidden / hidden lg:block) branches.
        if (el.offsetParent === null && style.position !== 'fixed') continue
        top = Math.min(top, r.top + window.scrollY)
        bottom = Math.max(bottom, r.bottom + window.scrollY)
      }
      return { id: sec.id, top: Math.round(top), bottom: Math.round(bottom) }
    })

    const out = []
    for (let i = 0; i < bounds.length - 1; i++) {
      const a = bounds[i]
      const b = bounds[i + 1]
      out.push({
        pair: `${a.id} → ${b.id}`,
        gap: Math.round(b.top - a.bottom),
      })
    }
    return { out, docHeight: document.documentElement.scrollHeight }
  })

  console.log(`\n=== ${width}px — doc height ${gaps.docHeight}px ===`)
  for (const g of gaps.out) {
    // Intent: consistent editorial rhythm. Same-color gaps must not exceed
    // ~2 section paddings (≤ 240px desktop / ≤ 140px mobile) or fall under 40px.
    const limit = width >= 1024 ? 240 : 140
    const bad = g.gap > limit || g.gap < 40
    if (bad) failures++
    console.log(`  ${g.pair}: ${g.gap}px ${bad ? '✗ OUT OF RANGE' : '✓'}`)
  }
  await page.close()
}

await browser.close()
console.log(failures === 0 ? '\nSPACING OK' : `\n${failures} SPACING ISSUES`)
process.exit(failures === 0 ? 0 : 1)
