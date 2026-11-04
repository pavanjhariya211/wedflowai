import { useEffect, useRef, useState } from 'react';

// Keep third-party hosting attribution visible in its own footer, never over controls.
export function HostingBadge() {
 const host = useRef<HTMLDivElement>(null);
 const [visible,setVisible] = useState(false);
 useEffect(() => {
  const style = document.createElement('style');
  style.textContent = '#wedflow-hosting-footer > iframe#nl-badge-frame{position:static !important;inset:auto !important;display:block !important;width:100% !important;height:56px !important;max-height:56px !important;transform:none !important;}';
  document.head.appendChild(style);
  const place = () => {
   const frame = document.getElementById('nl-badge-frame');
   if(frame && host.current && frame.parentElement !== host.current){host.current.appendChild(frame);setVisible(true);}
  };
  const observer = new MutationObserver(place);
  observer.observe(document.body,{childList:true,subtree:true});place();
  return () => {observer.disconnect();style.remove();};
 }, []);
 return <div id="wedflow-hosting-footer" ref={host} style={{height:visible ? 56 : 0,flexShrink:0,background:'#FCF7F5'}}/>;
}
