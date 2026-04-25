import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import "bootstrap/dist/css/bootstrap.min.css";
import { Slide } from "react-toastify";
import "./InvoiceForm.css";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInputGridNavigation } from "../hooks/useInputGridNavigation";
import ProductModal from "../Products/ProductModel";
import { customerApi, invoiceApi, settingsApi, unitApi } from "../services/api";
import { fetchCompanies } from "../store/companies";
import { fetchBanks } from "../store/banks";
import {
  formatInvoiceNumber,
  getFinancialYearLabel,
  getPaymentTermDays,
  formatAddress,
  numberToWords,
  showErrorToast,
  showSuccessToast,
} from "../utils/helpers";

function InvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const companiesLoaded = useSelector((state) => state.companies?.loaded);
  const banksLoaded = useSelector((state) => state.banks?.loaded);
  const invoiceSettingsLoaded = useSelector(
    (state) => state.invoiceSettings?.loaded,
  );
  const companyList = useSelector((state) => state.companies?.data || []);

  const bankList = useSelector((state) => state.banks?.data || []);
  const invoiceSettings = useSelector(
    (state) =>
      state.invoiceSettings?.data || state.settings?.data?.invoice || {},
  );
  const companySettings =
    companyList.find((company) => company?.isPrimary) || companyList[0] || {};
  const hasCompany = companyList.length > 0;
  const hasPrimaryCompany = companyList.some((company) => company?.isPrimary);

  const bankSettings =
    bankList.find((bankItem) => bankItem?.isPrimary) || bankList[0] || {};
  const hasBank = bankList.length > 0;
  const hasPrimaryBank = bankList.some((bankItem) => bankItem?.isPrimary);
  const hasCompleteInvoiceSettings =
    Boolean(invoiceSettings?.prefix?.trim()) &&
    Boolean(invoiceSettings?.startNumber) &&
    Number(invoiceSettings?.startNumber) >= 1 &&
    invoiceSettings?.currentNumber !== undefined &&
    invoiceSettings?.currentNumber !== null &&
    invoiceSettings?.currentNumber !== "";
  const invoiceSetupIssues = [];
  if (!hasCompany) {
    invoiceSetupIssues.push("Create at least one company");
  } else {
    if (!hasPrimaryCompany) {
      invoiceSetupIssues.push("Set one company as primary");
    }
    if (!hasBank) {
      invoiceSetupIssues.push("Add at least one bank account");
    } else if (!hasPrimaryBank) {
      invoiceSetupIssues.push("Set one bank account as primary");
    }
    if (!hasCompleteInvoiceSettings) {
      invoiceSetupIssues.push(
        "Complete invoice settings (Prefix, Start Number, Current Number)",
      );
    }
  }
  const isSetupDataReady =
    Boolean(companiesLoaded) &&
    Boolean(banksLoaded) &&
    (companyList.length === 0 || Boolean(invoiceSettingsLoaded));
  const shouldBlockNewInvoice =
    !id && isSetupDataReady && invoiceSetupIssues.length > 0;
  const sellerName = companySettings.companyName || "";
  const sellerAddressWithPincode = formatAddress({
    buildingNumber: companySettings.buildingNumber || "",
    street: companySettings.street || "",
    city: companySettings.city || "",
    district: companySettings.district || "",
    state: companySettings.state || "",
    pincode: companySettings.pincode || "",
  });
  const sellerGstIn = companySettings.gstin || "";
  const sellerEmail = companySettings.email || "";
  const sellerMobile = companySettings.mobileNumber || "";
  const sellerState = (companySettings.state || "").toString().trim();

  const accountName = bankSettings.accountName || "";
  const bankName = bankSettings.bankName || "";
  const accountNo = bankSettings.accountNumber || "";
  const ifsc = bankSettings.ifsc || "";
  const branch = bankSettings.branch || bankSettings.branchName || "";
  const upi = bankSettings.upi || "";
  const defaultCgstRate =
    Number(companySettings?.cgstRate ?? companySettings?.cgst) || 0;
  const defaultSgstRate =
    Number(companySettings?.sgstRate ?? companySettings?.sgst) || 0;
  const defaultIgstRate =
    Number(companySettings?.igstRate ?? companySettings?.igst) || 0;

  const emptyRow = {
    productId: "",
    productName: "",
    hsnSac: "",
    unitId: "",
    unit: "",
    qty: "0.00",
    price: 0,
    discount: "0.00",
    cgstRate: "0.00",
    sgstRate: "0.00",
    igstRate: "0.00",
    total: 0,
  };
  const {
    setRef,
    focusCell,
    handleSequentialNavigation,
    handleVerticalNavigation,
  } = useInputGridNavigation([
    "qty",
    "discount",
    "cgstRate",
    "sgstRate",
    "igstRate",
  ]);

  const [invoiceId, setInvoiceId] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState(1);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [gstIn, setGstIn] = useState("");
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([emptyRow]);

  const [subTotal, setSubTotal] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(0);
  const [amountInWords, setAmountInWords] = useState("Zero Rupees Only");
  const [roundedOff, setRoundedOff] = useState(0);
  const [useLoadedInvoiceTotals, setUseLoadedInvoiceTotals] = useState(false);

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const companyListRef = useRef(companyList);
  const bankListRef = useRef(bankList);
  const unitsRef = useRef([]);
  const customersRef = useRef([]);

  useEffect(() => {
    companyListRef.current = companyList;
  }, [companyList]);

  useEffect(() => {
    bankListRef.current = bankList;
  }, [bankList]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    customersRef.current = customers;
  }, [customers]);

  useEffect(() => {
    const loadInvoiceForm = async () => {
      setIsInitialLoading(true);

      try {
        // Fetch banks only when selector is empty to avoid unnecessary calls.
        if (!bankListRef.current.length) {
          try {
            const fetchedBanks = await dispatch(fetchBanks());
            if (Array.isArray(fetchedBanks)) {
              bankListRef.current = fetchedBanks;
            }
          } catch (error) {
            console.error("InvoiceForm: Failed to fetch banks", error);
            if (!bankListRef.current.length) {
              showErrorToast(
                "Unable to load bank details. Please check Settings and try again.",
                Slide,
              );
            }
          }
        }

        let unitsData = unitsRef.current;
        if (!unitsData.length) {
          const unitsRes = await unitApi.list();
          unitsData = unitsRes.data || [];
          setUnits(unitsData);
        }

        if (id) {
          const res = await invoiceApi.getById(id);
          const invoice = res.data;
          if (!invoice) {
            showErrorToast("Invoice not found.", Slide);
            return;
          }

          setInvoiceId(invoice.invoiceId);
          setInvoiceNumber(invoice.invoiceNumber);
          setInvoiceDate(invoice.invoiceDate.split("T")[0]);
          setPoNumber(invoice.poNumber || "");
          setPoDate(
            invoice.poDate
              ? invoice.poDate.split("T")[0]
              : invoice.po_date
                ? invoice.po_date.split("T")[0]
                : "",
          );
          setCustomerId(invoice.customerId);
          setCustomerName(invoice.customerName || "");
          setCustomerAddress(invoice.customerAddress || "");
          setGstIn(invoice.gstIn || "");
          setSelectedProducts(
            (invoice.products || []).map((product) => ({
              ...product,
              qty: Number(product.qty ?? 0).toFixed(2),
              unitId:
                product.unitId ||
                (unitsData || []).find(
                  (unitItem) => unitItem.unitName === product.unit,
                )?.unitId ||
                "",
              discount: Number(
                (product.discount ?? product.discPercent) || 0,
              ).toFixed(2),
              cgstRate: Number(product.cgstRate ?? 0).toFixed(2),
              sgstRate: Number(product.sgstRate ?? 0).toFixed(2),
              igstRate: Number(product.igstRate ?? 0).toFixed(2),
              total:
                Number(product.total) ||
                Number(product.qty || 0) * Number(product.price || 0),
            })),
          );
          setSubTotal(Number(invoice.subTotal) || 0);
          setCgst(Number(invoice.cgst) || 0);
          setSgst(Number(invoice.sgst) || 0);
          setIgst(Number(invoice.igst) || 0);
          setTotalAmount(invoice.totalAmount);
          setRoundedOff(Number(invoice.roundedOff ?? invoice.roundedOff) || 0);
          setUseLoadedInvoiceTotals(true);
          setPaymentTerms(getPaymentTermDays(invoice.paymentTerms));
          setAmountInWords(invoice.amountInWords);

          if (invoice.customerId) {
            let customerDataList = customersRef.current;
            if (!customerDataList.length) {
              const customerRes = await customerApi.list();
              customerDataList = customerRes.data || [];
              setCustomers(customerDataList);
            }

            const customerData = customerDataList.find(
              (customer) => customer.customerId === invoice.customerId,
            );
            setProducts(customerData?.products || []);
            setCustomerState(
              (customerData?.address?.state || "").toString().trim(),
            );
          }
        } else {
          let latestCompanies = companyListRef.current;

          if (!latestCompanies.length) {
            try {
              latestCompanies = await dispatch(fetchCompanies());
            } catch (error) {
              console.error("InvoiceForm: Failed to fetch companies", error);
              latestCompanies = [];
            }
          }

          let customerDataList = customersRef.current;
          if (!customerDataList.length) {
            const customerRes = await customerApi.list();
            customerDataList = customerRes.data || [];
            setCustomers(customerDataList);
          }

          const currentCompanySettings =
            companyListRef.current.find((company) => company?.isPrimary) ||
            companyListRef.current[0] ||
            {};
          const selectedCompany =
            latestCompanies.find((company) => company?.isPrimary) ||
            latestCompanies[0] ||
            currentCompanySettings;
          const companyId = String(
            selectedCompany?.companyId || selectedCompany?.id || "",
          );

          if (companyId) {
            try {
              const res = await settingsApi.getInvoiceSettings(companyId);
              const raw = res?.data?.invoice || res?.data || {};
              const startNumber = Number(raw?.startNumber) || 1;
              const currentNumber = Number(raw?.currentNumber) || 0;
              setInvoiceNumber(Math.max(startNumber, currentNumber + 1));
            } catch (error) {
              console.error(
                "InvoiceForm: Failed to fetch invoice settings",
                error,
              );
            }
          }

          setUseLoadedInvoiceTotals(false);
          setCustomers(customerDataList);
        }
      } catch (err) {
        console.error("Error loading invoice form data:", err);
        showErrorToast("Unable to load invoice data. Please try again.", Slide);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadInvoiceForm();
  }, [id, dispatch]);

  const normalizeStateName = (value = "") =>
    String(value)
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const normalizedCustomerState = normalizeStateName(customerState);
  const normalizedSellerState = normalizeStateName(sellerState);

  const isInterState =
    Boolean(normalizedCustomerState) &&
    Boolean(normalizedSellerState) &&
    normalizedCustomerState !== normalizedSellerState;

  const calculateTotals = useCallback((updatedProducts) => {
    const subTotal = Number(
      Number(
        updatedProducts.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
      ).toFixed(2),
    );

    const cgst = Number(
      updatedProducts
        .reduce(
          (sum, r) =>
            sum + ((Number(r.total) || 0) * (Number(r.cgstRate) || 0)) / 100,
          0,
        )
        .toFixed(2),
    );
    const sgst = Number(
      updatedProducts
        .reduce(
          (sum, r) =>
            sum + ((Number(r.total) || 0) * (Number(r.sgstRate) || 0)) / 100,
          0,
        )
        .toFixed(2),
    );
    const igst = Number(
      updatedProducts
        .reduce(
          (sum, r) =>
            sum + ((Number(r.total) || 0) * (Number(r.igstRate) || 0)) / 100,
          0,
        )
        .toFixed(2),
    );
    const totalBeforeRound =
      Number(subTotal) + Number(cgst) + Number(sgst) + Number(igst);
    const totalAmount = Math.round(totalBeforeRound);
    const roundedOff = Number((totalAmount - totalBeforeRound).toFixed(2));

    setSubTotal(subTotal);
    setCgst(cgst);
    setSgst(sgst);
    setIgst(igst);
    setTotalAmount(totalAmount);
    setRoundedOff(roundedOff);
    setAmountInWords(numberToWords(totalAmount));
  }, []);

  useEffect(() => {
    if (useLoadedInvoiceTotals) return;
    calculateTotals(selectedProducts);
  }, [selectedProducts, useLoadedInvoiceTotals, calculateTotals]);

  const handleQtyChange = (index, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index].qty = value;
    const qty = Number(value) || 0;
    const price = Number(updatedProducts[index].price) || 0;
    const discount = Number(updatedProducts[index].discount) || 0;
    const totalBeforeDiscount = qty * price;
    updatedProducts[index].total = Number(
      (totalBeforeDiscount - totalBeforeDiscount * (discount / 100)).toFixed(2),
    );
    setSelectedProducts(updatedProducts);
    setUseLoadedInvoiceTotals(false);
    calculateTotals(updatedProducts);
  };

  const handleDiscChange = (index, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index].discount = value;
    const discount = Math.min(Math.max(Number(value) || 0, 0), 100);
    const qty = Number(updatedProducts[index].qty) || 0;
    const price = Number(updatedProducts[index].price) || 0;
    const totalBeforeDiscount = qty * price;
    updatedProducts[index].total = Number(
      (totalBeforeDiscount - totalBeforeDiscount * (discount / 100)).toFixed(2),
    );
    setSelectedProducts(updatedProducts);
    setUseLoadedInvoiceTotals(false);
    calculateTotals(updatedProducts);
  };

  const handleTaxRateChange = (index, field, value) => {
    const updatedProducts = [...selectedProducts];
    updatedProducts[index][field] = value;
    setSelectedProducts(updatedProducts);
    setUseLoadedInvoiceTotals(false);
    calculateTotals(updatedProducts);
  };

  const handleNumericBlur = (index, field, minVal = 0, maxVal = Infinity) => {
    const updatedProducts = [...selectedProducts];
    let num = Number(updatedProducts[index][field]);
    if (isNaN(num) || num < minVal) num = minVal;
    if (num > maxVal) num = maxVal;
    updatedProducts[index][field] = num.toFixed(2);
    setSelectedProducts([...updatedProducts]);
  };

  const handleUnitChange = (index, value) => {
    const updatedProducts = [...selectedProducts];
    const selectedUnit = units.find((unitItem) => unitItem.unitId === value);
    updatedProducts[index].unitId = value;
    updatedProducts[index].unit = selectedUnit?.unitName || "";
    setSelectedProducts(updatedProducts);
  };

  const addRow = () => {
    setSelectedProducts((prev) => [...prev, { ...emptyRow }]);

    setTimeout(() => {
      focusCell(selectedProducts.length, "product");
    }, 0);
  };

  const removeRow = (index) => {
    const updatedProducts = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updatedProducts);
    setUseLoadedInvoiceTotals(false);
    calculateTotals(updatedProducts);
  };

  const handleProductSelect = (product) => {
    let updatedProducts = [...selectedProducts];
    const price = Number(product.price) || 0;
    const selectedUnit = units.find(
      (unitItem) =>
        unitItem.unitId === product.unitId ||
        unitItem.unitName === product.unit,
    );

    updatedProducts[selectedRowIndex] = {
      productId: product.productId,
      productName: product.productName,
      hsnSac: product.hsnSac || "",
      unitId: product.unitId || selectedUnit?.unitId || "",
      unit: selectedUnit?.unitName || product.unit || "",
      qty: (1).toFixed(2),
      price,
      discount: (0).toFixed(2),
      cgstRate: (isInterState ? 0 : defaultCgstRate).toFixed(2),
      sgstRate: (isInterState ? 0 : defaultSgstRate).toFixed(2),
      igstRate: (isInterState ? defaultIgstRate : 0).toFixed(2),
      total: price,
    };

    if (selectedRowIndex === selectedProducts.length - 1) {
      updatedProducts.push(emptyRow);
    }
    setSelectedProducts(updatedProducts);

    setUseLoadedInvoiceTotals(false);
    calculateTotals(updatedProducts);

    setShowProductModal(false);
    setTimeout(() => {
      focusCell(selectedRowIndex, "qty");
    }, 100);
  };

  const handleCustomerChange = (id) => {
    const selectedCustomer = customers.find((c) => c.customerId === id);
    setCustomerId(selectedCustomer?.customerId || "");
    setCustomerName(selectedCustomer?.customerName || "");
    setCustomerState(
      (selectedCustomer?.address?.state || "").toString().trim(),
    );
    setCustomerAddress(formatAddress(selectedCustomer?.address || {}));
    setGstIn(selectedCustomer?.gstIn || "");
    setProducts(selectedCustomer?.products || []);
    setSelectedProducts([emptyRow]);
    setUseLoadedInvoiceTotals(false);

    setTimeout(() => focusCell(0, "product"), 100);
  };

  const validateRows = () => {
    if (!invoiceDate) {
      showErrorToast("Please select invoice date");
      return false;
    }

    if (!customerId || customerName === "Select Customer") {
      showErrorToast("Please select customer");
      return false;
    }
    if (!customerAddress.trim()) {
      showErrorToast("Please enter customer address");
      return false;
    }

    const filledProductRows = selectedProducts.filter(
      (r) => r.productName !== "",
    );

    if (filledProductRows.length === 0) {
      showErrorToast("Please add at least one product");
      return false;
    }

    for (let i = 0; i < filledProductRows.length; i++) {
      const row = filledProductRows[i];

      if (!(row.productName || row.product || "").trim()) {
        showErrorToast(`Row ${i + 1}: Please select a product`);
        return false;
      }

      if (!row.qty || row.qty <= 0) {
        showErrorToast(`Row ${i + 1}: Quantity must be greater than 0`);
        return false;
      }

      if (!row.price || row.price <= 0) {
        showErrorToast(`Row ${i + 1}: Invalid price`);
        return false;
      }
      if (!row.unitId) {
        showErrorToast(`Row ${i + 1}: Please select unit`);
        return false;
      }
      if (row.discount < 0 || row.discount > 100) {
        showErrorToast(`Row ${i + 1}: Discount must be between 0 and 100`);
        return false;
      }
      if (!paymentTerms || paymentTerms <= 0) {
        showErrorToast("Please enter valid payment terms");
        return false;
      }
    }

    return true;
  };

  const currentFinancialYear = getFinancialYearLabel();
  const formattedInvoiceNumber = formatInvoiceNumber(invoiceNumber, {
    ...invoiceSettings,
    financialYear: currentFinancialYear,
  });
  const termsTemplate = (invoiceSettings?.terms || "").toString().trim();
  const termsWithoutPaymentLineItems = termsTemplate
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line)
    .filter(
      (line) =>
        !/payment\s*terms/i.test(line) &&
        !/\{\{\s*payment_terms\s*\}\}/i.test(line),
    );
  const nextLineNumber = termsWithoutPaymentLineItems.length + 1;
  const paymentTermsTemplateLine = `${nextLineNumber}. Payment Terms : {{payment_terms}}`;
  const termsWithPaymentLine = [
    ...termsWithoutPaymentLineItems,
    paymentTermsTemplateLine,
  ]
    .filter(Boolean)
    .join("\n");
  const termsAndConditions = termsWithPaymentLine.replace(
    /\{\{\s*payment_terms\s*\}\}/gi,
    `Within ${paymentTerms || 0} days`,
  );
  const totalTax = Number(
    (Number(cgst || 0) + Number(sgst || 0) + Number(igst || 0)).toFixed(2),
  );
  const overallDiscount = Number(
    selectedProducts
      .filter((product) => product.productName !== "")
      .reduce((sum, product) => {
        const qty = Number(product.qty) || 0;
        const price = Number(product.price) || 0;
        const discountPercent = Number(product.discount) || 0;
        const lineAmount = qty * price;
        const lineDiscount = (lineAmount * discountPercent) / 100;
        return sum + lineDiscount;
      }, 0)
      .toFixed(2),
  );

  const saveInvoice = async () => {
    if (!validateRows()) return;

    const filledProducts = selectedProducts.filter(
      (product) => product.productName !== "",
    );

    const invoiceData = {
      invoiceNumber: formattedInvoiceNumber,
      invoiceDate,
      poNumber,
      poDate,
      companyId: companySettings?.companyId,
      customerId,
      customerName,
      customerAddress,
      gstIn,
      products: filledProducts.map((product) => ({
        ...product,
        unit: units.find((u) => u.unitId === product.unitId)?.unitName || "",
        qty: parseFloat((Number(product.qty) || 0).toFixed(2)),
        price: Number(product.price) || 0,
        discount: Number(product.discount) || 0,
        cgstRate: Number(product.cgstRate) || 0,
        sgstRate: Number(product.sgstRate) || 0,
        igstRate: Number(product.igstRate) || 0,
        total: Number(product.total) || 0,
      })),
      subTotal,
      cgst,
      sgst,
      igst,
      totalTax,
      overallDiscount,
      roundedOff,
      totalAmount,
      paymentTerms: `Within ${paymentTerms} days`,
      amountInWords,
    };

    try {
      setLoading(true);
      if (invoiceId) {
        await invoiceApi.update(id, invoiceData);
      } else {
        await invoiceApi.create(invoiceData);
      }
      showSuccessToast(
        id
          ? `Invoice ${formattedInvoiceNumber} updated successfully!`
          : `Invoice ${formattedInvoiceNumber} saved successfully!`,
        Slide,
      );
      navigate("/invoice-list");
    } catch (err) {
      console.error("Save error:", err);
      showErrorToast("Error saving invoice. Please try again.", Slide);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4 mb-4 mb-4">
      <h3 className="mb-4">{invoiceId ? "Edit Invoice" : "New Invoice"}</h3>

      {shouldBlockNewInvoice ? (
        <div className="card border-warning mb-3">
          <div className="card-header bg-warning-subtle fw-bold">
            Complete Setup Before Creating Invoice
          </div>
          <div className="card-body">
            <p className="mb-2 text-muted">
              A few setup items are required before you can create invoices:
            </p>
            <ul className="mb-3">
              {invoiceSetupIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <button
              className="btn btn-success"
              onClick={() => navigate("/settings")}
            >
              Go to Settings
            </button>
          </div>
        </div>
      ) : (
        !isInitialLoading && (
          <>
            <div className="card mb-3">
              <div className="card-header fw-bold">Invoice Details</div>
              <div className="card-body row">
                <div className="col-md-6 mb-2">
                  <label className="label">Invoice Number</label>
                  <input
                    className="form-control"
                    value={formattedInvoiceNumber}
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>

                <div className="col-md-6 mt-2">
                  <label className="label">PO Number</label>
                  <input
                    className="form-control"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="Enter PO Number"
                  />
                </div>

                <div className="col-md-6 mt-2">
                  <label className="label">PO Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-bold">Seller Details</div>
              <div className="card-body">
                <label className="label">Seller</label>
                <input
                  className="form-control mb-3"
                  placeholder="Seller"
                  value={sellerName}
                  disabled
                />

                <label className="label">Address</label>
                <textarea
                  className="form-control mb-3"
                  rows="3"
                  value={
                    sellerAddressWithPincode || companySettings.address || ""
                  }
                  disabled
                />
                <label className="label">GSTIN</label>
                <input
                  className="form-control mb-3"
                  placeholder="GSTIN"
                  value={sellerGstIn}
                  disabled
                />
                <label className="label">Email</label>
                <input
                  className="form-control mb-3"
                  placeholder="Email"
                  value={sellerEmail}
                  disabled
                />
                <label className="label">Mobile</label>
                <input
                  className="form-control mb-3"
                  placeholder="Mobile"
                  value={sellerMobile}
                  disabled
                />
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-bold">Customer Details</div>
              <div className="card-body">
                <label className="label">Customer</label>
                <select
                  className="form-select mb-3"
                  value={customerId}
                  onChange={(e) => {
                    handleCustomerChange(e.target.value);
                  }}
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option
                      key={customer.customerId}
                      value={customer.customerId}
                    >
                      {customer.customerName} - {customer.address?.city || ""}
                    </option>
                  ))}
                </select>
                <label className="label">Address</label>
                <textarea
                  className="form-control mb-3"
                  rows="3"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  disabled={customerId !== ""}
                />
                <label className="label">GSTIN</label>
                <input
                  className="form-control mb-3"
                  placeholder="GSTIN"
                  value={gstIn}
                  onChange={(e) => setGstIn(e.target.value)}
                  disabled={customerId !== ""}
                />
              </div>
            </div>

            <div className="card mb-3">
              <div className="card-header fw-bold">Products</div>
              <div className="card-body">
                {selectedProducts && selectedProducts.length > 0 ? (
                  <table className="table table-bordered table-hover text-center invoice-products-table">
                    <thead className="table-light">
                      <tr>
                        <th>S.No</th>
                        <th className="product-col">Product</th>
                        <th>HSN/SAC</th>
                        <th className="unit-col">Unit</th>
                        <th className="qty-col">Quantity</th>
                        <th>Rate</th>
                        <th>Disc %</th>
                        <th>Amount</th>
                        <th>CGST %</th>
                        <th>SGST %</th>
                        <th>IGST %</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedProducts.map((product, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>

                          <td
                            className="product-col"
                            data-row={index}
                            data-col="product"
                            title={product.productName || ""}
                          >
                            <input
                              ref={(el) => setRef(index, "product", el)}
                              type="text"
                              className="form-control"
                              value={product.productName}
                              title={product.productName || ""}
                              readOnly
                              placeholder="Click or type product"
                              onClick={() => {
                                if (!customerId) {
                                  showErrorToast(
                                    "Please select customer first",
                                  );
                                  return;
                                }
                                setSelectedRowIndex(index);
                                setProductSearch(product.productName || "");
                                setIsEditingProduct(true);
                                setShowProductModal(true);
                              }}
                              onKeyDown={(e) => {
                                if (!customerId) {
                                  showErrorToast(
                                    "Please select customer first",
                                  );
                                  return;
                                }
                                const key = e.key;

                                if (e.ctrlKey || e.metaKey || e.altKey) {
                                  return;
                                }

                                handleSequentialNavigation(
                                  e,
                                  index,
                                  "product",
                                  {
                                    product: { col: "qty", rowOffset: 0 },
                                    qty: { col: "product", rowOffset: 1 },
                                  },
                                );
                                handleVerticalNavigation(e, index, "product");
                                if (key === "Backspace") {
                                  e.preventDefault();

                                  setSelectedRowIndex(index);

                                  const existingText =
                                    selectedProducts[index].productName || "";

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
                                if (
                                  !allowedKeys.includes(key) &&
                                  key.length === 1
                                ) {
                                  e.preventDefault();
                                  setSelectedRowIndex(index);

                                  setProductSearch(key);
                                  setIsEditingProduct(false);

                                  setShowProductModal(true);
                                }
                              }}
                            />
                          </td>
                          <td>{product.hsnSac || ""}</td>
                          <td
                            className="unit-col"
                            data-row={index}
                            data-col="unit"
                            title={
                              units.find(
                                (unit) => unit.unitId === product.unitId,
                              )?.unitName ||
                              product.unit ||
                              ""
                            }
                          >
                            <select
                              className="form-select unit-select"
                              value={product.unitId || ""}
                              title={
                                units.find(
                                  (unit) => unit.unitId === product.unitId,
                                )?.unitName ||
                                product.unit ||
                                ""
                              }
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleUnitChange(index, e.target.value)
                              }
                            >
                              <option value="">Select Unit</option>
                              {units.map((unit) => (
                                <option key={unit.unitId} value={unit.unitId}>
                                  {unit.unitName}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            className="qty-col"
                            data-row={index}
                            data-col="qty"
                            title={product.qty || ""}
                          >
                            <input
                              ref={(el) => setRef(index, "qty", el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control"
                              value={product.qty}
                              title={product.qty || ""}
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleQtyChange(index, e.target.value)
                              }
                              onBlur={() => handleNumericBlur(index, "qty", 0)}
                              onKeyDown={(e) => {
                                handleSequentialNavigation(e, index, "qty", {
                                  product: { col: "qty", rowOffset: 0 },
                                  qty: { col: "discount", rowOffset: 0 },
                                  discount: { col: "product", rowOffset: 1 },
                                });
                              }}
                            />
                          </td>

                          <td>{Number(product.price || 0).toFixed(2)}</td>

                          <td data-row={index} data-col="discount">
                            <input
                              ref={(el) => setRef(index, "discount", el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control"
                              value={product.discount ?? "0.00"}
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleDiscChange(index, e.target.value)
                              }
                              onBlur={() =>
                                handleNumericBlur(index, "discount", 0, 100)
                              }
                              onKeyDown={(e) => {
                                handleSequentialNavigation(
                                  e,
                                  index,
                                  "discount",
                                  {
                                    product: { col: "qty", rowOffset: 0 },
                                    qty: { col: "discount", rowOffset: 0 },
                                    discount: { col: "cgstRate", rowOffset: 0 },
                                    cgstRate: { col: "sgstRate", rowOffset: 0 },
                                    sgstRate: { col: "igstRate", rowOffset: 0 },
                                    igstRate: { col: "remove", rowOffset: 0 },
                                  },
                                );
                              }}
                            />
                          </td>

                          <td>{Number(product.total || 0).toFixed(2)}</td>

                          <td data-row={index} data-col="cgstRate">
                            <input
                              ref={(el) => setRef(index, "cgstRate", el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control"
                              value={product.cgstRate ?? "0.00"}
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleTaxRateChange(
                                  index,
                                  "cgstRate",
                                  e.target.value,
                                )
                              }
                              onBlur={() =>
                                handleNumericBlur(index, "cgstRate", 0, 100)
                              }
                              onKeyDown={(e) => {
                                handleSequentialNavigation(
                                  e,
                                  index,
                                  "cgstRate",
                                  {
                                    product: { col: "qty", rowOffset: 0 },
                                    qty: { col: "discount", rowOffset: 0 },
                                    discount: { col: "cgstRate", rowOffset: 0 },
                                    cgstRate: { col: "sgstRate", rowOffset: 0 },
                                    sgstRate: { col: "igstRate", rowOffset: 0 },
                                    igstRate: { col: "remove", rowOffset: 0 },
                                  },
                                );
                              }}
                            />
                          </td>

                          <td data-row={index} data-col="sgstRate">
                            <input
                              ref={(el) => setRef(index, "sgstRate", el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control"
                              value={product.sgstRate ?? "0.00"}
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleTaxRateChange(
                                  index,
                                  "sgstRate",
                                  e.target.value,
                                )
                              }
                              onBlur={() =>
                                handleNumericBlur(index, "sgstRate", 0, 100)
                              }
                              onKeyDown={(e) => {
                                handleSequentialNavigation(
                                  e,
                                  index,
                                  "sgstRate",
                                  {
                                    product: { col: "qty", rowOffset: 0 },
                                    qty: { col: "discount", rowOffset: 0 },
                                    discount: { col: "cgstRate", rowOffset: 0 },
                                    cgstRate: { col: "sgstRate", rowOffset: 0 },
                                    sgstRate: { col: "igstRate", rowOffset: 0 },
                                    igstRate: { col: "remove", rowOffset: 0 },
                                  },
                                );
                              }}
                            />
                          </td>

                          <td data-row={index} data-col="igstRate">
                            <input
                              ref={(el) => setRef(index, "igstRate", el)}
                              type="text"
                              inputMode="decimal"
                              className="form-control"
                              value={product.igstRate ?? "0.00"}
                              disabled={!product.productName}
                              onChange={(e) =>
                                handleTaxRateChange(
                                  index,
                                  "igstRate",
                                  e.target.value,
                                )
                              }
                              onBlur={() =>
                                handleNumericBlur(index, "igstRate", 0, 100)
                              }
                              onKeyDown={(e) => {
                                handleSequentialNavigation(
                                  e,
                                  index,
                                  "igstRate",
                                  {
                                    product: { col: "qty", rowOffset: 0 },
                                    qty: { col: "discount", rowOffset: 0 },
                                    discount: { col: "cgstRate", rowOffset: 0 },
                                    cgstRate: { col: "sgstRate", rowOffset: 0 },
                                    sgstRate: { col: "igstRate", rowOffset: 0 },
                                    igstRate: { col: "remove", rowOffset: 0 },
                                  },
                                );
                              }}
                            />
                          </td>

                          <td>
                            {product.productName && (
                              <button
                                ref={(el) => setRef(index, "remove", el)}
                                className="btn btn-danger btn-sm"
                                onClick={() => removeRow(index)}
                                onKeyDown={(e) => {
                                  if (e.key === "Tab") {
                                    e.preventDefault();
                                    focusCell(index + 1, "product");
                                  }
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                <button className="btn btn-primary mb-1" onClick={addRow}>
                  + Add Product
                </button>
              </div>
            </div>

            <div className="row mt-3 align-items-stretch">
              <div className="col-md-6 d-flex flex-column">
                <div className="d-flex align-items-center gap-2 mb-3 mt-3">
                  <label className="fw-semibold mb-0">
                    Payment Terms (days):
                  </label>

                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="0"
                    style={{
                      width: "80px",
                      paddingTop: "3px",
                      backgroundColor: "#e9ecef",
                    }}
                    value={paymentTerms || ""}
                    onChange={(e) => {
                      const days = Number(e.target.value);
                      setPaymentTerms(Number.isNaN(days) ? 0 : days);
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>

                <div className="card shadow-sm border-0 flex-grow-1 mb-3">
                  <div className="card-header bg-light fw-bold">
                    Terms & Conditions
                  </div>
                  <div className="card-body">
                    <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>
                      {termsAndConditions}
                    </p>
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-header bg-light fw-bold">Summary</div>

                  <div className="card-body">
                    <div className="d-flex justify-content-between fw-bold mb-2">
                      <span>Subtotal</span>
                      <span>₹ {Number(subTotal || 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between fw-bold mb-2">
                      <span>Overall Discount</span>
                      <span>₹ {Number(overallDiscount || 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold">CGST</span>
                      <span>₹ {Number(cgst || 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold">SGST</span>
                      <span>₹ {Number(sgst || 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold">IGST</span>
                      <span>₹ {Number(igst || 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between fw-bold mb-2">
                      <span>Total Tax</span>
                      <span>₹ {Number(totalTax || 0).toFixed(2)}</span>
                    </div>

                    <hr />

                    <div className="d-flex justify-content-between fw-semibold mb-2">
                      <span>Rounded Off</span>
                      <span>₹ {roundedOff.toFixed(2)}</span>
                    </div>

                    <div className="d-flex justify-content-between fw-bold fs-6">
                      <span>Total</span>
                      <span>₹ {Number(totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p>
              <b>Amount in Words:</b> {amountInWords}
            </p>

            <div className="card mb-3">
              <div className="card-header fw-bold">Bank Details</div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <label className="label">Account Name</label>
                    <input
                      className="form-control mb-3"
                      value={accountName}
                      disabled
                    />

                    <label className="label">Account Number</label>
                    <input
                      className="form-control mb-3"
                      value={accountNo}
                      disabled
                    />

                    <label className="label">Bank Name</label>
                    <input
                      className="form-control mb-3"
                      value={bankName}
                      disabled
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="label">Branch</label>
                    <input
                      className="form-control mb-3"
                      value={branch}
                      disabled
                    />

                    <label className="label">IFSC Code</label>
                    <input
                      className="form-control mb-3"
                      value={ifsc}
                      disabled
                    />

                    <label className="label">UPI ID</label>
                    <input className="form-control mb-3" value={upi} disabled />
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <Link to="/invoice-list" className="btn btn-secondary">
                Cancel
              </Link>

              <button
                className="btn btn-success"
                onClick={saveInvoice}
                disabled={loading}
              >
                {loading
                  ? invoiceId
                    ? "Updating..."
                    : "Saving..."
                  : invoiceId
                    ? "Update Invoice"
                    : "Save Invoice"}
              </button>
            </div>

            <ProductModal
              show={showProductModal}
              onClose={() => setShowProductModal(false)}
              onSelect={handleProductSelect}
              initialSearch={productSearch}
              isEditing={isEditingProduct}
              products={[...products]}
              selectedProducts={selectedProducts.map((r) => r.productId)}
              customerId={customerId}
            />
          </>
        )
      )}
    </div>
  );
}

export default InvoiceForm;
