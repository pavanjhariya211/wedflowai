import { useEffect } from 'react';

// Preserve hosting attribution while keeping phone navigation tappable.
export function HostingBadge() {
 useEffect(() => {
  const style = document.createElement('style');
  style.textContent = '@media (max-width:999px){iframe#nl-badge-frame{bottom:calc(84px + env(safe-area-inset-bottom, 0px)) !important;}}';
  document.head.appendChild(style);
  return () => style.remove();
 }, []);
 return null;
}
