import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { invoiceApi } from "../services/api";
import "./InvoiceList.css";
import {
  confirmAndHandleDelete,
  formatInvoiceNumber,
  showErrorToast,
} from "../utils/helpers";

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [hasInvoicesLoadError, setHasInvoicesLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printOrientation, setPrintOrientation] = useState("P");
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const searchInputRef = useRef(null);
  const invoiceSettings = useSelector((state) => state.settings?.data?.invoice);
  const { requestConfirmation, ConfirmModal } = useConfirmModal();

  const isInvoiceActive = (invoice) => invoice?.isActive === true;

  const fetchInvoices = useCallback(async () => {
    setIsLoadingInvoices(true);

    try {
      const res = await invoiceApi.list();
      setInvoices(
        Array.isArray(res?.data) ? res.data.filter(isInvoiceActive) : [],
      );
      setHasInvoicesLoadError(false);
    } catch (error) {
      console.error("Error loading invoices:", error);
      setHasInvoicesLoadError(true);
      showErrorToast("Unable to load invoices. Please try again.");
    } finally {
      setIsLoadingInvoices(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (!isLoadingInvoices && !hasInvoicesLoadError && invoices.length > 0) {
      searchInputRef.current?.focus();
    }
  }, [isLoadingInvoices, hasInvoicesLoadError, invoices.length]);

  const handlePrint = async (invoiceId, invoiceNumber, orientation = "P") => {
    const formattedInvoiceNumber = formatInvoiceNumber(
      invoiceNumber,
      invoiceSettings,
    );

    try {
      const res = await invoiceApi.getPdf(invoiceId, orientation);
      if (!res?.data) {
        throw new Error("Empty PDF response");
      }

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (!printWindow) {
        // Fallback when popup is blocked: trigger download.
        const link = document.createElement("a");
        link.href = url;
        link.download = `${formattedInvoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => window.URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      showErrorToast("Unable to generate invoice PDF. Please try again.");
    }
  };

  const openPrintDialog = (invoiceId, invoiceNumber) => {
    setInvoiceToPrint({ invoiceId, invoiceNumber });
    setPrintOrientation("P");
    setShowPrintDialog(true);
  };

  const closePrintDialog = () => {
    setShowPrintDialog(false);
    setInvoiceToPrint(null);
    setPrintOrientation("P");
  };

  const confirmPrint = async () => {
    if (!invoiceToPrint) {
      return;
    }

    const { invoiceId, invoiceNumber } = invoiceToPrint;
    closePrintDialog();
    await handlePrint(invoiceId, invoiceNumber, printOrientation);
  };

  const handleDelete = async (invoiceId, invoiceNumber) => {
    const formattedInvoiceNumber = formatInvoiceNumber(
      invoiceNumber,
      invoiceSettings,
    );

    await confirmAndHandleDelete({
      confirmMessage: (
        <>
          Are you sure you want to delete invoice{" "}
          <strong>{formattedInvoiceNumber}</strong>?
        </>
      ),
      confirmAction: (message) =>
        requestConfirmation({
          title: "Delete Invoice",
          message,
          confirmText: "Delete",
          cancelText: "Cancel",
        }),
      deleteAction: () => invoiceApi.remove(invoiceId),
      onSuccess: fetchInvoices,
      successMessage: `Invoice ${formattedInvoiceNumber} deleted successfully!`,
      errorMessage: "Unable to delete invoice. Please try again.",
    });
  };

  const filteredInvoices = invoices.filter((invoice) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const formattedNum = formatInvoiceNumber(
      invoice.invoiceNumber,
      invoiceSettings,
    ).toLowerCase();

    return (
      (invoice.customerName || "").toLowerCase().includes(q) ||
      formattedNum.includes(q)
    );
  });

  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">Invoice List</h2>
      {!isLoadingInvoices && !hasInvoicesLoadError && invoices.length > 0 && (
        <div className="mb-3 invoice-search-container">
          <input
            ref={searchInputRef}
            type="text"
            className="form-control invoice-search-input"
            placeholder="Search by customer name or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      {!isLoadingInvoices &&
        (hasInvoicesLoadError ? (
          <div className="alert alert-danger mt-3">
            Unable to load invoices. Please try again after some time.
          </div>
        ) : invoices.length === 0 ? (
          <p>
            No invoices found. Please <Link to="/create-invoice">create</Link>{" "}
            an invoice.
          </p>
        ) : filteredInvoices.length === 0 ? (
          <p>No invoice found.</p>
        ) : (
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.map((invoice, index) => {
                const formattedInvoiceNumber = formatInvoiceNumber(
                  invoice.invoiceNumber,
                  invoiceSettings,
                );
                const formattedInvoiceDate = invoice?.invoiceDate
                  ? invoice.invoiceDate.split("T")[0]
                  : "-";
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{formattedInvoiceNumber}</td>
                    <td>{formattedInvoiceDate}</td>
                    <td>{invoice.customerName}</td>
                    <td>₹{invoice.totalAmount}</td>
                    <td className="d-flex align-items-center gap-3">
                      <Link to={`/invoice/${invoice.invoiceId}`}>
                        <i
                          className="bi bi-eye text-primary"
                          title="View Invoice"
                          style={{ cursor: "pointer" }}
                        ></i>
                      </Link>
                      <i
                        className="bi bi-printer text-success"
                        title="Print Invoice"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          openPrintDialog(
                            invoice.invoiceId,
                            invoice.invoiceNumber,
                          )
                        }
                      ></i>
                      <i
                        className="bi bi-trash text-danger"
                        title="Delete Invoice"
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          handleDelete(invoice.invoiceId, invoice.invoiceNumber)
                        }
                      ></i>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
      {!isLoadingInvoices && (
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      )}

      {showPrintDialog && (
        <div className="invoice-print-dialog-backdrop">
          <div className="invoice-print-dialog card shadow-sm border-0">
            <div className="card-header bg-light fw-bold">
              Choose PDF Orientation
            </div>
            <div className="card-body">
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="radio"
                  name="invoicePrintOrientation"
                  id="invoicePrintOrientationVertical"
                  checked={printOrientation === "P"}
                  onChange={() => setPrintOrientation("P")}
                />
                <label
                  className="form-check-label"
                  htmlFor="invoicePrintOrientationVertical"
                >
                  Vertical
                </label>
              </div>

              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="radio"
                  name="invoicePrintOrientation"
                  id="invoicePrintOrientationHorizontal"
                  checked={printOrientation === "L"}
                  onChange={() => setPrintOrientation("L")}
                />
                <label
                  className="form-check-label"
                  htmlFor="invoicePrintOrientationHorizontal"
                >
                  Horizontal
                </label>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closePrintDialog}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmPrint}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal />
    </div>
  );
}

export default InvoiceList;
