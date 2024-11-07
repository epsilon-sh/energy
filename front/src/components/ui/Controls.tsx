import {FC, ReactNode} from "react";

interface ControlProps {
  className?: string;
  children?: ReactNode;
}

const Controls: FC<ControlProps> = ({className, ...props}) => <div
  className={`controls${!className ? '' : ' ' + className}`} {...props} />

export default Controls
