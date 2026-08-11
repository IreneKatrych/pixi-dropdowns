# PixiJS Dropdowns

A reusable PixiJS 7 canvas dropdown showcase built with TypeScript, GSAP, Vite, and Playwright.

## About the project

This project demonstrates a reusable dropdown component rendered entirely on a PixiJS canvas. The showcase is intended to cover several component configurations, including regular and disabled options, options with icons, loading states, and communication between multiple dropdown instances.

The implementation focuses on clear component boundaries, predictable lifecycle and resource ownership, GPU-friendly animation, and reliable end-to-end testing of canvas interactions without hardcoded screen coordinates.

## Tech stack

- **PixiJS 7.4.2** — canvas rendering, display objects, textures, and pointer interaction
- **GSAP 3.12.5** — open, close, and hover animations
- **TypeScript 5.5.2** — strict typing and public component contracts
- **Vite 8.2.1** — local development and production bundling
- **Playwright 1.62.1** — browser-level functional coverage of the canvas UI

No UI framework or third-party state-management library is used. The dependency set is intentionally small to keep the solution auditable and appropriate for a security-conscious environment.

## Project goals

- provide a genuinely reusable dropdown API rather than a single-purpose demo;
- create dropdown items through a factory;
- support active, disabled, icon, and loading states;
- animate inexpensive rendering properties such as transforms and alpha;
- expose selection changes without coupling one dropdown to another;
- clean up PixiJS events, GSAP animations, and owned display objects;
- demonstrate several dropdown configurations on one showcase page;
- test real user-facing behavior through Playwright using a stable canvas test contract.

## Requirements

- Node.js 22.14.0 (see `.nvmrc`)
- npm

## Setup

```sh
npm ci
npx playwright install chromium
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run typecheck` | Validate TypeScript without emitting files |
| `npm run build` | Run type checking and create a production build |
| `npm run test:e2e` | Run the Playwright test suite in Chromium |

## Testing approach

The core dropdown behavior is covered with Playwright. Because the UI is rendered on a canvas, tests use an explicit runtime test contract to discover component state and interactive bounds instead of relying on fragile, hardcoded X/Y coordinates. Pointer actions still target the real canvas so the tests exercise the same interaction path as a user.

The intended coverage includes opening and closing, active and disabled selection, outside clicks, icon options, loading behavior, emitted selection data, and coordination between dropdown instances.

## Dependency security note

The starter project pinned Vite 5.3.1 and Playwright 1.45.0. They were updated to Vite 8.2.1 and Playwright 1.62.1 because the original versions have known security vulnerabilities reported by `npm audit`. Vite required a major update because the relevant advisories also affect the available Vite 5 and 6 releases. These are security maintenance updates to the existing toolchain, not additional application dependencies. PixiJS 7.4.2 and GSAP 3.12.5 remain at the versions specified by the assignment.

The original lockfile also contained package URLs for a private registry. It was regenerated against the public npm registry so that reviewers can reproduce the installation outside the original environment.

## Deliberate scope trade-offs

The 10,000-option example exists to demonstrate bounded rendering and recycled item views rather than to recommend scrolling as the primary UX for a dataset of that size. A production implementation would normally add search, autocomplete, or server-side filtering. Those features are intentionally deferred because they are outside this assignment's dropdown and rendering scope.
