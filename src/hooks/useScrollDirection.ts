import { useState, useEffect } from 'react';

export const useScrollDirection = (pathname?: string) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    // 當路徑改變時，重置為向上捲動 (顯示導航列)
    setScrollDirection('up');
    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const updateScrollDir = () => {
      const scrollY = window.pageYOffset;

      if (scrollY < 10) {
        setIsAtTop(true);
        setScrollDirection('up'); // Always show nav at the very top
        lastScrollY = scrollY;
        ticking = false;
        return;
      }
      setIsAtTop(false);

      if (Math.abs(scrollY - lastScrollY) < 10) {
        ticking = false;
        return;
      }

      // Check if we hit the bottom
      const isAtBottom = window.innerHeight + scrollY >= document.body.offsetHeight - 20;
      if (isAtBottom) {
        setScrollDirection('up'); // Always show nav at the very bottom
      } else {
        setScrollDirection(scrollY > lastScrollY ? 'down' : 'up');
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDir);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return { scrollDirection, isAtTop };
};
