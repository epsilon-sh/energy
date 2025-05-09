import { FC, ReactNode } from "react";
import Controls from "./Controls";
import Background from "./Background";
import { hashRoutes } from "@/types";
import Drawer from './Drawer';

interface WorkspaceProps {
  className?: string;
  children?: ReactNode;
  open: boolean | typeof hashRoutes[number];
  controls?: ReactNode;
}

const Workspace: FC<WorkspaceProps> = ({ open, className = '', controls, children }) => {
  return <Background>
    <div className={`workspace${className ? ' ' + className : ''}`}>
      <input
        type="checkbox"
        id="drawer-toggle"
        className="drawer-toggle display-none"
      />
      <Controls>
        <label htmlFor="drawer-toggle" className="drawer-button">
          <span />
          <span />
          <span />
        </label>
        {controls}
      </Controls>
      <Drawer trackerCheckboxId="drawer-toggle" />
      {open && children}
    </div>
  </Background>
}

export default Workspace;
