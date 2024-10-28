import { useState, useEffect } from 'react';
import { PanelsView } from './types';

export const usePanelManager = (view: string | undefined) => {
  const [panels, dispatch] = useState<PanelsView>({
    modal: !!view,
    options: false,
    workspace: view as PanelsView['workspace'] || false,
  });

  const update = (obj: Partial<PanelsView>) => dispatch({ ...panels, ...obj });
  const set = (panel: keyof PanelsView, value: PanelsView[keyof PanelsView]) => update({ [panel]: value });
  const toggle = (panel: keyof PanelsView) => set(panel, !panels[panel]);
  const close = (panel: keyof PanelsView) => set(panel, false);
  const open = (panel: keyof PanelsView) => update({ workspace: true, [panel]: true });

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

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [panels]);

  return { panels, update, set, toggle, close, open, escape };
};
