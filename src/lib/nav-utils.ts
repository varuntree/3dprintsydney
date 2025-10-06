/**
 * Navigation utility functions
 * Fixes sidebar highlighting bugs and provides consistent pathname matching
 */

/**
 * Determines if a navigation item should be highlighted based on current pathname
 *
 * Special handling for root "/" to prevent it from matching all paths
 *
 * @param itemHref - The href of the navigation item
 * @param currentPathname - The current page pathname
 * @returns true if the item should be highlighted
 *
 * @example
 * isNavItemActive("/", "/")           // true
 * isNavItemActive("/", "/messages")   // false (fixed bug!)
 * isNavItemActive("/messages", "/messages")      // true
 * isNavItemActive("/messages", "/messages/123")  // true
 * isNavItemActive("/clients", "/invoices")       // false
 */
export function isNavItemActive(itemHref: string, currentPathname: string): boolean {
  // Special case: root path "/" should only match exact "/"
  if (itemHref === "/") {
    return currentPathname === "/";
  }

  // Special case: client home should be exact to avoid highlighting when on /client/orders
  if (itemHref === "/client") {
    return currentPathname === "/client";
  }

  // For all other paths, check if currentPathname starts with itemHref
  return currentPathname.startsWith(itemHref);
}

/**
 * Variant that requires exact match (no prefix matching)
 * Useful for navigation items that shouldn't highlight child routes
 */
export function isNavItemActiveExact(itemHref: string, currentPathname: string): boolean {
  return itemHref === currentPathname;
}

/**
 * Check if pathname matches any of multiple hrefs
 * Useful for multi-section navigation items
 */
export function isNavItemActiveMultiple(itemHrefs: string[], currentPathname: string): boolean {
  return itemHrefs.some(href => isNavItemActive(href, currentPathname));
}
