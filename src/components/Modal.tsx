import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

function CloseIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__content">
        <header className="modal__header">
          <h2>{title}</h2>
          <IconButton
            label="Fechar modal"
            onClick={onClose}
            className="modal__close"
            icon={<CloseIcon />}
          />
        </header>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
