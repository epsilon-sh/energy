import DataOptions from "@/DataOptions";
import "./drawer.css";

import { FC, ReactNode } from "react";

interface DrawerProps {
  trackerCheckboxId: string;
  children: ReactNode;
}

const Drawer: FC<DrawerProps> = ({ trackerCheckboxId, children }) => {
  return (
    <>
      <label htmlFor={trackerCheckboxId} className="drawer-overlay">
        <DataOptions />
      </label>
      <nav className="drawer">
        {children}
      </nav>
    </>
  );
};

export default Drawer;
