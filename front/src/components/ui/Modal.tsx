import {FC, useEffect, useState} from "react";

interface ModalProps {
  clickOut?: boolean | (() => void);
  onClose?: () => void;
  open?: boolean;
  children?: React.ReactNode;
}

export const Modal: FC<ModalProps> = ({open = true, clickOut = true, onClose, children, ...props}) => {
  const [visible, setVisible] = useState<boolean>(open);

  const bgClick = () => {
    if (!clickOut)
      return;

    if (typeof clickOut === "function")
      clickOut();

    setVisible(false);
    onClose && onClose();
  };

  useEffect(() => {
    setVisible(open);
  }, [open]);

  return <div
    className='modal backdrop'
    style={{visibility: visible ? "visible" : "hidden"}}
    onClick={bgClick}
    {...props}>
    <div onClick={e => e.stopPropagation()}>
      {children || <p>Modal</p>}
    </div>
  </div>;
};

export default Modal;
