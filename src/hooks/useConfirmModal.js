import { useEffect, useRef, useState } from "react";

const defaultDialog = {
  isOpen: false,
  title: "Confirm Action",
  message: "Are you sure you want to continue?",
  confirmText: "Confirm",
  cancelText: "Cancel",
};

export const useConfirmModal = () => {
  const resolverRef = useRef(null);
  const closeButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const [dialog, setDialog] = useState(defaultDialog);
  
  useEffect(() => {
    if (!dialog.isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableButtons = [
        closeButtonRef.current,
        cancelButtonRef.current,
        confirmButtonRef.current,
      ].filter(Boolean);

      if (focusableButtons.length === 0) return;

      const direction = event.shiftKey ? -1 : 1;
      let nextIndex = focusableButtons.indexOf(document.activeElement);
      nextIndex = nextIndex === -1 ? 0 : nextIndex + direction;

      if (nextIndex < 0) nextIndex = focusableButtons.length - 1;
      if (nextIndex >= focusableButtons.length) nextIndex = 0;

      event.preventDefault();
      focusableButtons[nextIndex].focus();
    };

    document.addEventListener("keydown", handleKeyDown);
  
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dialog.isOpen]);

  const closeDialog = (result) => {
    setDialog((prev) => ({ ...prev, isOpen: false }));

    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const requestConfirmation = ({
    title = "Confirm Action",
    message = "Are you sure you want to continue?",
    confirmText = "Confirm",
    cancelText = "Cancel",
  } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
      });
    });
  };

  const ConfirmModal = () => {
    if (!dialog.isOpen) return null;
  
    return (
      <>
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 id="confirm-modal-title" className="modal-title">
                  {dialog.title}
                </h5>
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => closeDialog(false)}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-0">{dialog.message}</p>
              </div>

              <div className="modal-footer">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelText}
                </button>
                <button
                  ref={confirmButtonRef}
                  type="button"
                  className="btn btn-danger"
                  onClick={() => closeDialog(true)}
                >
                  {dialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show"></div>
      </>
    );
  };

  return {
    requestConfirmation,
    ConfirmModal,
  };
};
