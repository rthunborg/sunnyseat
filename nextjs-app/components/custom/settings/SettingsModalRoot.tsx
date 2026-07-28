'use client';

import { useSettings } from '@/lib/contexts/SettingsContext';
import { useFirstRunGuide } from '@/lib/contexts/FirstRunGuideContext';
import { SettingsModal } from './SettingsModal';
import { AppFeedbackModal } from '@/components/custom/feedback/AppFeedbackModal';

const SETTINGS_GUIDE_ROW_SELECTOR = '[data-testid="settings-row-guide"]';

/**
 * Single mount point for the settings + app-feedback modals, wired to the
 * SettingsContext. Rendered once near the root so any trigger (desktop nav,
 * mobile map controls) can open them. Each modal renders nothing while closed.
 */
export function SettingsModalRoot() {
  const { activeView, openSettings, openFeedback, close } = useSettings();
  const { startGuide } = useFirstRunGuide();
  return (
    <>
      <SettingsModal
        open={activeView === 'settings'}
        onClose={close}
        onOpenFeedback={openFeedback}
        onOpenGuide={(restoreFocusElement) => {
          startGuide({
            source: 'settings',
            initialStepId: 'pin-legend',
            persistOnDismiss: false,
            restoreFocusElement,
            restoreFocusFallback: () => {
              openSettings();
              window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLElement>(SETTINGS_GUIDE_ROW_SELECTOR)
                    ?.focus({ preventScroll: true });
                });
              });
              return true;
            },
          });
          close();
        }}
      />
      <AppFeedbackModal open={activeView === 'feedback'} onClose={close} />
    </>
  );
}
