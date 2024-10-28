import { useEffect } from 'react';
import { PanelsView } from './types/Panels.ts';

interface KeyboardShortcutProps {
  panels: PanelsView;
  update: (obj: Partial<PanelsView>) => void;
  toggle: (panel: keyof PanelsView) => void;
  close: (panel: keyof PanelsView) => void;
  open: (panel: keyof PanelsView) => void;
}

export const useKeyboardShortcuts = ({ panels, update, toggle, close, open }: KeyboardShortcutProps) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case '0':
          if (!panels.workspace) update({ workspace: 'preview', options: true });
          else toggle('options');
          break;
        case 'Escape':
          escape();
          break;
      }
    };

    const escape = () => {
      for (const [panel, isOpen] of Object.entries(panels)) {
        if (isOpen) {
          console.log('closing', panel);
          return panels.workspace
            ? close(panel as keyof PanelsView)
            : update({
              workspace: 'preview',
              [panel]: false,
            });
        }
      }
      open('workspace');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [panels, update, toggle, close, open]);
};

