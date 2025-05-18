import "/public/styles/epsilon.css";

import Workspace from "@ui/Workspace.tsx";
import Controls from "@ui/Controls.tsx";
import Modal from "@ui/Modal.tsx";
import EnergyDashboard from "./EnergyDashboard.tsx";

import { FC, useEffect } from "react";
import Settings from "./DataOptions";
import { usePanelManager } from "./PanelManager";

const App: FC = () => {
  const view = "preview";
  const { panels, toggle, close, open, escape } = usePanelManager(undefined);

  useEffect(() => {
    console.log(panels, "panels");
    const noView = Object.values(panels).every(x => !x);
    const main = document.querySelector("main")!;
    if (noView) {
      main.style.display = "block";
    } else {
      main.style.display = "none";
    }
  }, [panels]);

  return (Object.values(panels).every(x => !x))
    ? view && <Controls><button onClick={() => open("workspace")}>Early preview</button></Controls>
    : <div>
      <Workspace open={panels.workspace}
        controls={[
          <button key='options' onClick={() => toggle("options")}>Data</button>,
          <button key='close' onClick={escape}>X</button>,
        ]}>
        <EnergyDashboard />
      </Workspace>
      <Modal open={panels.options} onClose={() => close("options")}>
        <Settings />
      </Modal>
      <h1 className='watermark right'>Dashboard (preview)</h1>
    </div>;
};

export default App;
