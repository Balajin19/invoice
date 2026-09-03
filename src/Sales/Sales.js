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

const TAX_COLORS = {
  CGST: "#6366f1",
  SGST: "#10b981",
  IGST: "#f59e0b",
};

const INVOICES_PER_PAGE = 10;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

const normalizeInvoiceDate = (value) => {
  if (!value) return "";

  const raw = String(value).trim();

  if (!raw) return "";

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})/);

  if (dashMatch) {
    return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`;
  }

  return "";
};

const formatDate = (dateValue) => {
  if (!dateValue) return "-";

  const normalized = normalizeInvoiceDate(dateValue);

  if (!normalized) return "-";

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
};

const getDateParts = (dateValue) => {
  const normalized = normalizeInvoiceDate(dateValue);

  if (!normalized) return null;

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

const getFinancialYearFromDate = (dateValue) => {
  const parts = getDateParts(dateValue);

  if (!parts) return null;

  const startYear = parts.month >= 4 ? parts.year : parts.year - 1;

  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

const formatFinancialYear = (financialYear) => {
  if (!financialYear) return "";

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
  if (!financialYear) return "";

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

const getInvoiceCustomerId = (invoice) =>
  String(
    invoice?.customerId ||
      invoice?.customer_id ||
      invoice?.customer?.id ||
      invoice?.customer?._id ||
      "",
  );

const getInvoiceCustomerName = (invoice) =>
  invoice?.customerName ||
  invoice?.customer_name ||
  invoice?.customer?.name ||
  invoice?.customer?.companyName ||
  invoice?.companyName ||
  invoice?.company?.name ||
  "Unknown Customer";

const getInvoiceNumber = (invoice) =>
  invoice?.invoiceNumber ||
  invoice?.invoice_number ||
  invoice?.invoiceNo ||
  invoice?.invoice_no ||
  invoice?.number ||
  invoice?.invoiceId ||
  "-";

const getInvoiceDate = (invoice) =>
  invoice?.invoiceDate ||
  invoice?.invoice_date ||
  invoice?.date ||
  invoice?.createdAt ||
  invoice?.created_at ||
  "";

const getInvoiceEditPath = (invoice) => {
  const invoiceId =
    invoice?.invoiceId || invoice?.id || invoice?._id || invoice?.invoice_id;

  if (!invoiceId) return null;

  return `/invoice/${invoiceId}`;
};

const getMonthBuckets = (startDate, endDate, showYear = false) => {
  if (!startDate || !endDate) return [];

  if (startDate > endDate) return [];

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

/* -------------------------------------------------------------------------- */
/* Tooltips                                                                   */
/* -------------------------------------------------------------------------- */

const SalesTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const sales = payload.find((item) => item.dataKey === "sales")?.value;

  return (
    <div className="sales-chart-tooltip">
      <span>{label}</span>
      <strong>{formatCurrency(sales)}</strong>
    </div>
  );
};

const InvoiceTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const invoices = payload.find((item) => item.dataKey === "invoices")?.value;

  return (
    <div className="sales-chart-tooltip">
      <span>{label}</span>
      <strong>
        {invoices} {invoices === 1 ? "Invoice" : "Invoices"}
      </strong>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

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

  const [invoicePage, setInvoicePage] = useState(1);

  /* ------------------------------------------------------------------------ */
  /* Company                                                                  */
  /* ------------------------------------------------------------------------ */

  const companyList = useSelector((state) => state.companies?.data || []);

  const activeCompanyId = String(
    companyList.find((company) => company?.isPrimary)?.companyId ||
      companyList[0]?.companyId ||
      "",
  );

  /* ------------------------------------------------------------------------ */
  /* Fetch invoices                                                           */
  /* ------------------------------------------------------------------------ */

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await invoiceApi.list(activeCompanyId || undefined);

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
            {
              numeric: true,
              sensitivity: "base",
            },
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

  /* ------------------------------------------------------------------------ */
  /* Dynamic Financial Years                                                  */
  /* ------------------------------------------------------------------------ */

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

  useEffect(() => {
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

    const currentFY = getFinancialYearLabel();

    if (currentFY) {
      setSelectedFinancialYear(normalizeFinancialYear(currentFY));
    }
  }, [financialYearOptions, selectedFinancialYear]);

  /* ------------------------------------------------------------------------ */
  /* Customers                                                                */
  /* ------------------------------------------------------------------------ */

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
        customerMap.set(id, {
          name,
          city,
        });
      }
    });

    return Array.from(customerMap, ([id, customer]) => ({
      id,
      ...customer,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  /* ------------------------------------------------------------------------ */
  /* Date range                                                               */
  /* ------------------------------------------------------------------------ */

  const dateRange = useMemo(() => {
    if (selectedFinancialYear === "custom") {
      return {
        startDate: customStartDate,
        endDate: customEndDate,
      };
    }

    return getFinancialYearDateRange(selectedFinancialYear);
  }, [selectedFinancialYear, customStartDate, customEndDate]);

  const isCustomDateRangeIncomplete =
    selectedFinancialYear === "custom" && (!customStartDate || !customEndDate);

  const isCustomDateRangeInvalid =
    selectedFinancialYear === "custom" &&
    customStartDate &&
    customEndDate &&
    customStartDate > customEndDate;

  /* ------------------------------------------------------------------------ */
  /* Matching invoices                                                        */
  /* ------------------------------------------------------------------------ */

  const matchingInvoices = useMemo(() => {
    const { startDate, endDate } = dateRange;

    if (!startDate || !endDate || isCustomDateRangeInvalid) {
      return [];
    }

    return invoices.filter((invoice) => {
      const invoiceDate = normalizeInvoiceDate(getInvoiceDate(invoice));

      if (!invoiceDate) {
        return false;
      }

      const matchesDate = invoiceDate >= startDate && invoiceDate <= endDate;

      const customerId = getInvoiceCustomerId(invoice);

      const matchesCustomer =
        selectedCustomer === "all" || customerId === selectedCustomer;

      return matchesDate && matchesCustomer;
    });
  }, [invoices, dateRange, selectedCustomer, isCustomDateRangeInvalid]);

  /* ------------------------------------------------------------------------ */
  /* Summary                                                                  */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Total customers                                                          */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Top Customers                                                            */
  /* ------------------------------------------------------------------------ */

  const topCustomers = useMemo(() => {
    const customerMap = new Map();

    matchingInvoices.forEach((invoice) => {
      const customerId = getInvoiceCustomerId(invoice);

      if (!customerId) {
        return;
      }

      const customerName = getInvoiceCustomerName(invoice);

      const currentSales = customerMap.get(customerId)?.sales || 0;

      customerMap.set(customerId, {
        id: customerId,
        name: customerName,
        sales: currentSales + (Number(invoice?.totalAmount) || 0),
      });
    });

    const sortedCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const maximumSales =
      sortedCustomers.length > 0 ? sortedCustomers[0].sales : 0;

    return sortedCustomers.map((customer, index) => ({
      ...customer,
      rank: index + 1,
      percentage: maximumSales > 0 ? (customer.sales / maximumSales) * 100 : 0,
    }));
  }, [matchingInvoices]);

  /* ------------------------------------------------------------------------ */
  /* Monthly sales                                                            */
  /* ------------------------------------------------------------------------ */

  const monthlySales = useMemo(() => {
    const showYear =
      selectedFinancialYear === "custom" &&
      dateRange.startDate &&
      dateRange.endDate &&
      dateRange.startDate.slice(0, 4) !== dateRange.endDate.slice(0, 4);

    const buckets = getMonthBuckets(
      dateRange.startDate,
      dateRange.endDate,
      showYear,
    );

    const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    matchingInvoices.forEach((invoice) => {
      const date = normalizeInvoiceDate(getInvoiceDate(invoice));

      if (!date) {
        return;
      }

      const key = date.slice(0, 7);
      const bucket = bucketMap.get(key);

      if (!bucket) {
        return;
      }

      bucket.sales += Number(invoice?.totalAmount) || 0;

      bucket.invoices += 1;
    });

    return buckets;
  }, [matchingInvoices, dateRange, selectedFinancialYear]);

  /* ------------------------------------------------------------------------ */
  /* Invoice activity                                                         */
  /* ------------------------------------------------------------------------ */

  const invoiceActivity = useMemo(
    () =>
      monthlySales.map((month) => ({
        ...month,
      })),
    [monthlySales],
  );

  /* ------------------------------------------------------------------------ */
  /* GST chart                                                                */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Invoice search                                                            */
  /* ------------------------------------------------------------------------ */

  const displayedInvoices = useMemo(() => {
    const search = invoiceSearch.trim().toLowerCase();

    const filtered = !search
      ? matchingInvoices
      : matchingInvoices.filter((invoice) => {
          const invoiceNumber = String(getInvoiceNumber(invoice)).toLowerCase();

          const customerName = String(
            getInvoiceCustomerName(invoice),
          ).toLowerCase();

          return (
            invoiceNumber.includes(search) || customerName.includes(search)
          );
        });

    return [...filtered].sort((firstInvoice, secondInvoice) =>
      String(getInvoiceNumber(secondInvoice)).localeCompare(
        String(getInvoiceNumber(firstInvoice)),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      ),
    );
  }, [matchingInvoices, invoiceSearch]);

  /* ------------------------------------------------------------------------ */
  /* Pagination                                                               */
  /* ------------------------------------------------------------------------ */

  const totalInvoicePages = Math.ceil(
    displayedInvoices.length / INVOICES_PER_PAGE,
  );

  const paginatedInvoices = useMemo(() => {
    const startIndex = (invoicePage - 1) * INVOICES_PER_PAGE;

    return displayedInvoices.slice(startIndex, startIndex + INVOICES_PER_PAGE);
  }, [displayedInvoices, invoicePage]);

  useEffect(() => {
    setInvoicePage(1);
  }, [
    invoiceSearch,
    selectedCustomer,
    selectedFinancialYear,
    customStartDate,
    customEndDate,
  ]);

  useEffect(() => {
    if (totalInvoicePages > 0 && invoicePage > totalInvoicePages) {
      setInvoicePage(totalInvoicePages);
    }
  }, [invoicePage, totalInvoicePages]);

  /* ------------------------------------------------------------------------ */
  /* Handlers                                                                 */
  /* ------------------------------------------------------------------------ */

  const handlePeriodChange = (event) => {
    setSelectedFinancialYear(event.target.value);

    if (event.target.value !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  const handleStartDateChange = (event) => {
    setCustomStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setCustomEndDate(event.target.value);
  };

  const goToPreviousPage = () => {
    setInvoicePage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setInvoicePage((page) => Math.min(totalInvoicePages, page + 1));
  };

  const handleInvoiceClick = (invoice) => {
    const path = getInvoiceEditPath(invoice);

    if (!path) {
      showErrorToast("Invoice ID is missing.");

      return;
    }

    navigate(path);
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="sales-dashboard">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="sales-header">
        <div className="sales-title">
          <h1>Sales Summary</h1>
          <p>Track your sales, taxes and invoices</p>
        </div>

        <div className="sales-filter-row">
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
                  {customer.name}
                  {customer.city ? ` - ${customer.city}` : ""}
                </option>
              ))}
            </select>
          </div>

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

      {/* ------------------------------------------------------------------ */}
      {/* Date status                                                         */}
      {/* ------------------------------------------------------------------ */}

      {isCustomDateRangeIncomplete && selectedFinancialYear === "custom" && (
        <div className="sales-date-message">
          <i className="bi bi-info-circle" />
          <span>Select both From and To dates to view sales.</span>
        </div>
      )}

      {isCustomDateRangeInvalid && (
        <div className="sales-date-message sales-date-error">
          <i className="bi bi-exclamation-triangle" />
          <span>From date cannot be later than To date.</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Loading / Error                                                      */}
      {/* ------------------------------------------------------------------ */}

      {isLoading ? (
        <div className="sales-empty-state">
          <div className="sales-loading-spinner" />
          <p>Loading sales data...</p>
        </div>
      ) : hasLoadError ? (
        <div className="sales-empty-state sales-error-state">
          <div className="sales-empty-icon">
            <i className="bi bi-exclamation-triangle" />
          </div>

          <h3>Unable to load sales data</h3>

          <p>Please try again to load the invoice information.</p>

          <button
            type="button"
            className="sales-retry-button"
            onClick={fetchInvoices}
          >
            <i className="bi bi-arrow-clockwise" />
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------------- */}
          {/* KPI Cards                                                        */}
          {/* -------------------------------------------------------------- */}

          <div className="sales-kpi-grid">
            <div className="sales-kpi-card sales-kpi-primary">
              <div className="sales-kpi-icon">
                <i className="bi bi-currency-rupee" />
              </div>

              <div className="sales-kpi-content">
                <span>Total Sales</span>
                <strong>{formatCompactCurrency(summary.sales)}</strong>
                <small>{formatCurrency(summary.sales)}</small>
              </div>
            </div>

            <div className="sales-kpi-card sales-kpi-cgst">
              <div className="sales-kpi-icon">
                <i className="bi bi-building" />
              </div>

              <div className="sales-kpi-content">
                <span>CGST</span>
                <strong>{formatCompactCurrency(summary.cgst)}</strong>
                <small>Central GST</small>
              </div>
            </div>

            <div className="sales-kpi-card sales-kpi-sgst">
              <div className="sales-kpi-icon">
                <i className="bi bi-geo-alt" />
              </div>

              <div className="sales-kpi-content">
                <span>SGST</span>
                <strong>{formatCompactCurrency(summary.sgst)}</strong>
                <small>State GST</small>
              </div>
            </div>

            <div className="sales-kpi-card sales-kpi-igst">
              <div className="sales-kpi-icon">
                <i className="bi bi-globe2" />
              </div>

              <div className="sales-kpi-content">
                <span>IGST</span>
                <strong>{formatCompactCurrency(summary.igst)}</strong>
                <small>Integrated GST</small>
              </div>
            </div>

            <div className="sales-kpi-card sales-kpi-invoices">
              <div className="sales-kpi-icon">
                <i className="bi bi-receipt" />
              </div>

              <div className="sales-kpi-content">
                <span>Invoices</span>
                <strong>{matchingInvoices.length}</strong>
                <small>In selected period</small>
              </div>
            </div>

            <div className="sales-kpi-card sales-kpi-customers">
              <div className="sales-kpi-icon">
                <i className="bi bi-people" />
              </div>

              <div className="sales-kpi-content">
                <span>Customers</span>
                <strong>{totalCustomers}</strong>
                <small>Active customers</small>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Charts Row                                                       */}
          {/* -------------------------------------------------------------- */}

          <div className="sales-main-grid">
            {/* GST Donut */}
            <div className="sales-chart-card gst-card">
              <div className="sales-card-header">
                <div>
                  <h2>GST Summary</h2>
                  <p>Tax collected in the selected period</p>
                </div>

                <div className="chart-summary">
                  <span>GST</span>
                  <strong>{formatCompactCurrency(totalGst)}</strong>
                </div>
              </div>

              {taxData.length > 0 ? (
                <div className="gst-content">
                  <div className="gst-donut-wrapper">
                    <ResponsiveContainer width="100%" height={235}>
                      <PieChart>
                        <Pie
                          data={taxData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={94}
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={4}
                          cornerRadius={10}
                          stroke="none"
                        >
                          {taxData.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={TAX_COLORS[entry.name]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="gst-donut-center">
                      <span>Total GST</span>

                      <strong>{formatCompactCurrency(totalGst)}</strong>

                      <small>Tax collected</small>
                    </div>
                  </div>

                  <div className="tax-legend">
                    {taxData.map((item) => (
                      <div className="tax-legend-item" key={item.name}>
                        <div className="tax-legend-left">
                          <span
                            className="tax-dot"
                            style={{
                              backgroundColor: TAX_COLORS[item.name],
                            }}
                          />

                          <span>{item.name}</span>
                        </div>

                        <div className="tax-legend-right">
                          <strong>{formatCurrency(item.value)}</strong>

                          <small>{item.percentage}%</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chart-empty-state">
                  No GST data for the selected period.
                </div>
              )}
            </div>

            {/* Monthly Sales */}
            <div className="sales-chart-card">
              <div className="sales-card-header">
                <div>
                  <h2>Monthly Sales</h2>
                  <p>Sales trend for the selected period</p>
                </div>

                <div className="chart-summary">
                  <span>Total</span>
                  <strong>{formatCompactCurrency(summary.sales)}</strong>
                </div>
              </div>

              <div className="chart-container">
                {monthlySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height={310}>
                    <AreaChart
                      data={monthlySales}
                      margin={{
                        top: 10,
                        right: 10,
                        left: 0,
                        bottom: 0,
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
                          <stop
                            offset="0%"
                            stopColor="#6366f1"
                            stopOpacity={0.35}
                          />
                          <stop
                            offset="100%"
                            stopColor="#6366f1"
                            stopOpacity={0.03}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e2e8f0"
                        vertical={false}
                      />

                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                        dy={8}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fontSize: 11,
                          fill: "#64748b",
                        }}
                        tickFormatter={formatCompactCurrency}
                        width={58}
                      />

                      <Tooltip
                        content={<SalesTooltip />}
                        cursor={{
                          stroke: "#cbd5e1",
                          strokeDasharray: "4 4",
                        }}
                      />

                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        fill="url(#salesGradient)"
                        dot={false}
                        activeDot={{
                          r: 5,
                          strokeWidth: 3,
                          stroke: "#ffffff",
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty-state">
                    No sales data for the selected period.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Top Customers                                                    */}
          {/* -------------------------------------------------------------- */}

          <div className="sales-chart-card top-customers-card">
            <div className="sales-card-header">
              <div>
                <h2>Top Customers</h2>
                <p>Customers generating the highest sales</p>
              </div>

              <div className="chart-summary">
                <span>Top 5</span>
                <strong>{topCustomers.length}</strong>
              </div>
            </div>

            {topCustomers.length > 0 ? (
              <div className="top-customers-list">
                {topCustomers.map((customer) => (
                  <div className="top-customer-item" key={customer.id}>
                    <div className="top-customer-rank">{customer.rank}</div>

                    <div className="top-customer-details">
                      <div className="top-customer-info">
                        <div className="top-customer-name">{customer.name}</div>

                        <strong>{formatCompactCurrency(customer.sales)}</strong>
                      </div>

                      <div className="top-customer-progress">
                        <span
                          style={{
                            width: `${customer.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty-state">
                No customer sales data for the selected period.
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Invoice Activity                                                 */}
          {/* -------------------------------------------------------------- */}

          <div className="sales-chart-card invoice-activity-card">
            <div className="sales-card-header">
              <div>
                <h2>Invoice Activity</h2>
                <p>Number of invoices raised each month</p>
              </div>

              <div className="chart-summary">
                <span>Invoices</span>
                <strong>{matchingInvoices.length}</strong>
              </div>
            </div>

            <div className="chart-container">
              {invoiceActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={invoiceActivity}
                    margin={{
                      top: 25,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                      dy={8}
                    />

                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fontSize: 11,
                        fill: "#64748b",
                      }}
                      width={34}
                    />

                    <Tooltip
                      content={<InvoiceTooltip />}
                      cursor={{
                        fill: "#f8fafc",
                      }}
                    />

                    <Bar
                      dataKey="invoices"
                      fill="#10b981"
                      radius={[7, 7, 0, 0]}
                      barSize={34}
                    >
                      <LabelList
                        dataKey="invoices"
                        position="top"
                        fill="#475569"
                        fontSize={11}
                        fontWeight={600}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">
                  No invoice activity for the selected period.
                </div>
              )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Invoice Table                                                     */}
          {/* -------------------------------------------------------------- */}

          <div className="sales-invoice-card">
            <div className="invoice-card-header">
              <div>
                <h2>Invoices</h2>
                <p>Detailed invoice activity for the selected period</p>
              </div>

              <div className="invoice-header-right">
                <span className="invoice-count">
                  {displayedInvoices.length}{" "}
                  {displayedInvoices.length === 1 ? "invoice" : "invoices"}
                </span>

                <div className="invoice-search">
                  <span className="invoice-search-icon">
                    <i className="bi bi-search" />
                  </span>

                  <input
                    type="text"
                    placeholder="Search invoice or customer..."
                    value={invoiceSearch}
                    onChange={(event) => setInvoiceSearch(event.target.value)}
                  />

                  {invoiceSearch && (
                    <button
                      type="button"
                      className="invoice-search-clear"
                      onClick={() => setInvoiceSearch("")}
                      aria-label="Clear search"
                    >
                      <i className="bi bi-x" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {paginatedInvoices.length > 0 ? (
              <>
                <div className="invoice-table-wrapper">
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Location</th>
                        <th>Tax</th>
                        <th className="amount-column">Amount</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedInvoices.map((invoice, index) => {
                        const customerName = getInvoiceCustomerName(invoice);

                        const location = getCustomerLocation(
                          invoice?.customer?.address ||
                            invoice?.address ||
                            invoice?.customerAddress ||
                            invoice?.customer_address ||
                            "",
                        );

                        const tax =
                          (Number(invoice?.cgst) || 0) +
                          (Number(invoice?.sgst) || 0) +
                          (Number(invoice?.igst) || 0);

                        return (
                          <tr
                            key={
                              invoice?.invoiceId ||
                              invoice?.id ||
                              `${getInvoiceNumber(invoice)}-${index}`
                            }
                            className="invoice-row"
                            onClick={() => handleInvoiceClick(invoice)}
                            title="Click to edit invoice"
                          >
                            <td>
                              <div className="invoice-number-cell">
                                <span className="invoice-table-icon">
                                  <i className="bi bi-receipt" />
                                </span>

                                <strong>{getInvoiceNumber(invoice)}</strong>
                              </div>
                            </td>

                            <td>{formatDate(getInvoiceDate(invoice))}</td>

                            <td>
                              <div className="invoice-customer-cell">
                                <strong>{customerName}</strong>
                              </div>
                            </td>

                            <td>
                              <span className="invoice-location">
                                {location || "-"}
                              </span>
                            </td>

                            <td>
                              <span className="invoice-tax">
                                {formatCurrency(tax)}
                              </span>
                            </td>

                            <td className="amount-column">
                              <strong className="invoice-amount">
                                {formatCurrency(invoice?.totalAmount)}
                              </strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalInvoicePages > 1 && (
                  <div className="invoice-pagination-footer">
                    <div className="invoice-pagination-info">
                      Showing{" "}
                      <strong>
                        {(invoicePage - 1) * INVOICES_PER_PAGE + 1}
                      </strong>
                      {" - "}
                      <strong>
                        {Math.min(
                          invoicePage * INVOICES_PER_PAGE,
                          displayedInvoices.length,
                        )}
                      </strong>
                      {" of "}
                      <strong>{displayedInvoices.length}</strong> invoices
                    </div>

                    <div className="invoice-pagination">
                      <button
                        type="button"
                        className="invoice-pagination-button"
                        onClick={goToPreviousPage}
                        disabled={invoicePage === 1}
                        aria-label="Previous page"
                      >
                        <i className="bi bi-chevron-left" />
                      </button>

                      {Array.from(
                        {
                          length: totalInvoicePages,
                        },
                        (_, index) => index + 1,
                      ).map((page) => (
                        <button
                          key={page}
                          type="button"
                          className={`invoice-pagination-button ${
                            invoicePage === page ? "active" : ""
                          }`}
                          onClick={() => setInvoicePage(page)}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="invoice-pagination-button"
                        onClick={goToNextPage}
                        disabled={invoicePage === totalInvoicePages}
                        aria-label="Next page"
                      >
                        <i className="bi bi-chevron-right" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="invoice-empty-state">
                <div className="invoice-empty-icon">
                  <i className="bi bi-receipt" />
                </div>

                <h3>No invoices found</h3>

                <p>
                  No invoices match the selected filters or search criteria.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Sales;
