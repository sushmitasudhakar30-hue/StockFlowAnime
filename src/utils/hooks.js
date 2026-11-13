import { useCallback, useEffect, useRef, useState } from 'react';

/* useReveal — IntersectionObserver-based scroll reveal.
   Uses a callback ref so it still works when the element mounts later
   (e.g. after a page's loading skeleton is replaced by real content). */
export function useReveal(options = {}) {
  const [revealed, setRevealed] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback((el) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, ...options }
    );
    observer.observe(el);
    observerRef.current = observer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [ref, revealed];
}

/* useCountUp — animate a number from 0 to target on first view */
export function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  const current = useRef(0);
  useEffect(() => {
    if (!started) return;
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current; // animate from what is on screen, not from 0
    let startTime;
    let raf;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current.current = Math.round(from + (target - from) * eased);
      setValue(current.current);
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [started, target, duration]);

  return [value, ref];
}

/* formatINR — Indian rupee formatting with en-IN grouping */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* useTheme — dark mode toggle with localStorage persistence */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('stockflow_theme_v2') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('stockflow_theme_v2', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  return { theme, toggleTheme };
}

/* Status helper for stock badges */
export function getStockStatus(totalStock, reorderLevel) {
  if (totalStock === 0) return { label: 'Out of stock', variant: 'danger' };
  if (totalStock <= reorderLevel) return { label: 'Low stock', variant: 'warning' };
  return { label: 'In stock', variant: 'success' };
}