import { FC, ReactNode } from "react";

interface WorkspaceProps {
  className?: string
  children?: ReactNode
}

const Workspace: FC<WorkspaceProps> = ({ className = '', ...props}) => (
  <div className={`workspace${className ? ' ' + className : ''}`} {...props} />)

export default Workspace;
