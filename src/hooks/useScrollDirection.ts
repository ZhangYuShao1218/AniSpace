import { useState, useEffect } from 'react';

export const useScrollDirection = () => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
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
      const isAtBottom = window.innerHeight + scrollY >= document.body.offsetHeight - 50;
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
  }, []);

  return { scrollDirection, isAtTop };
};
