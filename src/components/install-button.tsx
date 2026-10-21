'use client';

import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIosHint(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      clearTimeout(hideTimer.current);
    };
  }, []);

  async function handleClick() {
    if (installEvent) {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') setInstallEvent(null);
      return;
    }
    if (iosHint) {
      setShowHint(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setShowHint(false), 6000);
    }
  }

  if (!installEvent && !iosHint) return null;

  return <span className="nav-install-wrap">
    <button
      className="nav-install"
      type="button"
      aria-label="安装应用"
      title="安装应用"
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
    </button>
    {iosHint && showHint && <span className="nav-install-hint" role="status">在 Safari 底部点「分享」→「添加到主屏幕」即可安装</span>}
  </span>;
}
