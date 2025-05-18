import { FC, ReactNode } from "react";
import Controls from "./Controls";
import Background from "./Background";
import { hashRoutes } from "@/types";

interface WorkspaceProps {
  className?: string;
  children?: ReactNode;
  open: boolean | typeof hashRoutes[number];
  controls?: ReactNode;
}

const Workspace: FC<WorkspaceProps> = ({ open, className = "", controls, children }) => {
  return <Background>
    <div className={`workspace${className ? " " + className : ""}`}>
      <Controls>
        {controls}
      </Controls>
      {open && children}
    </div>
  </Background>;
};

export default Workspace;
