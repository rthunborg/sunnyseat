'use client';

import { useSettings } from '@/lib/contexts/SettingsContext';
import { SettingsModal } from './SettingsModal';
import { AppFeedbackModal } from '@/components/custom/feedback/AppFeedbackModal';

/**
 * Single mount point for the settings + app-feedback modals, wired to the
 * SettingsContext. Rendered once near the root so any trigger (desktop nav,
 * mobile map controls) can open them. Each modal renders nothing while closed.
 */
export function SettingsModalRoot() {
  const { activeView, openFeedback, close } = useSettings();
  return (
    <>
      <SettingsModal
        open={activeView === 'settings'}
        onClose={close}
        onOpenFeedback={openFeedback}
      />
      <AppFeedbackModal open={activeView === 'feedback'} onClose={close} />
    </>
  );
}
