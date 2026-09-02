import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

import { invoiceApi } from "../services/api";
import {
  getCustomerLocation,
  getFinancialYearLabel,
  showErrorToast,
} from "../utils/helpers";

import "./Sales.css";

/* =========================================================
   CONSTANTS
========================================================= */

const TAX_COLORS = {
  CGST: "#6366f1",
  SGST: "#10b981",
  IGST: "#f59e0b",
};

/* =========================================================
   FORMATTING HELPERS
========================================================= */

const formatCurrency = (value) => {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (value) => {
  const amount = Number(value) || 0;

  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }

  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }

  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }

  return `₹${amount.toFixed(0)}`;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return "-";
  }

  const normalized = normalizeInvoiceDate(dateValue);

  if (!normalized) {
    return "-";
  }

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
};

/* =========================================================
   DATE HELPERS
========================================================= */

/*
 * Converts invoice dates into YYYY-MM-DD.
 *
 * Supports:
 * YYYY-MM-DD
 * YYYY-MM-DDTHH:mm:ssZ
 * DD/MM/YYYY
 * DD-MM-YYYY
 */
const normalizeInvoiceDate = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();

  if (!raw) {
    return "";
  }

  /* YYYY-MM-DD / ISO */
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  /* DD/MM/YYYY */
  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  /* DD-MM-YYYY */
  const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);

  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`;
  }

  return "";
};

const getDateParts = (dateValue) => {
  const normalized = normalizeInvoiceDate(dateValue);

  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  if (
    !year ||
    !month ||
    !day ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  return {
    year,
    month,
    day,
  };
};

/* =========================================================
   FINANCIAL YEAR HELPERS
========================================================= */

const getFinancialYearFromDate = (dateValue) => {
  const parts = getDateParts(dateValue);

  if (!parts) {
    return null;
  }

  const startYear = parts.month >= 4 ? parts.year : parts.year - 1;

  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

const formatFinancialYear = (financialYear) => {
  if (!financialYear) {
    return "";
  }

  const [start, end] = String(financialYear).split("-");

  if (!start || !end) {
    return financialYear;
  }

  const startYear = start.length === 4 ? Number(start) : 2000 + Number(start);

  if (Number.isNaN(startYear)) {
    return financialYear;
  }

  return `${startYear}-${startYear + 1}`;
};

const normalizeFinancialYear = (financialYear) => {
  if (!financialYear) {
    return "";
  }

  const value = String(financialYear);

  if (!value.includes("-")) {
    return value;
  }

  const [start, end] = value.split("-");

  if (!start || !end) {
    return value;
  }

  if (start.length === 4) {
    return `${start.slice(-2)}-${end.slice(-2)}`;
  }

  return value;
};

const getFinancialYearDateRange = (financialYear) => {
  if (!financialYear || financialYear === "custom") {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const normalized = normalizeFinancialYear(financialYear);

  const [start] = normalized.split("-");

  const startNumber = Number(start);

  if (Number.isNaN(startNumber)) {
    return {
      startDate: "",
      endDate: "",
    };
  }

  const startYear = startNumber < 100 ? 2000 + startNumber : startNumber;

  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
};

/* =========================================================
   INVOICE HELPERS
========================================================= */

const getInvoiceCustomerId = (invoice) => {
  return String(
    invoice?.customerId ||
      invoice?.customer_id ||
      invoice?.customer?.id ||
      invoice?.customer?._id ||
      "",
  );
};

const getInvoiceCustomerName = (invoice) => {
  return (
    invoice?.customerName ||
    invoice?.customer_name ||
    invoice?.customer?.name ||
    invoice?.customer?.companyName ||
    invoice?.companyName ||
    invoice?.company?.name ||
    "Unknown Customer"
  );
};

const getInvoiceNumber = (invoice) => {
  return (
    invoice?.invoiceNumber ||
    invoice?.invoice_number ||
    invoice?.invoiceNo ||
    invoice?.invoice_no ||
    invoice?.number ||
    invoice?.invoiceId ||
    "-"
  );
};

const getInvoiceDate = (invoice) => {
  return (
    invoice?.invoiceDate ||
    invoice?.invoice_date ||
    invoice?.date ||
    invoice?.createdAt ||
    invoice?.created_at ||
    ""
  );
};

/* =========================================================
   INVOICE EDIT ROUTE
========================================================= */

const getInvoiceEditPath = (invoice) => {
  const invoiceId =
    invoice?.invoiceId || invoice?.id || invoice?._id || invoice?.invoice_id;

  if (!invoiceId) {
    return null;
  }

  return `/invoice/${invoiceId}`;
};

/* =========================================================
   MONTH BUCKETS
========================================================= */

const getMonthBuckets = (startDate, endDate, showYear = false) => {
  if (!startDate || !endDate) {
    return [];
  }

  if (startDate > endDate) {
    return [];
  }

  const startParts = getDateParts(startDate);

  const endParts = getDateParts(endDate);

  if (!startParts || !endParts) {
    return [];
  }

  let year = startParts.year;
  let month = startParts.month;

  const endYear = endParts.year;
  const endMonth = endParts.month;

  const buckets = [];

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;

    const date = new Date(year, month - 1, 1);

    const monthName = date.toLocaleString("en-IN", {
      month: "short",
    });

    const label = showYear
      ? `${monthName} '${String(year).slice(-2)}`
      : monthName;

    buckets.push({
      key,
      month: label,
      sales: 0,
      invoices: 0,
    });

    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return buckets;
};

/* =========================================================
   TOOLTIP - SALES
========================================================= */

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const sales = payload.find((item) => item.dataKey === "sales");

  return (
    <div className="sales-chart-tooltip">
      <div className="tooltip-label">{label}</div>

      <div className="tooltip-value">
        <span>Sales</span>

        <strong>{formatCurrency(sales?.value || 0)}</strong>
      </div>
    </div>
  );
};

/* =========================================================
   TOOLTIP - INVOICES
========================================================= */

const InvoiceTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="sales-chart-tooltip">
      <div className="tooltip-label">{label}</div>

      <div className="tooltip-value">
        <span>Invoices</span>

        <strong>{payload[0]?.value || 0}</strong>
      </div>
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const Sales = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  const [hasLoadError, setHasLoadError] = useState(false);

  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");

  const [customStartDate, setCustomStartDate] = useState("");

  const [customEndDate, setCustomEndDate] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState("all");

  const [invoiceSearch, setInvoiceSearch] = useState("");

  /* =======================================================
     COMPANY
  ======================================================= */

  const companyList = useSelector((state) => state.companies?.data || []);

  const activeCompanyId = String(
    companyList.find((company) => company?.isPrimary)?.companyId ||
      companyList[0]?.companyId ||
      "",
  );

  /* =======================================================
     FETCH INVOICES
  ======================================================= */

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await invoiceApi.list(activeCompanyId || undefined);

      /*
       * Your API response may be:
       *
       * {
       *   data: [...]
       * }
       *
       * or directly:
       *
       * [...]
       */
      const responseData = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];

      const activeInvoices = responseData.filter(
        (invoice) => invoice?.isActive !== false,
      );

      const sortedInvoices = [...activeInvoices].sort(
        (firstInvoice, secondInvoice) => {
          const firstNumber = Number(getInvoiceNumber(firstInvoice));
          const secondNumber = Number(getInvoiceNumber(secondInvoice));

          if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
            return firstNumber - secondNumber;
          }

          return String(getInvoiceNumber(firstInvoice)).localeCompare(
            String(getInvoiceNumber(secondInvoice)),
            undefined,
            { numeric: true, sensitivity: "base" },
          );
        },
      );

      setInvoices(sortedInvoices);

      setHasLoadError(false);
    } catch (error) {
      console.error("Error loading sales data:", error);

      setHasLoadError(true);

      showErrorToast("Unable to load sales data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* =======================================================
     DYNAMIC FINANCIAL YEARS
  ======================================================= */

  const financialYearOptions = useMemo(() => {
    const yearSet = new Set();

    invoices.forEach((invoice) => {
      const invoiceDate = getInvoiceDate(invoice);

      const financialYear = getFinancialYearFromDate(invoiceDate);

      if (financialYear) {
        yearSet.add(financialYear);
      }
    });

    return Array.from(yearSet).sort((a, b) => {
      const [aStart] = a.split("-").map(Number);

      const [bStart] = b.split("-").map(Number);

      return bStart - aStart;
    });
  }, [invoices]);

  /* =======================================================
     SET DEFAULT FINANCIAL YEAR
  ======================================================= */

  useEffect(() => {
    /*
     * VERY IMPORTANT:
     *
     * If user selected Custom,
     * NEVER overwrite it.
     */
    if (selectedFinancialYear === "custom") {
      return;
    }

    if (
      selectedFinancialYear &&
      financialYearOptions.includes(selectedFinancialYear)
    ) {
      return;
    }

    if (financialYearOptions.length > 0) {
      setSelectedFinancialYear(financialYearOptions[0]);
      return;
    }

    /*
     * Fallback if there are no invoices.
     */
    const currentFY = getFinancialYearLabel();

    if (currentFY) {
      setSelectedFinancialYear(normalizeFinancialYear(currentFY));
    }
  }, [financialYearOptions, selectedFinancialYear]);

  /* =======================================================
     CUSTOMER LIST
  ======================================================= */

  const customers = useMemo(() => {
    const customerMap = new Map();

    invoices.forEach((invoice) => {
      const id = getInvoiceCustomerId(invoice);

      const name = getInvoiceCustomerName(invoice);
      const city = getCustomerLocation(
        invoice?.customer?.address ||
          invoice?.address ||
          invoice?.customerAddress ||
          invoice?.customer_address ||
          "",
      );

      if (id) {
        customerMap.set(id, { name, city });
      }
    });

    return Array.from(customerMap, ([id, customer]) => ({
      id,
      ...customer,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  /* =======================================================
     CUSTOM DATE HANDLERS
  ======================================================= */

  const handleStartDateChange = (event) => {
    const value = event.target.value;

    setCustomStartDate(value);

    /*
     * If From becomes later than To,
     * clear To.
     */
    if (customEndDate && value > customEndDate) {
      setCustomEndDate("");
    }
  };

  const handleEndDateChange = (event) => {
    const value = event.target.value;

    if (customStartDate && value < customStartDate) {
      return;
    }

    setCustomEndDate(value);
  };

  /* =======================================================
     DATE RANGE
  ======================================================= */

  const dateRange = useMemo(() => {
    if (selectedFinancialYear === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    return getFinancialYearDateRange(selectedFinancialYear);
  }, [selectedFinancialYear, customStartDate, customEndDate]);

  const hasValidDateRange = Boolean(
    dateRange.startDate &&
    dateRange.endDate &&
    dateRange.startDate <= dateRange.endDate,
  );

  /* =======================================================
     FILTER INVOICES
  ======================================================= */

  const matchingInvoices = useMemo(() => {
    /*
     * Custom date requires both dates.
     */
    if (selectedFinancialYear === "custom") {
      if (!customStartDate || !customEndDate) {
        return [];
      }

      if (customStartDate > customEndDate) {
        return [];
      }
    }

    if (!hasValidDateRange) {
      return [];
    }

    return invoices.filter((invoice) => {
      const invoiceDate = normalizeInvoiceDate(getInvoiceDate(invoice));

      if (!invoiceDate) {
        return false;
      }

      /*
       * Inclusive date comparison.
       *
       * Example:
       * From = 2026-04-01
       * To   = 2026-04-07
       *
       * Invoice 2026-04-07 IS included.
       */
      const matchesDate =
        invoiceDate >= dateRange.startDate && invoiceDate <= dateRange.endDate;

      const invoiceCustomerId = getInvoiceCustomerId(invoice);

      const matchesCustomer =
        selectedCustomer === "all" ||
        invoiceCustomerId === String(selectedCustomer);

      return matchesDate && matchesCustomer;
    });
  }, [
    invoices,
    dateRange,
    selectedCustomer,
    selectedFinancialYear,
    customStartDate,
    customEndDate,
    hasValidDateRange,
  ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    return matchingInvoices.reduce(
      (totals, invoice) => {
        totals.sales += Number(invoice?.totalAmount) || 0;

        totals.cgst += Number(invoice?.cgst) || 0;

        totals.sgst += Number(invoice?.sgst) || 0;

        totals.igst += Number(invoice?.igst) || 0;

        return totals;
      },
      {
        sales: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      },
    );
  }, [matchingInvoices]);

  const totalGst = summary.cgst + summary.sgst + summary.igst;

  /* =======================================================
     TOTAL CUSTOMERS
  ======================================================= */

  const totalCustomers = useMemo(() => {
    const customerIds = new Set();

    matchingInvoices.forEach((invoice) => {
      const id = getInvoiceCustomerId(invoice);

      if (id) {
        customerIds.add(id);
      }
    });

    return customerIds.size;
  }, [matchingInvoices]);

  /* =======================================================
     MONTHLY SALES
  ======================================================= */

  const monthlySales = useMemo(() => {
    if (!hasValidDateRange) {
      return [];
    }

    const startParts = getDateParts(dateRange.startDate);

    const endParts = getDateParts(dateRange.endDate);

    if (!startParts || !endParts) {
      return [];
    }

    const spansMultipleYears = startParts.year !== endParts.year;

    const showYear = selectedFinancialYear === "custom" && spansMultipleYears;

    const data = getMonthBuckets(
      dateRange.startDate,
      dateRange.endDate,
      showYear,
    );

    const bucketMap = new Map();

    data.forEach((bucket) => {
      bucketMap.set(bucket.key, bucket);
    });

    matchingInvoices.forEach((invoice) => {
      const invoiceDate = normalizeInvoiceDate(getInvoiceDate(invoice));

      const parts = getDateParts(invoiceDate);

      if (!parts) {
        return;
      }

      const key = `${parts.year}-${String(parts.month).padStart(2, "0")}`;

      const bucket = bucketMap.get(key);

      if (!bucket) {
        return;
      }

      bucket.sales += Number(invoice?.totalAmount) || 0;

      bucket.invoices += 1;
    });

    return data;
  }, [matchingInvoices, dateRange, selectedFinancialYear, hasValidDateRange]);

  /* =======================================================
     GST DATA
  ======================================================= */

  const taxData = useMemo(() => {
    return [
      {
        name: "CGST",
        value: summary.cgst,
      },
      {
        name: "SGST",
        value: summary.sgst,
      },
      {
        name: "IGST",
        value: summary.igst,
      },
    ]
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage:
          totalGst > 0 ? ((item.value / totalGst) * 100).toFixed(1) : "0.0",
      }));
  }, [summary, totalGst]);

  /* =======================================================
     SEARCH INVOICES
  ======================================================= */

  const displayedInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();

    const filtered = matchingInvoices.filter((invoice) => {
      if (!search) {
        return true;
      }

      const number = String(getInvoiceNumber(invoice)).toLowerCase();

      const customer = String(getInvoiceCustomerName(invoice)).toLowerCase();

      return number.includes(search) || customer.includes(search);
    });

    return [...filtered].sort((firstInvoice, secondInvoice) => {
      const firstNumber = Number(getInvoiceNumber(firstInvoice));
      const secondNumber = Number(getInvoiceNumber(secondInvoice));

      if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
        return firstNumber - secondNumber;
      }

      return String(getInvoiceNumber(firstInvoice)).localeCompare(
        String(getInvoiceNumber(secondInvoice)),
        undefined,
        { numeric: true, sensitivity: "base" },
      );
    });
  }, [matchingInvoices, invoiceSearch]);

  /* =======================================================
     INVOICE CLICK
  ======================================================= */

  const handleInvoiceClick = (invoice) => {
    const path = getInvoiceEditPath(invoice);

    if (!path) {
      showErrorToast("Invoice ID is missing.");

      return;
    }

    navigate(path);
  };

  /* =======================================================
     PERIOD CHANGE
  ======================================================= */

  const handlePeriodChange = (event) => {
    const value = event.target.value;

    setSelectedFinancialYear(value);

    /*
     * Clear custom dates when
     * switching back to FY.
     */
    if (value !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="sales-dashboard">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="sales-header">
        <div className="sales-title">
          <h1>Sales Summary</h1>

          <p>Track your sales, taxes and invoices</p>
        </div>

        <div className="sales-filter-row">
          {/* CUSTOMER */}

          <div className="sales-filter">
            <label htmlFor="sales-customer">Customer</label>

            <select
              id="sales-customer"
              value={selectedCustomer}
              onChange={(event) => setSelectedCustomer(event.target.value)}
            >
              <option value="all">All Customers</option>

              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.city ? `- ${customer.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* PERIOD */}

          <div className="sales-filter">
            <label htmlFor="sales-period">Period</label>

            <select
              id="sales-period"
              value={selectedFinancialYear}
              onChange={handlePeriodChange}
            >
              {financialYearOptions.map((financialYear) => (
                <option key={financialYear} value={financialYear}>
                  {formatFinancialYear(financialYear)}
                </option>
              ))}

              <option value="custom">Custom</option>
            </select>
          </div>

          {/* CUSTOM DATES */}

          {selectedFinancialYear === "custom" && (
            <div className="custom-date-inline">
              <div className="sales-filter">
                <label htmlFor="sales-from">From</label>

                <input
                  id="sales-from"
                  type="date"
                  value={customStartDate}
                  max={customEndDate || undefined}
                  onChange={handleStartDateChange}
                />
              </div>

              <div className="sales-filter">
                <label htmlFor="sales-to">To</label>

                <input
                  id="sales-to"
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={handleEndDateChange}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          CUSTOM DATE STATUS
      =================================================== */}

      {selectedFinancialYear === "custom" &&
        (!customStartDate || !customEndDate) && (
          <div className="sales-date-info">
            <span className="sales-date-info-icon">i</span>

            <span>Select both From and To dates to view sales data.</span>
          </div>
        )}

      {selectedFinancialYear === "custom" &&
        customStartDate &&
        customEndDate &&
        customStartDate > customEndDate && (
          <div className="sales-date-error">
            From date cannot be later than To date.
          </div>
        )}

      {/* ===================================================
          KPI CARDS
      =================================================== */}

      <div className="sales-kpi-grid">
        <div className="sales-kpi-card sales-kpi-primary">
          <div className="sales-kpi-icon">₹</div>

          <div className="sales-kpi-content">
            <span>Total Sales</span>

            <strong>{formatCurrency(summary.sales)}</strong>

            <small>{matchingInvoices.length} invoices</small>
          </div>
        </div>

        <div className="sales-kpi-card sales-kpi-cgst">
          <div className="sales-kpi-icon">C</div>

          <div className="sales-kpi-content">
            <span>CGST</span>

            <strong>{formatCurrency(summary.cgst)}</strong>

            <small>Central GST</small>
          </div>
        </div>

        <div className="sales-kpi-card sales-kpi-sgst">
          <div className="sales-kpi-icon">S</div>

          <div className="sales-kpi-content">
            <span>SGST</span>

            <strong>{formatCurrency(summary.sgst)}</strong>

            <small>State GST</small>
          </div>
        </div>

        <div className="sales-kpi-card sales-kpi-igst">
          <div className="sales-kpi-icon">I</div>

          <div className="sales-kpi-content">
            <span>IGST</span>

            <strong>{formatCurrency(summary.igst)}</strong>

            <small>Integrated GST</small>
          </div>
        </div>

        <div className="sales-kpi-card sales-kpi-invoices">
          <div className="sales-kpi-icon">#</div>

          <div className="sales-kpi-content">
            <span>Invoices</span>

            <strong>{matchingInvoices.length}</strong>

            <small>Selected period</small>
          </div>
        </div>

        <div className="sales-kpi-card sales-kpi-customers">
          <div className="sales-kpi-icon">👥</div>

          <div className="sales-kpi-content">
            <span>Customers</span>

            <strong>{totalCustomers}</strong>

            <small>Unique customers</small>
          </div>
        </div>
      </div>

      {/* ===================================================
          GST OVERVIEW
      =================================================== */}

      <div className="sales-chart-card gst-card">
        <div className="sales-card-header">
          <div>
            <h2>GST Overview</h2>

            <p>Tax distribution for selected invoices</p>
          </div>

          <div className="sales-card-total">
            <span>Total GST</span>

            <strong>{formatCurrency(totalGst)}</strong>
          </div>
        </div>

        <div className="gst-content">
          <div className="gst-donut-wrapper">
            {totalGst > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={taxData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={82}
                      outerRadius={112}
                      paddingAngle={4}
                      cornerRadius={8}
                      stroke="none"
                    >
                      {taxData.map((entry) => (
                        <Cell key={entry.name} fill={TAX_COLORS[entry.name]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                <div className="gst-donut-center">
                  <span>Total GST</span>

                  <strong>{formatCompactCurrency(totalGst)}</strong>
                </div>
              </>
            ) : (
              <div className="gst-empty">No GST data</div>
            )}
          </div>

          <div className="tax-legend">
            {["CGST", "SGST", "IGST"].map((tax) => {
              const item = taxData.find((entry) => entry.name === tax);

              const value = Number(summary[tax.toLowerCase()]) || 0;

              return (
                <div className="tax-legend-item" key={tax}>
                  <div className="tax-legend-left">
                    <span
                      className="tax-dot"
                      style={{
                        backgroundColor: TAX_COLORS[tax],
                      }}
                    />

                    <div>
                      <strong>{tax}</strong>

                      <span>{item?.percentage || "0.0"}% of GST</span>
                    </div>
                  </div>

                  <strong>{formatCurrency(value)}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================
          MONTHLY SALES
      =================================================== */}

      <div className="sales-chart-card">
        <div className="sales-card-header">
          <div>
            <h2>Monthly Sales</h2>

            <p>Sales performance based on the selected period</p>
          </div>

          <div className="chart-summary">
            <span>Total</span>

            <strong>{formatCompactCurrency(summary.sales)}</strong>
          </div>
        </div>

        <div className="chart-container">
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={monthlySales}
                margin={{
                  top: 20,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />

                    <stop
                      offset="100%"
                      stopColor="#6366f1"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                  tickFormatter={formatCompactCurrency}
                />

                <Tooltip content={<SalesTooltip />} />

                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    fill: "#ffffff",
                  }}
                  activeDot={{
                    r: 6,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">
              {selectedFinancialYear === "custom"
                ? "Select a valid custom date range to view sales."
                : "No sales data for the selected period."}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          INVOICE ACTIVITY
      =================================================== */}

      <div className="sales-chart-card">
        <div className="sales-card-header">
          <div>
            <h2>Invoice Activity</h2>

            <p>Number of invoices generated each month</p>
          </div>

          <div className="chart-summary">
            <span>Total Invoices</span>

            <strong>{matchingInvoices.length}</strong>
          </div>
        </div>

        <div className="chart-container">
          {monthlySales.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthlySales}
                margin={{
                  top: 30,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                />

                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />

                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748b",
                    fontSize: 12,
                  }}
                />

                <Tooltip content={<InvoiceTooltip />} />

                <Bar
                  dataKey="invoices"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={52}
                >
                  <LabelList
                    dataKey="invoices"
                    position="top"
                    fill="#334155"
                    fontSize={12}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">
              {selectedFinancialYear === "custom"
                ? "Select a valid custom date range to view invoice activity."
                : "No invoice activity for the selected period."}
            </div>
          )}
        </div>

        <div className="invoice-footer">
          <span>{matchingInvoices.length} invoices</span>

          <span>{totalCustomers} customers</span>

          <span>{formatCurrency(summary.sales)} sales</span>
        </div>
      </div>

      {/* ===================================================
          INVOICE TABLE
      =================================================== */}

      <div className="sales-chart-card invoices-table-card">
        <div className="invoice-table-header">
          <div>
            <h2>Invoices</h2>

            <p>View and manage invoices for the selected period</p>
          </div>

          <div className="invoice-table-actions">
            <span className="invoice-count-badge">
              {displayedInvoices.length} invoices
            </span>

            <div className="invoice-search-wrapper">
              <span className="invoice-search-icon">⌕</span>

              <input
                type="text"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="Search invoice or customer..."
                className="invoice-search"
              />

              {invoiceSearch && (
                <button
                  type="button"
                  className="invoice-search-clear"
                  onClick={() => setInvoiceSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="invoice-loading-state">
            <div className="sales-loading-spinner" />

            <span>Loading invoices...</span>
          </div>
        ) : hasLoadError ? (
          <div className="invoice-empty-state">
            <div className="invoice-empty-icon">!</div>

            <h3>Unable to load invoices</h3>

            <p>Please try again.</p>

            <button
              type="button"
              className="invoice-retry-button"
              onClick={fetchInvoices}
            >
              Retry
            </button>
          </div>
        ) : displayedInvoices.length === 0 ? (
          <div className="invoice-empty-state">
            <div className="invoice-empty-icon">✓</div>

            <h3>No invoices found</h3>

            <p>
              {selectedFinancialYear === "custom" &&
              (!customStartDate || !customEndDate)
                ? "Select a From and To date to view invoices."
                : "No invoices match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Invoice No.</th>

                  <th>Date</th>

                  <th>Customer</th>

                  <th>CGST</th>

                  <th>SGST</th>

                  <th>IGST</th>

                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {displayedInvoices.map((invoice, index) => {
                  const rowId =
                    invoice?.invoiceId || invoice?.id || invoice?._id || index;

                  return (
                    <tr
                      key={rowId}
                      className="invoice-table-row-clickable"
                      onClick={() => handleInvoiceClick(invoice)}
                    >
                      <td>
                        <span className="invoice-number">
                          {getInvoiceNumber(invoice)}
                        </span>
                      </td>

                      <td>
                        <span className="invoice-date">
                          {formatDate(getInvoiceDate(invoice))}
                        </span>
                      </td>

                      <td>
                        <div className="invoice-customer">
                          <span className="invoice-customer-icon">
                            {getInvoiceCustomerName(invoice)
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span>{getInvoiceCustomerName(invoice)}</span>
                        </div>
                      </td>

                      <td>{formatCurrency(invoice?.cgst)}</td>

                      <td>{formatCurrency(invoice?.sgst)}</td>

                      <td>{formatCurrency(invoice?.igst)}</td>

                      <td>
                        <span className="invoice-total-amount">
                          {formatCurrency(invoice?.totalAmount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sales;
