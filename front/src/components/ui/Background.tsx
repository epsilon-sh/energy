import {FC, ReactNode} from "react";

interface BackgroundProps {
  className?: string;
  children?: ReactNode;
}

const Background: FC<BackgroundProps> = ({className, ...props}) => <div
  className={`full viewport backdrop${className ? " " + className : ""}`} {...props} />;

export default Background;
