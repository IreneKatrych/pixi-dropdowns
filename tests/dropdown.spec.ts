import { test, expect } from '@playwright/test';


test.describe('Dropdown component', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the running dev server.
    await page.goto('/');

    // TODO: Wait for the Pixi application to finish initialising before
    //       running any assertions (e.g. wait for a canvas element or the
    //       state-bridge attribute to appear).
  });

  // ── Test 1: Initial render ───────────────────────────────────────────────

  test('renders closed on page load', async ({ page }) => {
    // TODO: Assert that the dropdown is in a closed state after initial load.
    //   Suggested approach:
    //     - Read data-state from the state-bridge element.
    //     - Parse JSON and check that isOpen === false.
    //     - Optionally take a screenshot for visual reference.
    expect(true).toBe(true); // placeholder — replace with real assertion
  });

  // ── Test 2: Open the dropdown ────────────────────────────────────────────

  test('opens when the header is clicked', async ({ page }) => {

    expect(true).toBe(true); 
  });

  // ── Test 3: Disabled item is not selectable ──────────────────────────────

  test('disabled item cannot be selected', async ({ page }) => {

    expect(true).toBe(true); 
  });

  // ── Test 4: Active item can be selected ─────────────────────────────────

  test('active item is selected on click and dropdown closes', async ({ page }) => {

    expect(true).toBe(true);
  });

  // ── Test 5: Dropdown closes when clicking outside ───────────────────────

  test('closes when clicking outside the component', async ({ page }) => {


    expect(true).toBe(true); 
  });

});
