import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * Automatically scrolls to the top of the page when the route changes
 * Solves the issue where mobile navigation preserves scroll position from previous page
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname]);

  return null;
}
