import '/public/styles/epsilon.css'

import Workspace from "@ui/Workspace.tsx";
import Controls from "@ui/Controls.tsx";
import Modal from "@ui/Modal.tsx";
import EnergyDashboard from "./EnergyDashboard.tsx";

import { FC, useEffect } from "react";
// import { useHash } from 'react-use'
import Settings from './DataOptions';
// import { Braces } from 'lucide-react';
import { usePanelManager } from './PanelManager';
// import { hashRoutes } from './types';

const App: FC = () => {
  // const [hash] = useHash();
  // const view = hashRoutes.find(x => x === hash.slice(1));
  const view = 'preview';
  const { panels, toggle, close, open } = usePanelManager(view);

  useEffect(() => {
    console.log({view, panels});
    const noView = Object.values(panels).every(x => !x)
    const main = document.querySelector('main')!
    if (noView) {
      main.style.display = 'block';
    } else {
      main.style.display = 'none';
    }
  }, [panels]);

  return (Object.values(panels).every(x => !x))
    ? view && <Controls><button onClick={() => open('workspace')}>Early preview</button></Controls>
    : <div>
      <Workspace open={panels.workspace}
        controls={[
        // App close button
        // Data management button
        <button key='options' onClick={() => toggle('options')}>Data</button>,
        <button key='close' onClick={() => close('workspace')}>X</button>,
        ]}>
        <EnergyDashboard />
      </Workspace>
      <Modal open={panels.options} onClose={() => close('options')}>
        <Settings />
      </Modal>
      {/* <Modal open={panels.modal} onClose={() => close('modal')}>
        <h1 className='title noselect relative top-2/5 translate-y-1/2'>{'press <esc> to close.'}</h1>
      </Modal> */}
      <h1 className='watermark right'>Dashboard (preview)</h1>
    </div>
};

export default App;
