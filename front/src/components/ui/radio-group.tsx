import {FC, HTMLProps} from "react";

export const RadioGroup: FC<HTMLProps<HTMLDivElement>> = props => <div className="radio-group">{props.children}</div>;

export const RadioGroupItem: FC<HTMLProps<HTMLInputElement>> = props => <input type="radio" {...props} />
