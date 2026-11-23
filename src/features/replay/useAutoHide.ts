import { useCallback, useEffect, useRef, useState } from 'react';

/** Like a video player: the controls show on any activity and hide after a few seconds without */
export function useAutoHide(delayMs = 3000) {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(() => {
    setVisible(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setVisible(false);
  }, []);

  // Visible on opening, then hidden after the delay like after any activity
  useEffect(() => {
    timer.current = setTimeout(() => setVisible(false), delayMs);
    return () => clearTimeout(timer.current);
  }, [delayMs]);

  return { visible, show, toggle: visible ? hide : show };
}
