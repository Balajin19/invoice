import { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./InvoiceForm.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductModal from "../Products/ProductModel";
import { invoiceApi } from "../services/api";
import { numberToWords, showErrorToast, showSuccessToast } from "../utils/helpers";

function InvoiceForm() {
  const { invoiceNumber } = useParams();
  const navigate = useNavigate();
  
  const [rows, setRows] = useState([
    { product: "", unit: "", qty: 0, price: 0, total: 0 },
  ]);
  const [error, setError] = useState("");
  
  const [id, setId] = useState(null);
  const [invoiceNumberState, setInvoiceNumberState] = useState(1);
  const [date, setDate] = useState("");
  const [customer, setCustomer] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  
  const [grandTotal, setGrandTotal] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        if (invoiceNumber) {
          const res = await invoiceApi.getByNumber(invoiceNumber);
          const invoice = res.data[0];
          if (!invoice) {
            showErrorToast("Invoice not found.");
            return;
          }

          setId(invoice.id);
          setInvoiceNumberState(invoice.invoiceNumber);
          setDate(invoice.date);
          setCustomer(invoice.customer);
          setCustomerAddress(invoice.customerAddress);
          setRows(invoice.products);
          setGrandTotal(invoice.grandTotal);
          setCgst(invoice.cgst);
          setSgst(invoice.sgst);
          setTotalAmount(invoice.totalAmount);
          setPaymentTerms(invoice.paymentTerms || "");
          setAmountInWords(invoice.amountInWords);
        } else {
          const res = await invoiceApi.list();
          const invoices = res.data;

          const maxInvoice = invoices.length
            ? Math.max(...invoices.map((i) => i.invoiceNumber))
            : 0;

          setInvoiceNumberState(maxInvoice + 1);
        }
      } catch (err) {
        console.error("Error loading invoice form data:", err);
        showErrorToast("Unable to load invoice data. Please try again.");
      }
    };

    loadData();
  }, [invoiceNumber]);
  
  const handleTabNavigation = (e, rowIndex, col) => {
    if (e.key !== "Tab" && e.key !== "Enter") return;

    e.preventDefault();

    let targetRow = rowIndex;
    let targetCol = col;

    if (col === "product") {
      targetCol = "qty";
    } else if (col === "qty") {
      targetRow = rowIndex + 1;
      targetCol = "product";
    }

    const nextCell = document.querySelector(
      `[data-row="${targetRow}"][data-col="${targetCol}"] input`,
    );

    if (nextCell) {
      setTimeout(() => nextCell.focus(), 0);
    }
  };

  const calculateTotals = (updatedRows) => {
    const grandTotal = updatedRows.reduce((sum, r) => sum + r.total, 0);

    const cgst = Number((grandTotal * 0.09).toFixed(2));
    const sgst = Number((grandTotal * 0.09).toFixed(2));

    const totalAmount = Number((grandTotal + cgst + sgst).toFixed(2));

    setGrandTotal(grandTotal);
    setCgst(cgst);
    setSgst(sgst);
    setTotalAmount(totalAmount);
    setAmountInWords(numberToWords(totalAmount));
  };
  
  const handleQtyChange = (index, value) => {
    const updatedRows = [...rows];

    let qty = Number(value);

    if (!value || isNaN(qty) || qty <= 0) {
      qty = 1;
    }

    updatedRows[index].qty = qty;
    updatedRows[index].total = qty * updatedRows[index].price;

    setRows(updatedRows);
    calculateTotals(updatedRows);
  };

  const removeRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };
  
  const handleProductSelect = (product) => {
    let updatedRows = [...rows];

    updatedRows[selectedRowIndex] = {
      product: product.productName,
      unit: product.unit,
      qty: 1,
      price: Number(product.price),
      total: Number(product.price),
    };

    if (selectedRowIndex === rows.length - 1) {
      updatedRows.push({ product: "", unit: "", qty: 0, price: 0, total: 0 });
    }

    setRows(updatedRows);

    calculateTotals(updatedRows);

    setShowProductModal(false);
    setTimeout(() => {
      const qtyInput = document.querySelector(
        `[data-row="${selectedRowIndex}"][data-col="qty"] input`,
      );

      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 100);
  };

  const validateRows = () => {
    if (!date) {
      setError("Please select invoice date");
      return false;
    }

    if (!customer || customer === "Select Customer") {
      setError("Please select customer");
      return false;
    }
    if (!customerAddress.trim()) {
      setError("Please enter customer address");
      return false;
    }

    const filledRows = rows.filter((r) => r.product !== "");

    if (filledRows.length === 0) {
      setError("Please add at least one product");
      return false;
    }

    for (let i = 0; i < filledRows.length; i++) {
      const row = filledRows[i];

      if (!row.product.trim()) {
        setError(`Row ${i + 1}: Please select a product`);
        return false;
      }

      if (!row.qty || row.qty <= 0) {
        setError(`Row ${i + 1}: Quantity must be greater than 0`);
        return false;
      }

      if (!row.price || row.price <= 0) {
        setError(`Row ${i + 1}: Invalid price`);
        return false;
      }
      if (!paymentTerms || paymentTerms < 0) {
        setError("Please enter valid payment terms");
        return false;
      }
    }

    setError("");
    return true;
  };

  const saveInvoice = async () => {
    if (!validateRows()) return;

    const filledRows = rows.filter((r) => r.product !== "");

    const invoiceData = {
      invoiceNumber: invoiceNumberState,
      date,
      customer,
      customerAddress,
      grandTotal,
      cgst,
      sgst,
      totalAmount,
      paymentTerms,
      amountInWords,
      products: filledRows,
    };

    try {
      if (invoiceNumber) {
        await invoiceApi.update(id, invoiceData);
      } else {
        await invoiceApi.create(invoiceData);
      }

      showSuccessToast(
        invoiceNumber
          ? `Invoice ${invoiceNumber} updated successfully!`
          : `Invoice ${invoiceNumberState} saved successfully!`,
      );

      navigate("/invoice-list");
    } catch (err) {
      console.error("Save error:", err);
      showErrorToast("Error saving invoice. Please try again.");
    }
  };
  return (
    <div className="container mt-4 mb-4">
      <h2>{invoiceNumber ? "Edit Invoice" : "New Invoice"}</h2>

      {error && <div className="alert alert-danger">{error}</div>}

      <p>
        <b>Invoice No:</b> {invoiceNumberState}
      </p>

      <input
        type="date"
        className="form-control mb-3"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <div className="mb-3">
        <label>Customer</label>

        <select
          className="form-select"
          value={customer}
          onChange={(e) => {
            setCustomer(e.target.value);
            setCustomerAddress("Chennai, Tamil Nadu, India");
            setTimeout(() => {
              const firstProductCell = document.querySelector(
                `[data-row="0"][data-col="product"] input`,
              );

              if (firstProductCell) {
                firstProductCell.focus();
              }
            }, 100);
          }}
        >
          <option>Select Customer</option>
          <option>Customer One</option>
          <option>Customer Two</option>
        </select>
      </div>

      <textarea
        className="form-control mb-4"
        rows="3"
        value={customerAddress}
        onChange={(e) => setCustomerAddress(e.target.value)}
      />

      <h4>Products</h4>

      <table className="table table-bordered table-hover">
        <thead className="table-light">
          <tr>
            <th>S.No</th>
            <th>Product</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={{ cursor: "default" }}>
              <td>{index + 1}</td>
              <td data-row={index} data-col="product">
                <input
                  type="text"
                  className="form-control"
                  value={row.product}
                  placeholder="Click or type product"
                  onClick={() => {
                    setSelectedRowIndex(index);
                    setProductSearch(rows[index].product || "");
                    setIsEditingProduct(true);
                    setShowProductModal(true);
                  }}
                  onKeyDown={(e) => {
                    const key = e.key;

                    handleTabNavigation(e, index, "product");
                    if (key === "ArrowDown") {
                      e.preventDefault();
                      const next = document.querySelector(
                        `[data-row="${index + 1}"][data-col="product"] input`,
                      );
                      if (next) next.focus();
                      return;
                    }

                    if (key === "ArrowUp") {
                      e.preventDefault();
                      const prev = document.querySelector(
                        `[data-row="${index - 1}"][data-col="product"] input`,
                      );
                      if (prev) prev.focus();
                      return;
                    }

                    if (key === "Backspace") {
                      e.preventDefault();

                      setSelectedRowIndex(index);

                      const existingText = rows[index].product || "";

                      setProductSearch(existingText.slice(0, -1));
                      setIsEditingProduct(true);
                      setShowProductModal(true);

                      return;
                    }

                    const allowedKeys = [
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      "Enter",
                    ];

                    if (!allowedKeys.includes(key) && key.length === 1) {
                      e.preventDefault();
                      setSelectedRowIndex(index);

                      setProductSearch(key);
                      setIsEditingProduct(false);

                      setShowProductModal(true);
                    }
                  }}
                />
              </td>

              <td>{row.unit}</td>

              <td data-row={index} data-col="qty">
                <input
                  type="number"
                  className="qty-input"
                  value={row.qty}
                  min="1"
                  disabled={!row.product}
                  onChange={(e) => handleQtyChange(index, e.target.value)}
                  onKeyDown={(e) => handleTabNavigation(e, index, "qty")}
                />
              </td>

              <td>{row.price}</td>

              <td>
                {row.product && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => removeRow(index)}
                  >
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h5>Grand Total: ₹ {grandTotal}</h5>
      <h6>CGST 9%: ₹ {cgst}</h6>
      <h6>SGST 9%: ₹ {sgst}</h6>
      <h4>Total: ₹ {totalAmount}</h4>
      <div className="mb-3">
        <label>Payment Terms (Days)</label>
        <input
          type="number"
          className="form-control"
          placeholder="Enter payment terms (e.g. 30)"
          value={paymentTerms}
          min="0"
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
      </div>
      <p>
        <b>Amount in Words:</b> {amountInWords}
      </p>

      <button className="btn btn-success" onClick={saveInvoice}>
        {invoiceNumber ? "Update Invoice" : "Save Invoice"}
      </button>

      <Link to="/invoice-list" className="btn btn-secondary ms-2">
        Cancel
      </Link>

      <ProductModal
        show={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSelect={handleProductSelect}
        initialSearch={productSearch}
        isEditing={isEditingProduct}
        selectedProducts={rows.map((r) => r.product)}
      />
    </div>
  );
}

export default InvoiceForm;
