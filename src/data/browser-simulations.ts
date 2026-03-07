/**
 * Browser Sandbox Simulations (Phase 1)
 * Runs entirely in the browser — no backend/Docker required.
 * Supports: HTML, CSS, Vanilla JS (template: "static")
 *            Small React apps       (template: "react-ts")
 */

export type BrowserTemplate = "static" | "react-ts";

export interface BrowserSimulationFile {
  name: string;
  language: "html" | "css" | "javascript" | "typescript" | "tsx";
  content: string;
}

export interface BrowserSimulation {
  id: string;
  /** Always "frontend" so the listing routes here */
  category: "frontend";
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  incident: string;
  steps: { description: string }[];
  initialFiles: BrowserSimulationFile[];
  /** fileName → fixed content */
  solution: Record<string, string>;
  hints?: string[];
  estimatedTime: number;
  tags: string[];
  xpReward: number;
  template: BrowserTemplate;
}

/* ─────────────────────────────────────────────────────────
   Simulation 1 — Broken Responsive Gallery (CSS Grid)
───────────────────────────────────────────────────────── */
const BROKEN_GALLERY_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nature Gallery</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <h1>Nature Gallery</h1>
    <p>A curated collection of stunning landscapes</p>
  </header>

  <div class="gallery">
    <div class="gallery-item featured">
      <img
        src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80"
        alt="Mountain landscape"
      />
      <div class="caption">Mountain Peaks at Dawn</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80"
        alt="Forest path"
      />
      <div class="caption">Ancient Forest</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=600&q=80"
        alt="Ocean waves"
      />
      <div class="caption">Ocean Waves</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=600&q=80"
        alt="Desert dunes"
      />
      <div class="caption">Desert Dunes</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&q=80"
        alt="Waterfall"
      />
      <div class="caption">Hidden Waterfall</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80"
        alt="Autumn leaves"
      />
      <div class="caption">Autumn Colors</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&q=80"
        alt="Rolling hills"
      />
      <div class="caption">Rolling Hills</div>
    </div>

    <div class="gallery-item">
      <img
        src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80"
        alt="Snowy mountain"
      />
      <div class="caption">Winter Summit</div>
    </div>
  </div>
</body>
</html>
`;

const BROKEN_GALLERY_CSS = `/* ── Reset ──────────────────────────────── */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f0f;
  color: #fff;
  padding: 2rem;
  min-height: 100vh;
}

/* ── Header ─────────────────────────────── */
header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

header p {
  color: #888;
  margin-top: 0.4rem;
  font-size: 0.95rem;
}

/* ── Gallery ────────────────────────────── */
/* BUG 1: display should be "grid", not "block" */
.gallery {
  display: block;
  /* BUG 2: grid-template-columns is missing — add:
       grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); */
  /* BUG 3: gap is missing — items are squished together */
}

.gallery-item {
  /* BUG 4: overflow: hidden and position: relative are missing */
  background: #1a1a1a;
}

/* BUG 5: featured item should span 2 columns:
   grid-column: span 2;
   but the rule is absent */

.gallery-item img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  /* BUG 6: No transition for hover zoom effect */
}

.gallery-item.featured img {
  /* BUG 7: featured image should be taller — e.g. height: 420px */
  height: 220px;
}

/* BUG 8: Caption should be an absolute overlay at the bottom,
   but position, background gradient and color are all missing */
.caption {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: #888;
}

/* BUG 9: No responsive rule — featured should collapse to span 1
   on mobile (max-width: 640px) */
`;

const FIXED_GALLERY_CSS = `/* ── Reset ──────────────────────────────── */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0f0f0f;
  color: #fff;
  padding: 2rem;
  min-height: 100vh;
}

/* ── Header ─────────────────────────────── */
header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

header p {
  color: #888;
  margin-top: 0.4rem;
  font-size: 0.95rem;
}

/* ── Gallery ────────────────────────────── */
/* FIX 1 & 2 & 3: proper CSS Grid with responsive columns and gap */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

/* FIX 4: clip zoom effect + relative for caption overlay */
.gallery-item {
  overflow: hidden;
  position: relative;
  border-radius: 0.5rem;
  background: #1a1a1a;
}

/* FIX 5: featured item spans 2 columns */
.gallery-item.featured {
  grid-column: span 2;
}

/* FIX 6: smooth zoom on hover */
.gallery-item img {
  width: 100%;
  height: 220px;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.gallery-item:hover img {
  transform: scale(1.06);
}

/* FIX 7: featured image is properly taller */
.gallery-item.featured img {
  height: 420px;
}

/* FIX 8: caption is an absolute gradient overlay */
.caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 0.75rem 0.75rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
  font-size: 0.85rem;
  font-weight: 500;
  color: #fff;
}

/* FIX 9: collapse to single column on narrow screens */
@media (max-width: 640px) {
  .gallery-item.featured {
    grid-column: span 1;
  }

  .gallery-item.featured img {
    height: 260px;
  }
}
`;

/* ─────────────────────────────────────────────────────────
   Simulation 2 — Flexbox Nav Bug
───────────────────────────────────────────────────────── */
const FLEXBOX_NAV_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Portfolio</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <nav class="navbar">
    <div class="nav-brand">
      <span class="logo">&#9670;</span>
      <span class="brand-name">DevFolio</span>
    </div>
    <ul class="nav-links">
      <li><a href="#">Home</a></li>
      <li><a href="#">Work</a></li>
      <li><a href="#">About</a></li>
      <li><a href="#">Contact</a></li>
    </ul>
    <button class="cta-btn">Hire Me</button>
  </nav>

  <section class="hero">
    <h1>Front-end<br/><span>Developer</span></h1>
    <p>Crafting beautiful, accessible interfaces — one pixel at a time.</p>
    <div class="hero-actions">
      <a href="#" class="btn-primary">View Work</a>
      <a href="#" class="btn-secondary">Download CV</a>
    </div>
  </section>

  <section class="cards">
    <div class="card">
      <div class="card-icon">01</div>
      <h3>UI Design</h3>
      <p>Pixel-perfect designs translated from Figma to code.</p>
    </div>
    <div class="card">
      <div class="card-icon">02</div>
      <h3>React</h3>
      <p>Scalable component architectures and state management.</p>
    </div>
    <div class="card">
      <div class="card-icon">03</div>
      <h3>Performance</h3>
      <p>Lighthouse 100 scores and sub-second load times.</p>
    </div>
  </section>
</body>
</html>
`;

const BROKEN_FLEXBOX_CSS = `*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  color: #111;
  min-height: 100vh;
}

/* ── Navbar ─────────────────────────────── */
.navbar {
  display: flex;
  /* BUG 1: align-items is missing — items not vertically centered */
  padding: 0 2rem;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  /* BUG 2: justify-content missing — brand/links/cta are all bunched left */
}

.nav-brand {
  display: flex;
  gap: 0.5rem;
  /* BUG 3: align-items: center missing — logo not vertically aligned */
}

.logo {
  font-size: 1.25rem;
  color: #6366f1;
}

.brand-name {
  font-weight: 700;
  font-size: 1.1rem;
}

/* BUG 4: nav-links has no flex display — items stack vertically */
.nav-links {
  list-style: none;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #111;
}

.cta-btn {
  padding: 0.5rem 1.25rem;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.cta-btn:hover {
  background: #374151;
}

/* ── Hero ───────────────────────────────── */
.hero {
  padding: 5rem 2rem 4rem;
  max-width: 640px;
  margin: 0 auto;
}

.hero h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 1.25rem;
}

.hero h1 span {
  color: #6366f1;
}

.hero p {
  color: #6b7280;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* BUG 5: hero-actions should be flex with gap, but isn't */
.hero-actions {
  gap: 1rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  background: #111;
  color: #fff;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #374151;
}

.btn-secondary {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border: 1.5px solid #d1d5db;
  color: #374151;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.btn-secondary:hover {
  border-color: #9ca3af;
}

/* ── Cards ──────────────────────────────── */
.cards {
  padding: 3rem 2rem;
  max-width: 960px;
  margin: 0 auto;
  /* BUG 6: cards section should be a 3-column CSS Grid — 
     display: grid and grid-template-columns are both missing */
  gap: 1.5rem;
}

.card {
  background: #fff;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 2rem;
  font-weight: 800;
  color: #e5e7eb;
  margin-bottom: 1rem;
}

.card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card p {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.6;
}
`;

const FIXED_FLEXBOX_CSS = `*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f9fafb;
  color: #111;
  min-height: 100vh;
}

/* ── Navbar ─────────────────────────────── */
.navbar {
  display: flex;
  align-items: center;           /* FIX 1 */
  justify-content: space-between; /* FIX 2 */
  padding: 0 2rem;
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.nav-brand {
  display: flex;
  align-items: center; /* FIX 3 */
  gap: 0.5rem;
}

.logo {
  font-size: 1.25rem;
  color: #6366f1;
}

.brand-name {
  font-weight: 700;
  font-size: 1.1rem;
}

/* FIX 4: nav-links uses flex */
.nav-links {
  list-style: none;
  display: flex;
  gap: 2rem;
}

.nav-links a {
  text-decoration: none;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #111;
}

.cta-btn {
  padding: 0.5rem 1.25rem;
  background: #111;
  color: #fff;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.cta-btn:hover {
  background: #374151;
}

/* ── Hero ───────────────────────────────── */
.hero {
  padding: 5rem 2rem 4rem;
  max-width: 640px;
  margin: 0 auto;
}

.hero h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  margin-bottom: 1.25rem;
}

.hero h1 span {
  color: #6366f1;
}

.hero p {
  color: #6b7280;
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

/* FIX 5: hero-actions uses flex */
.hero-actions {
  display: flex;
  gap: 1rem;
}

.btn-primary {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  background: #111;
  color: #fff;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.95rem;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #374151;
}

.btn-secondary {
  display: inline-block;
  padding: 0.75rem 1.75rem;
  border: 1.5px solid #d1d5db;
  color: #374151;
  text-decoration: none;
  border-radius: 0.375rem;
  font-weight: 600;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.btn-secondary:hover {
  border-color: #9ca3af;
}

/* ── Cards ──────────────────────────────── */
/* FIX 6: 3-column CSS Grid */
.cards {
  padding: 3rem 2rem;
  max-width: 960px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  background: #fff;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 2rem;
  font-weight: 800;
  color: #e5e7eb;
  margin-bottom: 1rem;
}

.card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.card p {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.6;
}
`;

/* ─────────────────────────────────────────────────────────
   Exported array
───────────────────────────────────────────────────────── */
export const browserSimulations: BrowserSimulation[] = [
  {
    id: "browser-broken-gallery",
    category: "frontend",
    title: "Fix: Broken Responsive Gallery",
    difficulty: "easy",
    description:
      "A photo gallery built with CSS Grid is completely broken — all images stack in a single column with no spacing, and the hero image isn't any larger than the rest. Your task: fix the CSS so the layout renders as a responsive, masonry-style grid.",
    incident:
      "All 8 gallery images are stacking vertically in one column. No gap between items, no responsive columns, the featured image is the same size as the rest, and captions are plain text instead of overlays.",
    steps: [
      {
        description:
          "Open style.css. Find the .gallery rule and change display from 'block' to 'grid'.",
      },
      {
        description:
          "Add grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) and gap: 1rem to .gallery.",
      },
      {
        description:
          "Add grid-column: span 2 to .gallery-item.featured and increase its img height to 420px.",
      },
      {
        description:
          "Add overflow: hidden and position: relative to .gallery-item so the image zoom is clipped.",
      },
      {
        description:
          "Style .caption as an absolute overlay with a gradient background at the bottom of each card.",
      },
      {
        description:
          "Add a @media (max-width: 640px) rule so the featured item collapses to span 1 on mobile.",
      },
    ],
    initialFiles: [
      {
        name: "index.html",
        language: "html",
        content: BROKEN_GALLERY_HTML,
      },
      {
        name: "style.css",
        language: "css",
        content: BROKEN_GALLERY_CSS,
      },
    ],
    solution: {
      "style.css": FIXED_GALLERY_CSS,
    },
    hints: [
      "The .gallery container needs display: grid before any grid properties will have effect.",
      "grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) creates a fully responsive grid with no media queries.",
      "grid-column: span 2 on the featured item makes it occupy two columns — perfect for a hero image.",
      "Absolute positioning on .caption only works when the parent (.gallery-item) has position: relative.",
      "overflow: hidden on .gallery-item is what actually clips the image when it zooms via transform: scale.",
    ],
    estimatedTime: 15,
    tags: ["CSS Grid", "Responsive", "Layout", "Gallery"],
    xpReward: 60,
    template: "static",
  },
  {
    id: "browser-flexbox-nav",
    category: "frontend",
    title: "Fix: Flexbox Portfolio Layout",
    difficulty: "easy",
    description:
      "A developer portfolio page has multiple flexbox bugs: the navbar items aren't centred or spaced, the nav links stack vertically, the hero CTA buttons don't sit side-by-side, and the features section never became a 3-column grid.",
    incident:
      "Navbar links are stacked vertically and bunched against the left edge. Hero buttons break to separate lines. Feature cards all stack in a single column instead of a 3-up layout.",
    steps: [
      {
        description:
          "Fix .navbar — add align-items: center and justify-content: space-between.",
      },
      {
        description: "Fix .nav-brand — add align-items: center.",
      },
      {
        description:
          "Fix .nav-links — add display: flex so links appear in a row.",
      },
      {
        description:
          "Fix .hero-actions — add display: flex so the two buttons appear side by side.",
      },
      {
        description:
          "Fix .cards — add display: grid and grid-template-columns: repeat(3, 1fr).",
      },
    ],
    initialFiles: [
      {
        name: "index.html",
        language: "html",
        content: FLEXBOX_NAV_HTML,
      },
      {
        name: "style.css",
        language: "css",
        content: BROKEN_FLEXBOX_CSS,
      },
    ],
    solution: {
      "style.css": FIXED_FLEXBOX_CSS,
    },
    hints: [
      "Every flex container needs display: flex — without it, gap and align-items have no effect.",
      "justify-content: space-between pushes the first and last children to opposite ends of the navbar.",
      "align-items: center vertically centres flex children within the cross axis.",
      "The cards section needs both display: grid AND grid-template-columns to show 3 columns.",
    ],
    estimatedTime: 10,
    tags: ["Flexbox", "CSS Grid", "Layout", "Navbar"],
    xpReward: 40,
    template: "static",
  },
];
