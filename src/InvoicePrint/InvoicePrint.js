import "./InvoicePrint.css";
import { useSelector } from "react-redux";
import { formatInvoiceNumber } from "../utils/helpers";

function InvoicePrint() {
  const company = useSelector((state) => state.settings.data.company);
  const bank = useSelector((state) => state.settings.data.bank);
  const invoiceSettings = useSelector((state) => state.settings.data.invoice);
  const companyAddress = [
    company.buildingNumber || company.building_number,
    company.street,
    company.city,
    company.district,
    company.state,
  ]
    .filter(Boolean)
    .join(", ");
  const companyAddressWithPincode = company.pincode
    ? `${companyAddress} - ${company.pincode}`
    : companyAddress;
  const invoice = {
    invoiceNumber: 124,
    date: "2026-03-09",
    buyer: "Ravi Kumar",
    buyerAddress: "Madurai, Tamil Nadu, India",
    grandTotal: 820,
    cgst: 73.8,
    sgst: 73.8,
    totalAmount: 967.6,
    amountInWords: "Nine Hundred Sixty Seven Rupees and Sixty Paise Only",
    products: [
      { product: "Rice", qty: 4, price: 50, total: 200 },
      { product: "Sugar", qty: 5, price: 40, total: 200 },
      { product: "Oil", qty: 3.5, price: 120, total: 420 },
    ],
  };
  
  return (
    <div className="invoice">
      
      <div className="invoice-header">
        <div className="company">
          <h1>
            {company.companyName ||
              company.company_name ||
              company.name ||
              "SK ENTERPRISES"}
          </h1>
          <p>
            {companyAddressWithPincode ||
              company.address ||
              "NO.6/482, Krishnan Kovil Street"}{" "}
            <br />
            GSTIN: {company.gstin || "33DAWPS2421A1ZU"}
          </p>
        </div>

        <div className="invoice-title">
          <h2>TAX INVOICE</h2>
        </div>
      </div>

      
      <table className="details-table">
        <tbody>
          <tr>
            <td>
              <b>Invoice No:</b>{" "}
              {formatInvoiceNumber(invoice.invoiceNumber, invoiceSettings)}
            </td>

            <td>
              <b>Date:</b> {invoice.date}
            </td>
          </tr>
        </tbody>
      </table>

      
      <table className="details-table">
        <tbody>
          <tr>
            <td>
              <b>Buyer</b>
              <br />
              {invoice.buyer}
              <br />
              {invoice.buyerAddress}
            </td>

            <td>
              <b>Consignee</b>
              <br />
              {invoice.buyer}
              <br />
              {invoice.buyerAddress}
            </td>
          </tr>
        </tbody>
      </table>

      
      <table className="product-table">
        <thead>
          <tr>
            <th>Sl</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>

        <tbody>
          {invoice.products.map((p, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{p.product}</td>
              <td>{p.qty}</td>
              <td>{p.price}</td>
              <td>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      
      <div className="total-section">
        <table>
          <tbody>
            <tr>
              <td>Subtotal</td>
              <td>{invoice.grandTotal}</td>
            </tr>

            <tr>
              <td>CGST (9%)</td>
              <td>{invoice.cgst}</td>
            </tr>

            <tr>
              <td>SGST (9%)</td>
              <td>{invoice.sgst}</td>
            </tr>

            <tr className="total">
              <td>Grand Total (Rs.)</td>
              <td>₹ {invoice.totalAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>

      
      <div className="amount-words">
        <b>Amount in Words:</b> {invoice.amountInWords}
      </div>

      
      <div className="invoice-footer">
        <div className="bank">
          <b>Bank Details</b>
          <br />
          Bank: {bank.bankName || "Tamil Nadu Mercantile Bank"} <br />
          Account No: {bank.accountNumber || "202150050800662"} <br />
          IFSC: {bank.ifsc || "TMBL000202"}
        </div>

        <div className="signature">
          For{" "}
          {company.companyName ||
            company.company_name ||
            company.name ||
            "SK ENTERPRISES"}
          <br />
          <br />
          <br />
          Authorised Signatory
        </div>
      </div>

      
      <div className="terms">
        <b>Terms & Conditions</b>

        <p>
          {invoiceSettings.terms ||
            "1. Dispute if any shall be subject to Chennai Jurisdiction"}
        </p>
      </div>
    </div>
  );
}

export default InvoicePrint;
