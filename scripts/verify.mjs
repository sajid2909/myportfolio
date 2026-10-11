import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:4173/'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const WIDTHS = [375, 430, 768, 1024, 1440, 1920]

mkdirSync('verify-shots', { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
})

let failures = 0

for (const width of WIDTHS) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 })
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 })
  // Let entrance animations settle.
  await new Promise((r) => setTimeout(r, 1200))

  const report = await page.evaluate(() => {
    const doc = document.documentElement
    const overflow = doc.scrollWidth - doc.clientWidth

    // Find any element wider than the viewport (horizontal overflow culprits).
    const culprits = []
    for (const el of document.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && (rect.right > doc.clientWidth + 1 || rect.left < -1)) {
        culprits.push(
          `${el.tagName.toLowerCase()}.${(el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 3).join('.')} → right=${Math.round(rect.right)} left=${Math.round(rect.left)}`,
        )
      }
    }

    // Overlap check for the two hero columns.
    const workSection = document.getElementById('work')
    const bodyUpper = document.body.innerText.toUpperCase()
    const workspaceText = bodyUpper.includes('WORKSPACE')
    // Project-slot text only — the Contact label "Have a project or opportunity?" must stay.
    const projectText = ['PROJECT 01', 'PROJECT 02', 'CONTENT COMING SOON', 'TECHNOLOGY STACK'].some(
      (t) => bodyUpper.includes(t),
    )
    // Portrait slots still exist for hero/about/creative/objective.
    // The Creative slot is now a <video> (rain portrait) instead of a <figure>.
    const portraitFigures = document.querySelectorAll(
      '#home figure, #about figure, #objective figure',
    ).length + (document.querySelector('#creative video') ? 1 : 0)

    const heroH1 = document.querySelector('#home h1')
    const heroFigure = document.querySelector('#home figure')
    const h1Rect = heroH1?.getBoundingClientRect()
    const figRect = heroFigure?.getBoundingClientRect()
    const heroOverlap =
      h1Rect && figRect
        ? !(h1Rect.right <= figRect.left || figRect.right <= h1Rect.left || h1Rect.bottom <= figRect.top || figRect.bottom <= h1Rect.top)
        : false

    // Header/navigation must be completely removed.
    const headerCount = document.querySelectorAll('header').length
    const navCount = document.querySelectorAll('nav').length
    const burgerCount = document.querySelectorAll('button[aria-controls="mobile-menu"]').length
    const heroLabel = document.querySelector('#home p.label')
    const heroLabelTop = heroLabel ? Math.round(heroLabel.getBoundingClientRect().top) : -1
    const fontHero = getComputedStyle(heroH1).fontFamily
    const fontBody = getComputedStyle(document.body).fontFamily
    const bodyBg = getComputedStyle(document.body).backgroundColor

    const heroSize = heroH1 ? parseFloat(getComputedStyle(heroH1).fontSize) : 0

    // Broken image check (should be none — all placeholders).
    const brokenImages = [...document.images].filter((img) => img.complete && img.naturalWidth === 0).length

    // Placeholder count
    const placeholders = document.querySelectorAll('figure [aria-hidden="true"] span').length

    return {
      overflow,
      culprits: culprits.slice(0, 6),
      heroOverlap,
      headerCount,
      navCount,
      burgerCount,
      heroLabelTop,
      workSection: !!workSection,
      workspaceText,
      projectText,
      portraitFigures,
      fontHero,
      fontBody,
      bodyBg,
      heroSize,
      brokenImages,
      placeholders,
      docHeight: doc.scrollHeight,
    }
  })

  const problems = []
  if (report.overflow > 1) problems.push(`HORIZONTAL OVERFLOW: ${report.overflow}px — ${report.culprits.join(' | ')}`)
  if (report.heroOverlap) problems.push('Hero heading overlaps portrait placeholder')
  if (report.headerCount > 0) problems.push('Header element still present')
  if (report.navCount > 0) problems.push(`${report.navCount} nav element(s) still present`)
  if (report.burgerCount > 0) problems.push('Mobile hamburger still present')
  if (report.brokenImages > 0) problems.push(`${report.brokenImages} broken images`)
  if (report.workSection) problems.push('#work section still present')
  if (report.workspaceText) problems.push('"WORKSPACE" text still on page')
  if (report.projectText) problems.push('Project slot content still on page')
  if (report.portraitFigures !== 4)
    problems.push(`Expected 4 portrait containers (hero/about/creative/objective), got ${report.portraitFigures}`)
  // Hero label should sit near the top with balanced breathing room (40–220px).
  if (report.heroLabelTop < 40 || report.heroLabelTop > 220)
    problems.push(`Hero top spacing unbalanced: label at ${report.heroLabelTop}px`)
  if (!report.fontHero.includes('Cormorant')) problems.push(`Hero font wrong: ${report.fontHero}`)
  if (!report.fontBody.includes('Inter')) problems.push(`Body font wrong: ${report.fontBody}`)
  if (report.bodyBg !== 'rgb(21, 21, 21)') problems.push(`Body bg wrong: ${report.bodyBg}`)

  // Hero size targets
  // Spec: mobile 54–72px, desktop 110–150px.
  const targets =
    width <= 430
      ? [54, 72]
      : width < 1024
        ? [54, 90]
        : [110, 150]
  if (report.heroSize < targets[0] || report.heroSize > targets[1])
    problems.push(`Hero size ${report.heroSize}px outside ${targets[0]}–${targets[1]}px`)

  console.log(`\n=== ${width}px — ${problems.length === 0 ? 'OK' : 'ISSUES'} ===`)
  console.log(
    JSON.stringify(
      { heroSize: report.heroSize, placeholders: report.placeholders, docHeight: report.docHeight, ...report },
      null,
      1,
    ),
  )
  for (const p of problems) {
    failures++
    console.log('  ✗ ' + p)
  }

  await page.screenshot({ path: `verify-shots/${width}.png`, fullPage: width >= 1024 })
  await page.close()
}

// Functional test: navigation completely removed at 375px, page still usable
const page = await browser.newPage()
await page.setViewport({ width: 375, height: 812 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 800))

const navGone = await page.evaluate(() => ({
  header: document.querySelectorAll('header').length,
  nav: document.querySelectorAll('nav').length,
  burger: document.querySelectorAll('button[aria-controls="mobile-menu"]').length,
  menu: document.querySelectorAll('#mobile-menu').length,
  // First *visible* text — skip visually-hidden a11y helpers like the sr-only skip link.
  firstText:
    [...document.querySelectorAll('h1, h2, p, span, a')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const s = getComputedStyle(el)
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('.sr-only')
      })
      .map((el) => el.textContent.trim())
      .find((t) => t.length > 0) ?? '',
}))
const navRemoved =
  navGone.header === 0 && navGone.nav === 0 && navGone.burger === 0 && navGone.menu === 0
console.log(`\nMobile (375px) navigation removed: ${navRemoved ? 'OK' : 'FAIL'}`, JSON.stringify(navGone))
if (!navRemoved) failures++
const startsWithHero =
  navGone.firstText.toUpperCase().includes('PORTFOLIO') ||
  navGone.firstText.toUpperCase().includes('HYDERABAD')
console.log(`Page opens directly with hero: ${startsWithHero ? 'OK' : 'FAIL'} (first text: "${navGone.firstText}")`)
if (!startsWithHero) failures++
await page.screenshot({ path: 'verify-shots/mobile-no-nav.png' })

// TASK 3 (user request): the hero "Contact ↗" button was intentionally removed.
// The functional #contact section and its email/LinkedIn links must remain.
const heroContactGone = await page.evaluate(() => document.querySelector('#home a[href="#contact"]') === null)
console.log(`Hero Contact button removed (as requested): ${heroContactGone ? 'OK' : 'FAIL'}`)
if (!heroContactGone) failures++
const contactSectionFunctional = await page.evaluate(() => {
  const s = document.getElementById('contact')
  return !!s && !!s.querySelector('a[href^="mailto:"]') && !!s.querySelector('a[href*="linkedin.com"]')
})
console.log(`#contact section functional (email + linkedin): ${contactSectionFunctional ? 'OK' : 'FAIL'}`)
if (!contactSectionFunctional) failures++
// Remaining in-page anchor (footer back-to-top → #home) must still work.
const footerHomeLink = await page.evaluate(() => document.querySelector('footer a[href="#home"]'))
if (footerHomeLink) {
  await page.evaluate(() => document.querySelector('footer a[href="#home"]').scrollIntoView())
  await new Promise((r) => setTimeout(r, 400))
  await page.click('footer a[href="#home"]')
  await new Promise((r) => setTimeout(r, 1500))
  const scrolledToHome = await page.evaluate(() => Math.round(document.getElementById('home').getBoundingClientRect().top))
  console.log(`Footer back-to-top → #home: top=${scrolledToHome}px (near 0 = OK)`)
  if (scrolledToHome < -5 || scrolledToHome > 150) failures++
}
await page.evaluate(() => document.getElementById('contact').scrollIntoView())
await new Promise((r) => setTimeout(r, 600))
await page.screenshot({ path: 'verify-shots/mobile-contact.png' })

// Objective mobile stacking: label → statement → portrait, top to bottom.
await page.evaluate(() => document.getElementById('objective').scrollIntoView())
await new Promise((r) => setTimeout(r, 1000))
const objOrder = await page.evaluate(() => {
  const top = (sel) => Math.round(document.querySelector(sel)?.getBoundingClientRect().top ?? -1)
  return {
    label: top('#objective .label'),
    statement: top('#objective .display-section'),
    figure: top('#objective figure'),
  }
})
const objStacked =
  objOrder.label >= 0 && objOrder.label < objOrder.statement && objOrder.statement < objOrder.figure
console.log(`Objective mobile stacking (label→statement→portrait): ${objStacked ? 'OK' : 'FAIL'}`, JSON.stringify(objOrder))
if (!objStacked) failures++
await page.screenshot({ path: 'verify-shots/mobile-objective.png' })

// Desktop link interactions
await page.setViewport({ width: 1440, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 600))
const links = await page.evaluate(() => {
  const linkedin = document.querySelector('a[target="_blank"]')
  const mailto = document.querySelector('a[href^="mailto:"]')
  return {
    // TASK 3: hero Contact button intentionally removed by user request.
    heroContactPresent: document.querySelector('#home a[href="#contact"]') !== null,
    linkedinHref: linkedin?.getAttribute('href') ?? null,
    linkedinRel: linkedin?.getAttribute('rel') ?? null,
    mailtoHref: mailto?.getAttribute('href') ?? null,
  }
})
console.log('\nLinks:', JSON.stringify(links, null, 1))
if (links.heroContactPresent) { failures++; console.log('  ✗ hero Contact button should be removed (user request)') }
if (!links.linkedinHref?.includes('linkedin.com/in/mohammad-sajid')) { failures++; console.log('  ✗ linkedin link wrong') }
if (links.linkedinRel !== 'noopener noreferrer') { failures++; console.log('  ✗ linkedin rel wrong') }
if (!links.mailtoHref?.startsWith('mailto:ishansajid786@gmail.com')) { failures++; console.log('  ✗ mailto wrong') }

await page.screenshot({ path: 'verify-shots/desktop-full.png', fullPage: true })
await browser.close()

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} FAILURES`}`)
process.exit(failures === 0 ? 0 : 1)
