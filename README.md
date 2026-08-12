# PixiJS Dropdowns

A reusable PixiJS 7 canvas dropdown showcase built with TypeScript, GSAP, Vite, and Playwright.

## About the project

This project demonstrates a reusable dropdown component rendered entirely on a PixiJS canvas. The showcase is intended to cover several component configurations, including regular and disabled options, options with icons, loading states, and communication between multiple dropdown instances.

The implementation focuses on clear component boundaries, predictable lifecycle and resource ownership, GPU-friendly animation, and reliable end-to-end testing of canvas interactions without hardcoded screen coordinates.

The async example is intentionally deterministic: its first simulated request fails so the error and retry flow can be reviewed, while the second request succeeds. The application owns the request lifecycle and aborts in-flight work when it is destroyed; the dropdown only renders idle, loading, error, ready, and empty-result presentations.

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

## Showcase scenarios

The demo contains four independently reusable dropdown instances:

- an icon-based category dropdown;
- a dependent item dropdown that starts disabled and is populated after a category selection;
- a lazy async dropdown with loading, deterministic error, retry, success, disabled-option, long-text, and empty-result states;
- a virtualized dropdown with 10,000 deterministic options.

Only `DropdownDemoApp` coordinates these examples. Individual dropdowns never reference or control one another.

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
| `npm run dev:test` | Start the isolated test-mode server with the runtime bridge |
| `npm run typecheck` | Validate TypeScript without emitting files |
| `npm run build` | Run type checking and create a production build |
| `npm run test:e2e` | Run the Playwright test suite in Chromium |

`npm run typecheck` validates the application and Playwright sources through separate TypeScript configurations, keeping browser-test globals out of the production compilation context.

## Public dropdown API

`Dropdown` extends PixiJS `Container`, so consumers can position it in the scene graph through normal Pixi transforms. Construction requires a typed configuration and shared visual resources:

```ts
const dropdown = new Dropdown(
  {
    id: 'payment-method',
    label: 'Payment method',
    placeholder: 'Select a method',
    options: [
      { id: 'card', label: 'Card', icon: cardTexture },
      { id: 'cash', label: 'Cash' },
      { id: 'unavailable', label: 'Unavailable', disabled: true },
    ],
    width: 300,
    maxVisibleItems: 5,
    onSelect: ({ dropdownId, option }) => {
      console.log(dropdownId, option.id);
    },
  },
  sharedDropdownResources,
);
```

### Configuration

| Property | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable dropdown identity used in emitted events and app orchestration |
| `options` | `DropdownOption[]` | Options with typed IDs, labels, optional disabled state, and optional Pixi texture icon |
| `placeholder` | `string?` | Header text shown before selection |
| `label` | `string?` | External field label rendered above the header |
| `disabled` | `boolean?` | Initial disabled state |
| `loading` | `boolean?` | Initial loading state |
| `selectedOptionId` | `string?` | Valid, enabled initial selection |
| `width` | `number?` | Component width; validated against the supported minimum |
| `maxVisibleItems` | `number?` | Maximum rows in the bounded list viewport |
| `onSelect` | `(selection) => void` | Emits the original option data after selection |
| `onOpenChange` | `(change) => void` | Lets the owner coordinate multiple dropdowns |
| `onOptionsRequest` | `() => void` | Requests options when an idle or failed async dropdown is tapped |

### Runtime methods

| Method | Purpose |
| --- | --- |
| `open()`, `close()`, `toggle()` | Control the expanded state through the same reversible animation timeline |
| `setOptions(options)` | Validate and replace options, rebuild the bounded item pool, and preserve selection when its ID still exists |
| `setLoading(loading)` | Enter or leave the interaction-blocking skeleton state |
| `setLoadError(message?)` | Present a retryable error state |
| `setDisabled(disabled)` | Update interaction and close the dropdown when disabling it |
| `clearSelection()` | Clear the selected option programmatically |
| `getSelectedOption()` | Return the selected original option or `null` |
| `destroy()` | Remove listeners, stop animations, and destroy owned display objects |

`getMaximumExpandedHeight()`, `containsGlobalPoint()`, and `handleWheelAt()` are integration methods used by the application layout and input orchestration. State and bounds snapshot methods support the time-boxed canvas test adapter and are discussed in the testing trade-off below.

## Architecture

```text
main.ts
  -> DropdownDemoApp
       -> owns Pixi Application, assets, generated textures and global listeners
       -> creates and coordinates several Dropdown instances
            -> Dropdown owns header, list viewport, mask and animation timeline
                 -> DropdownScrollController owns scroll state and clamping
                 -> DropdownScrollbarView owns scrollbar rendering and hit area
                 -> DropdownItemFactory creates recycled DropdownItem views
                 -> DropdownStatusView renders error and empty presentations
```

- `main.ts` only creates the demo application and registers Vite HMR cleanup.
- `DropdownDemoApp` handles asset loading, responsive layout, outside clicks, wheel routing, dependent dropdown behavior, and async request cancellation.
- `Dropdown` owns one component's local state, rendering, pointer input, selection, animation, and item recycling.
- `DropdownScrollController` contains rendering-independent scroll calculations and drag state.
- Layout, typography, color, text truncation, and sprite fitting are kept in focused modules without introducing a framework or state library.

## Loading and virtualization

The async dropdown requests data only on its first open. While loading, it shows a bounded skeleton and blocks list selection. Closing and reopening changes presentation only; it does not duplicate the request. Errors keep retry on the header—the control the user originally tapped—and an empty successful response receives a distinct non-interactive presentation. `DropdownDemoApp` owns the request and aborts it during teardown.

Long lists use a recycled pool sized to `maxVisibleItems + 2` overscan rows. Scrolling updates the option data and position of those existing views rather than constructing every option as a Pixi display object. The 10,000-option example therefore renders seven item views for a five-row viewport. Wheel input, content drag, scrollbar-thumb drag, touch pointers, scroll clamping, and native page-scroll ownership are handled explicitly.

The rectangular graphics mask is shared by the single list viewport rather than applied per item. PixiJS identifies axis-aligned rectangular masks as its least expensive mask path, and the bounded component count keeps event traversal and rendering work predictable.

## Lifecycle and resource ownership

`DropdownDemoApp` owns and cleans up:

- the Pixi `Application` and canvas;
- window resize, stage pointer, and canvas wheel listeners;
- pending async option requests;
- generated category-icon textures;
- textures loaded through the shared Pixi `Assets` cache;
- all dropdown instances and the optional test bridge.

`Dropdown` owns and cleans up:

- header and local scrolling pointer listeners;
- its reversible GSAP open/close timeline;
- item hover/pressed tweens;
- skeleton graphics, recycled item views, masks, panels, and other display children.

Shared textures are injected into dropdowns but are never destroyed by them. Sprites may be destroyed with their item views while their shared textures remain application-owned. Application teardown is idempotent, aborts option loading, and uses a lifecycle guard so a delayed initial `Assets.load()` cannot resume initialization after destruction.

## Testing approach

The core dropdown behavior is covered with Playwright. Because the UI is rendered on a canvas, tests use an explicit runtime test contract to discover component state and interactive bounds instead of relying on fragile, hardcoded X/Y coordinates. Pointer actions still target the real canvas so the tests exercise the same interaction path as a user.

The 20 Playwright scenarios cover opening and closing, rapid clicks, active and disabled selection, emitted data, icon options and selected icons, outside clicks, dependent dropdown coordination, loading/error/retry/empty states, request deduplication, resize, mouse wheel and touch scrolling, scrollbar dragging, scroll bounds, and the bounded recycled pool used by the 10,000-option example.

Playwright runs the application on a separate test-mode port. In that mode, a small typed runtime bridge exposes fresh dropdown state, emitted selections, request counts, and current interactive bounds converted to browser viewport coordinates. Tests still perform real pointer actions on the canvas; the bridge is observational and is removed during application teardown. The global bridge, test response controls, and selection log are removed from the normal production bundle.

As a deliberate time-boxed trade-off, the bridge contract and installation are isolated in the testing layer, while the dropdown currently exposes the small set of state and bounds inspection methods used to build snapshots. Those component methods remain in the production class but are inert unless called; the browser-global bridge itself is absent. In a larger production codebase, that instrumentation would be moved behind a dedicated test adapter so the component would contain no bridge-oriented inspection logic. The compact approach used here keeps the assignment implementation and its canvas E2E tests understandable without introducing a parallel component abstraction solely for testing.

Unit tests are intentionally deferred because they were not part of the assignment requirements. The available time is prioritized toward Playwright coverage of real canvas interactions, which was explicitly identified as a core evaluation criterion. In a production codebase, focused unit tests would additionally cover the scroll controller, text truncation, layout validation, and sprite scaling helpers.

## Performance validation

Measurements were taken from a warmed production preview in headed Chromium at a `1000x600` viewport and device pixel ratio `1`. Each scenario sampled 180 consecutive `requestAnimationFrame` intervals. The table reports the median result from three identical runs without CPU or GPU throttling.

| Scenario | Rendered rows | Frame time p50 | Frame time p95 | Frames over 20 ms |
| --- | ---: | ---: | ---: | ---: |
| Idle showcase | At most 7 per dropdown | 16.7 ms | 17.2 ms | 0 / 180 |
| 12 alternating open/close clicks | At most 7 per dropdown | 16.7 ms | 17.0 ms | 1 / 180 |
| 90 wheel events over 10,000 options | 7 | 16.7 ms | 17.0 ms | 0 / 180 |

`p50` is the median frame interval: half of the sampled frames were at least this fast. `p95` means 95% of frames completed within that interval and is useful for spotting intermittent stutter hidden by an average. At 60 Hz the nominal frame budget is about `16.7 ms`; this review defines a long frame as an interval above `20 ms` to avoid treating normal scheduling jitter as application jank.

The final JavaScript bundle is `575.12 kB` raw and `177.19 kB` gzip. Most of that baseline is the required PixiJS and GSAP runtime. Vite reports the single raw chunk above its default 500 kB warning threshold; code splitting would not materially reduce the total runtime required for this single-screen demo. Source maps are retained for reviewer debugging and are not part of the normal application transfer unless explicitly requested.

These desktop measurements validate the implementation and the bounded item count, but they do not replace profiling on the target terminal hardware. Antialiasing remains enabled because the measured scrolling scenario sustained the same frame-time percentiles as the idle baseline; it can be reconsidered if actual low-power hardware demonstrates a meaningful improvement.

## Comparison with existing PixiJS UI solutions

The official [`@pixi/ui` Select](https://pixijs.io/ui/Select.html) is a useful general-purpose alternative built from a `FancyButton` and `ScrollBox`. Its current release targets PixiJS 8 and adds `typed-signals` and `tweedle.js` as runtime dependencies, so it is not a direct fit for this assignment's required PixiJS 7 stack and minimal-dependency constraint.

`@pixi/ui` creates a button for every option and reduces rendering work by marking off-screen ScrollBox items as non-renderable. This project instead keeps a fixed recycled pool of visible item views, so the number of Pixi display objects stays bounded even for 10,000 options. The custom implementation also provides typed string IDs, disabled and icon options, deterministic async states, a visible draggable scrollbar, app-level dropdown coordination, reversible GSAP animation, and a Playwright canvas test contract.

The trade-off is scope: `@pixi/ui` provides a broader reusable component ecosystem and optional easing/inertial scrolling, while this implementation is deliberately narrower and optimized for the assignment's PixiJS 7, terminal-performance, security, and testing requirements.

## Dependency security note

The starter project pinned Vite 5.3.1 and Playwright 1.45.0. They were updated to Vite 8.2.1 and Playwright 1.62.1 because the original versions have known security vulnerabilities reported by `npm audit`. Vite required a major update because the relevant advisories also affect the available Vite 5 and 6 releases. These are security maintenance updates to the existing toolchain, not additional application dependencies. PixiJS 7.4.2 and GSAP 3.12.5 remain at the versions specified by the assignment.

The original lockfile also contained package URLs for a private registry. It was regenerated against the public npm registry so that reviewers can reproduce the installation outside the original environment.

## Deliberate scope trade-offs

The 10,000-option example exists to demonstrate bounded rendering and recycled item views rather than to recommend scrolling as the primary UX for a dataset of that size. A production implementation would normally add search, autocomplete, or server-side filtering. Those features are intentionally deferred because they are outside this assignment's dropdown and rendering scope.

A dedicated clear-selection button is also intentionally deferred. The public API already supports clearing a selection programmatically, while an additional header control would require its own touch target, interaction states, layout rules, and test coverage beyond the assignment requirements.

Additional deliberately deferred production features:

- search, autocomplete, or server-side filtering for very large data sets;
- inertial scrolling and overscroll effects;
- keyboard navigation and a DOM accessibility mirror for non-terminal browser use;
- a clear-selection header control;
- unit-level coverage for pure controllers and layout helpers;
- a fully external test adapter with no snapshot methods on the production component class;
- packaging, theming, and semantic versioning as a standalone component library;
- performance profiling on the actual target terminal hardware.

The supplied shadow texture is used through `NineSlicePlane`; transparent shadow pixels are represented as explicit insets and are not used as logical interaction or layout bounds.

## Implemented functionality

- reusable typed PixiJS 7 dropdown API;
- factory-created option views with active, disabled, selected, and icon states;
- long-text ellipsis for labels, placeholders, options, and selected values;
- reversible GSAP list and arrow animations with rapid-click handling;
- mouse hover/press, wheel, scrollbar, and touch-drag input;
- recycled rendering for 10,000 options with a visible bounded scrollbar;
- application-level outside-click and single-open-dropdown coordination;
- dependent dropdown orchestration without dropdown-to-dropdown coupling;
- lazy loading, skeleton, error, retry, request deduplication, abort, and empty response;
- responsive single/two-column showcase layout with native page scrolling;
- explicit listener, animation, display-object, texture, and request cleanup;
- 20 independent Playwright canvas scenarios using real pointer actions;
- strict TypeScript validation for both application and test sources;
- zero known vulnerabilities in the final `npm audit` review.

## Final verification

The final review runs:

```sh
npm run typecheck
npm run build
npm run test:e2e
npm audit
```

At the time of the final documented review, type checking and the production build completed successfully, all 20 Playwright scenarios passed, and `npm audit` reported zero known vulnerabilities.
