import '/public/styles/epsilon.css'
import Background from "@ui/Background.tsx";
import Workspace from "@ui/Workspace.tsx";
import Controls from "@ui/Controls.tsx";
import Modal from "@ui/Modal.tsx";
import {FC, useState, useEffect} from "react";

const App: FC = () => {
  const [nearPane, setNearPane] = useState(false);
  const [farPane, setFarPane] = useState(false);
  const [optionsPane, setOptionsPane] = useState(false);
  const [workspace, setWorkspace] = useState(false);
  const [modal, setModal] = useState(true);

  const close = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(false);
  };

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter(prev => !prev);
  };

  const closeTop = () => {
    const panels: [boolean, React.Dispatch<React.SetStateAction<boolean>>][] = [
      [modal, setModal],
      [optionsPane, setOptionsPane],
      [farPane, setFarPane],
      [nearPane, setNearPane],
      [workspace, setWorkspace],
    ];

    close(
      panels.find(([state]) => state)?.[1]
      || setOptionsPane
    )
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!workspace && event.key === '0') {
      console.log('toggle workspace')
      return toggle(setWorkspace);
    }

    switch (event.key) {
      case '1':
        return toggle(setNearPane);
      case '2':
        return toggle(setFarPane);
      case '0':
        return toggle(setOptionsPane);
      case 'Escape':
        return closeTop();

    return;
    }
  };


  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal, optionsPane, farPane, nearPane, workspace]);

  if (!workspace) return <Controls>
      <button onClick={() => toggle(setWorkspace)}>Early access</button>
    </Controls>

  console.log({workspace})

  return <>
      <Background>
        <Modal clickOut={false}>
          <h1 className='watermark'>epsilon energy (preview)</h1>
        </Modal>
      </Background>

      <div className='full flex-col'>
        <Controls>
            {workspace
            ? <>
                <button onClick={() => toggle(setNearPane)}>1</button>
                <button onClick={() => toggle(setFarPane)}>2</button>
                <button onClick={() => toggle(setOptionsPane)}>0</button>
              </> : <button onClick={() => toggle(setWorkspace)}>0</button>}
        </Controls>

          {workspace && <Workspace>
            {nearPane && <>
                <div className='pane backdrop'>
                  <div className='card'>
                    <div className='card-header flex-row'>
                      Local Pane
                      <button className='block w-fit ml-auto' onClick={() => toggle(setNearPane)}>x close</button>
                    </div>
                  </div>
                </div>
              </>}

            {farPane && <>
                <div className='pane backdrop'>
                  <div className='card'>
                    <div className='card-header flex-row'>
                      <div className='flex'>Distant Pane</div>
                      <button className='flex w-fit ml-auto' onClick={() => toggle(setFarPane)}>x close</button>
                    </div>
                  </div>
                </div>
            </>}

            {optionsPane && <Modal><h1 className='title'>Options pane</h1></Modal>}
            {modal && <Modal><h1 className='title'>{'press <esc> to close.'}</h1></Modal>}
          </Workspace>}
      </div>
  </>
};

export default App;
