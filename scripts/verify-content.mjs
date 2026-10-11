import puppeteer from 'puppeteer-core'

const URL = 'http://localhost:4173/'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
})

let failures = 0
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1000))

const report = await page.evaluate(() => {
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null
  const all = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent.trim())

  // Heading hierarchy
  const h1s = [...document.querySelectorAll('h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim())
  const h2s = [...document.querySelectorAll('h2')].map((h) => h.textContent.replace(/\s+/g, ' ').trim())

  // Anchor targets resolve
  const anchors = [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href'))
  const brokenAnchors = anchors.filter((href) => href !== '#' && !document.querySelector(href))

  // Placeholder labels (uppercase via CSS)
  const placeholderLabels = [...document.querySelectorAll('figure span')].map((s) =>
    getComputedStyle(s).textTransform === 'uppercase' ? s.textContent.toUpperCase() : s.textContent,
  )

  // Portrait containers: hero, about, creative — each must exist and carry a real
  // photo or a placeholder. No workspace container may remain.
  const portraits = {
    hero: document.querySelector('#home figure') !== null,
    about: document.querySelector('#about figure') !== null,
    // Creative now renders a <video> (rain-on-glass portrait) instead of a <figure>.
    creative: document.querySelector('#creative video') !== null || document.querySelector('#creative figure') !== null,
    objective: document.querySelector('#objective figure') !== null,
    workspace: [...document.querySelectorAll('figure span')].some((s) =>
      s.textContent.toUpperCase().includes('WORKSPACE'),
    ),
  }

  // Objective two-column layout: statement left, portrait right, text unchanged.
  const objStatement = document.querySelector('#objective .display-section')
  const objFigure = document.querySelector('#objective figure')
  const objText = objStatement?.textContent.replace(/\s+/g, ' ').trim() ?? ''
  const objectiveLayout = {
    hasPhoto: !!objFigure?.querySelector('img'),
    statementLeft: objStatement ? objStatement.getBoundingClientRect().left : -1,
    figureLeft: objFigure ? objFigure.getBoundingClientRect().left : -1,
    figureRatio: objFigure
      ? (objFigure.getBoundingClientRect().width / objFigure.getBoundingClientRect().height).toFixed(2)
      : null,
    hasItalics: document.querySelectorAll('#objective .display-section .italic').length,
    font: objStatement ? getComputedStyle(objStatement).fontFamily : null,
    textOk:
      objText.includes('grow as a software developer') &&
      objText.includes('reliable applications') &&
      objText.includes('meaningful software solutions') &&
      objText.includes('My objective is to grow as a software developer by building'),
  }
  const photosLoaded = {
    total: document.images.length,
    broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length,
  }

  // Section index labels
  const labels = all('section .label').map((l) => l.toUpperCase())

  // Footer
  const year = new Date().getFullYear()
  const footer = document.querySelector('footer')?.textContent ?? ''

  // Semantic landmarks — header/nav intentionally removed by request
  const landmarks = {
    header: document.querySelectorAll('header').length,
    nav: document.querySelectorAll('nav').length,
    main: !!document.querySelector('main'),
    footer: !!document.querySelector('footer'),
    skipLink: text('a[href="#main-content"]') !== null,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.content ?? null,
    lang: document.documentElement.lang,
  }

  // Generic overlap check across major blocks (text vs figures)
  const figures = [...document.querySelectorAll('figure')].map((f) => f.getBoundingClientRect())
  const headings = [...document.querySelectorAll('h1, h2, h3, p.label')].map((h) => h.getBoundingClientRect())
  let overlaps = 0
  for (const h of headings) {
    for (const f of figures) {
      const x = Math.max(0, Math.min(h.right, f.right) - Math.max(h.left, f.left))
      const y = Math.max(0, Math.min(h.bottom, f.bottom) - Math.max(h.top, f.top))
      if (x > 4 && y > 4) overlaps++
    }
  }

  // No bright colors / colorful accents in computed styles of key elements
  const colorful = []
  for (const el of document.querySelectorAll('h1, h2, h3, p, a, span, li')) {
    const c = getComputedStyle(el).color
    const m = c.match(/rgb\((\d+), (\d+), (\d+)\)/)
    if (!m) continue
    const [r, g, b] = [+m[1], +m[2], +m[3]]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max - min > 12) colorful.push(`${el.tagName}: ${c}`)
  }

  return {
    h1s,
    h2s,
    brokenAnchors,
    placeholderLabels,
    portraits,
    photosLoaded,
    objectiveLayout,
    labels,
    hasYear: footer.includes(String(year)),
    footerLeft: footer.includes('MOHAMMAD SAJID'),
    footerCenter: footer.includes('SOFTWARE DEVELOPER / AI-ML / AZURE DEVOPS'),
    landmarks,
    overlaps,
    colorful: colorful.slice(0, 5),
  }
})

console.log(JSON.stringify(report, null, 1))

const expect = (cond, msg) => {
  if (!cond) {
    failures++
    console.log('  ✗ ' + msg)
  }
}

expect(report.h1s.length === 1 && report.h1s[0].includes('Mohammad'), `h1 should be the name, got ${JSON.stringify(report.h1s)}`)
expect(report.h2s.includes('A little about me.'), 'About heading missing')
expect(report.h2s.some((h) => h.includes('What I do')), 'Expertise heading missing')
expect(report.h2s.some((h) => h.includes('Tools & technologies')), 'Skills heading missing')
expect(!report.h2s.some((h) => h.toLowerCase().includes('selected work')), 'Work section still present')
expect(report.h2s.some((h) => h.includes('Beyond the code')), 'Strengths heading missing')
expect(report.h2s.some((h) => h.includes("Let's")), 'Contact heading missing')
expect(report.h2s.some((h) => h.includes('Curiosity drives')), 'Creative heading missing')
expect(report.brokenAnchors.length === 0, `broken anchors: ${report.brokenAnchors.join(',')}`)

// Workspace box and project slots must be gone; the three portrait containers must stay.
expect(!report.portraits.workspace, 'Workspace container/placeholder still present')
expect(report.portraits.hero, 'Hero portrait container missing')
expect(report.portraits.about, 'About portrait container missing')
expect(report.portraits.creative, 'Creative portrait container missing')

// Objective section: text left, vertical portrait right, content unchanged.
expect(report.portraits.objective, 'Objective portrait container missing')
// Either the user's photo is configured (renders <img>) or the empty placeholder shows.
expect(
  report.objectiveLayout.hasPhoto ||
    report.placeholderLabels.some((l) => l.includes('OBJECTIVE PORTRAIT')),
  'Objective has neither photo nor placeholder label',
)
expect(report.objectiveLayout.textOk, 'Objective statement text changed')
expect(report.objectiveLayout.hasItalics === 2, `expected 2 italic spans, got ${report.objectiveLayout.hasItalics}`)
expect(
  report.objectiveLayout.font?.includes('Cormorant'),
  `Objective font changed: ${report.objectiveLayout.font}`,
)
expect(
  report.objectiveLayout.figureLeft > report.objectiveLayout.statementLeft,
  'Objective portrait is not to the right of the statement',
)
{
  const ratio = parseFloat(report.objectiveLayout.figureRatio)
  expect(Math.abs(ratio - 0.8) < 0.03, `Objective figure ratio ${ratio} is not 4:5`)
}
expect(
  !report.placeholderLabels.some((l) => l.includes('PROJECT')),
  'Project placeholder still present',
)
expect(report.photosLoaded.broken === 0, `${report.photosLoaded.broken} broken photo(s) — existing photographs must stay intact`)

for (const label of ['01 / ABOUT', '02 / EXPERTISE', '03 / SKILLS', '05 / STRENGTHS', 'MY OBJECTIVE', '06 / CONTACT']) {
  expect(report.labels.includes(label), `section label missing: ${label}`)
}
expect(!report.labels.includes('04 / SELECTED WORK'), 'Selected Work label still present')

expect(report.hasYear, 'dynamic year missing in footer')
expect(report.footerLeft, 'footer left text missing')
expect(report.footerCenter, 'footer center text missing')
expect(report.landmarks.header === 0, 'header element still present')
expect(report.landmarks.nav === 0, 'nav element still present')
expect(report.landmarks.main && report.landmarks.footer, 'main/footer landmarks missing')
expect(report.landmarks.skipLink, 'skip link missing')
expect(report.landmarks.title.includes('Mohammad Sajid'), 'title wrong')
expect(report.landmarks.metaDescription?.includes('Mohammad Sajid'), 'meta description wrong')
expect(report.landmarks.lang === 'en', 'lang attribute wrong')
expect(report.overlaps === 0, `${report.overlaps} heading/figure overlaps`)
expect(report.colorful.length === 0, `colorful text detected: ${report.colorful.join(' | ')}`)

await browser.close()
console.log(failures === 0 ? '\nALL CONTENT CHECKS PASSED' : `\n${failures} CONTENT FAILURES`)
process.exit(failures === 0 ? 0 : 1)
