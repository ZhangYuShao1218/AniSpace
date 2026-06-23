import { useEffect, useRef } from 'react';
import { useAdMob } from '@/contexts/AdMobContext';

export function useGlobalKeyboardFix() {
  const { hideAd, showAd } = useAdMob();
  const isKeyboardOpen = useRef(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (!isKeyboardOpen.current) {
          isKeyboardOpen.current = true;
          document.body.classList.add('keyboard-open');
          hideAd();
        }

        // Wait for keyboard to animate up, then scroll to center
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // If focus moves to another input immediately, focusout fires before focusin.
        // We use a small timeout to check if an input is still focused.
        setTimeout(() => {
          const activeEl = document.activeElement;
          const isInputStillFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
          
          if (!isInputStillFocused && isKeyboardOpen.current) {
            isKeyboardOpen.current = false;
            document.body.classList.remove('keyboard-open');
            showAd();
          }
        }, 50);
      }
    };

    // Listen to focus changes
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (isKeyboardOpen.current) {
        document.body.classList.remove('keyboard-open');
        showAd();
      }
    };
  }, [hideAd, showAd]);
}
