import '/public/styles/epsilon.css'

import Workspace from "@ui/Workspace.tsx";
import Controls from "@ui/Controls.tsx";
import Drawer from '@ui/Drawer';
import Modal from "@ui/Modal.tsx";
import EnergyDashboard from "./EnergyDashboard.tsx";

import { FC, useEffect } from "react";
import Settings from './DataOptions';
import { usePanelManager } from './PanelManager';
import MeteringPoints from './MeteringPoints.tsx';
import { useSearchParams } from 'react-router-dom';

const App: FC = () => {
  const view = 'preview';
  const { panels, toggle, close, open, escape } = usePanelManager(undefined);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMeteringPoint = searchParams.get("meteringPoint") || "SYSTEM";

  useEffect(() => {
    console.log(panels, 'panels')
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
      <input
        type="checkbox"
        id="drawer-toggle"
        className="drawer-toggle display-none"
      />
      <Workspace open={panels.workspace}
        controls={[
          <label htmlFor="drawer-toggle" className="drawer-button" key="drawer-button">
            <span />
            <span />
            <span />
          </label>,
          <input className="drawer-title" key="currentMeteringView" disabled value={selectedMeteringPoint} />,
          <button key='close' onClick={escape}>X</button>,
        ]}>
        <Drawer trackerCheckboxId="drawer-toggle">
          <MeteringPoints selectedMeteringPoint={selectedMeteringPoint} />
        </Drawer>
        <EnergyDashboard />
      </Workspace>
      <Modal open={panels.options} onClose={() => close('options')}>
        <Settings />
      </Modal>
      <h1 className='watermark right'>Dashboard (preview)</h1>
    </div>
};

export default App;
