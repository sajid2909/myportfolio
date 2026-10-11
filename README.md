# Mohammad Sajid — Personal Portfolio

A premium, dark, minimalist editorial portfolio website.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS 4 · Motion for React · Lucide React

## Commands

```bash
npm run dev      # start dev server
npm run build    # type-check + production build (dist/)
npm run preview  # serve the production build
```

## Project structure

There is intentionally **no top navigation bar** — the page opens directly with
the hero section, and in-page anchors (hero contact link, footer back-to-top)
provide movement through the page.

```
src/
├── components/   # Footer, PortfolioImage, Reveal, SectionHeader
├── config/       # site.ts (personal info) + portfolioImages.ts (photo paths)
├── sections/     # Hero, About, Expertise, Skills, Creative,
│                 # Strengths, Objective, Contact
├── styles/       # global.css — design tokens, type scale, layout helpers
├── App.tsx
└── main.tsx
public/
└── images/       # ← drop photographs here
scripts/          # optional browser verification (see below)
```

## Photographs

Portrait slots — hero, about, creative, objective. Photos live in
`public/images/` and their paths are defined in `src/config/portfolioImages.ts`:

```ts
export const portfolioImages = {
  hero: '/images/hero.jpg',
  about: '/images/about.jpg',
  creative: '/images/creative.jpg',
  objective: '',
}
```

That is the only file to touch — layouts, aspect ratios, and cropping stay unchanged.
An empty string renders a styled responsive placeholder instead of the photo.
Each `PortfolioImage` also accepts `objectPosition` (e.g. `"50% 20%"`) for fine-tuning
the crop of a specific photo without touching the layout.

## Design system

- Colors: background `#151515` / `#101010`, text `#F5F5F5` / `#A0A0A0`,
  muted `#777777`, borders `#383838`
- Type: Cormorant Garamond (editorial serif), Inter (sans), IBM Plex Mono (labels)
- Fluid `clamp()` typography, 1440px max content width, monochrome only
- Animations are subtle fades/slides and respect `prefers-reduced-motion`

## Verification (optional)

Two headless-Chrome scripts check the built site (requires local Chrome;
update the `CHROME` path if yours differs). Start `npm run preview` first:

```bash
node scripts/verify.mjs          # responsive layout, overflow, nav, links
node scripts/verify-content.mjs  # headings, labels, anchors, palette, a11y
```
