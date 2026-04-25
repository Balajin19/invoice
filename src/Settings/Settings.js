import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { settingsApi } from "../services/api";
import { fetchCompanies } from "../store/companies";
import { fetchBanks } from "../store/banks";
import { fetchInvoiceSettings } from "../store/invoiceSettings";
import {
  confirmAndHandleDelete,
  showErrorToast,
  showSuccessToast,
  toUpperCaseText,
} from "../utils/helpers";
import "./Settings.css";

function Settings() {
  const dispatch = useDispatch();
  const { requestConfirmation, ConfirmModal } = useConfirmModal();
  const companiesState = useSelector((state) => state.companies);
  const banksState = useSelector((state) => state.banks);
  const invoiceSettingsState = useSelector((state) => state.invoiceSettings);

  const companies = useMemo(
    () => companiesState.data || [],
    [companiesState.data],
  );
  const banks = useMemo(() => banksState.data || [], [banksState.data]);
  const invoiceData = useMemo(
    () => invoiceSettingsState.data || {},
    [invoiceSettingsState.data],
  );

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeTab, setActiveTab] = useState("company");

  const isLoading =
    isInitialLoad &&
    (companiesState.loading ||
      banksState.loading ||
      invoiceSettingsState.loading);
  const settingsError =
    activeTab === "company"
      ? companiesState.error
      : activeTab === "bank"
        ? banksState.error
        : invoiceSettingsState.error;
  const [isSaving, setIsSaving] = useState(false);

  const [company, setCompany] = useState({
    companyId: "",
    companyName: "",
    ownerName: "",
    cgstRate: 0,
    sgstRate: 0,
    igstRate: 0,
    buildingNumber: "",
    street: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    gstin: "",
    email: "",
    website: "",
    mobileNumber: "",
    isPrimary: false,
  });

  const [bank, setBank] = useState({
    id: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    bankName: "",
    branch: "",
    upi: "",
    isPrimary: false,
  });

  const [invoice, setInvoice] = useState({
    id: "",
    prefix: "",
    startNumber: 1,
    currentNumber: 0,
    padLength: 3,
    terms: "",
    financialYear: "",
  });
  const [companyOptions, setCompanyOptions] = useState([]);
  const [bankOptions, setBankOptions] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

  const getCompanyId = (item) => String(item?.companyId || "");
  const normalizeMobileNumber = (value) =>
    String(value || "")
      .replace(/^\+91\s*/i, "")
      .trim();
  const formatMobileNumberForPayload = (value) => {
    const normalized = normalizeMobileNumber(value);
    return normalized ? `+91 ${normalized}` : "";
  };

  useEffect(() => {
    if (companies.length > 0) {
      setCompanyOptions(companies);
      const selectedCompany =
        companies.find((item) => item?.isPrimary) || companies[0];
      setSelectedCompanyId(getCompanyId(selectedCompany));
      setCompany(selectedCompany || {});
    }
    if (banks.length > 0) {
      setBankOptions(banks);
      const selectedBank = banks.find((item) => item?.isPrimary) || banks[0];
      setSelectedBankId(selectedBank?.id || "");
      setBank(selectedBank || {});
    }
  }, [companies, banks]);

  useEffect(() => {
    setInvoice(invoiceData);
  }, [invoiceData]);

  useEffect(() => {
    dispatch(fetchCompanies()).catch(() => {});
    dispatch(fetchBanks()).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!selectedCompanyId) return;

    dispatch(fetchInvoiceSettings(selectedCompanyId)).catch(() => {});
  }, [dispatch, selectedCompanyId]);

  useEffect(() => {
    if (companies.length > 0 || banks.length > 0) {
      setIsInitialLoad(false);
    }
  }, [companies, banks]);

  const handleCompanyChange = (e) => {
    const { name, value, type, checked } = e.target;
    const uppercaseFields = new Set([
      "companyName",
      "ownerName",
      "street",
      "city",
      "district",
      "state",
      "buildingNumber",
      "gstin",
    ]);

    setCompany((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "mobileNumber"
            ? normalizeMobileNumber(value)
            : uppercaseFields.has(name)
              ? toUpperCaseText(value)
              : value,
    }));
  };

  const handleBankChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBank((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCompanySelect = async (e) => {
    const companyId = e.target.value;
    setSelectedCompanyId(companyId);

    if (!companyId) {
      setCompany({
        companyId: "",
        companyName: "",
        ownerName: "",
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        buildingNumber: "",
        street: "",
        city: "",
        district: "",
        state: "",
        pincode: "",
        gstin: "",
        email: "",
        website: "",
        mobileNumber: "",
        isPrimary: false,
      });
      return;
    }

    try {
      const response = await settingsApi.getCompanyById(companyId);
      const payload = response?.data?.company || response?.data || {};
      setCompany(payload);
    } catch (error) {
      showErrorToast(
        error?.response?.data?.message ||
          "Unable to load company details. Please try again.",
      );
    }
  };

  const handleBankSelect = async (e) => {
    const bankId = e.target.value;
    setSelectedBankId(bankId);

    if (!bankId) {
      setBank({
        id: "",
        accountName: "",
        accountNumber: "",
        ifsc: "",
        bankName: "",
        branch: "",
        upi: "",
        isPrimary: false,
      });
      return;
    }

    try {
      const response = await settingsApi.getBankById(bankId);
      const payload = response?.data?.bank || response?.data || {};
      setBank(payload);
    } catch (error) {
      showErrorToast(
        error?.response?.data?.message ||
          "Unable to load bank details. Please try again.",
      );
    }
  };

  const handleInvoiceChange = (e) => {
    const { name, value } = e.target;

    setInvoice((prev) => ({
      ...prev,
      [name]:
        name === "startNumber" ||
        name === "currentNumber" ||
        name === "padLength"
          ? Number(value)
          : value,
    }));
  };

  const validate = () => {
    if (activeTab === "company") {
      if (!company.companyName?.trim()) {
        showErrorToast("Please enter Company Name");
        return false;
      }
      if (!company.buildingNumber?.trim()) {
        showErrorToast("Please enter Building Number");
        return false;
      }
      if (!company.city?.trim()) {
        showErrorToast("Please enter City");
        return false;
      }
      if (!company.district?.trim()) {
        showErrorToast("Please enter District");
        return false;
      }
      if (!company.state?.trim()) {
        showErrorToast("Please enter State");
        return false;
      }
      if (!company.pincode?.trim()) {
        showErrorToast("Please enter Pincode");
        return false;
      }
      if (!company.gstin?.trim()) {
        showErrorToast("Please enter GSTIN");
        return false;
      }
      if (!company.email?.trim()) {
        showErrorToast("Please enter Email");
        return false;
      }
      if (!company.mobileNumber?.trim()) {
        showErrorToast("Please enter Mobile Number");
        return false;
      }
    } else if (activeTab === "bank") {
      if (!bank.accountName?.trim()) {
        showErrorToast("Please enter Account Name");
        return false;
      }
      if (!bank.accountNumber?.trim()) {
        showErrorToast("Please enter Account Number");
        return false;
      }
      if (!bank.ifsc?.trim()) {
        showErrorToast("Please enter IFSC");
        return false;
      }
      if (!bank.bankName?.trim()) {
        showErrorToast("Please enter Bank Name");
        return false;
      }
      if (!bank.branch?.trim()) {
        showErrorToast("Please enter Branch");
        return false;
      }
    } else if (activeTab === "invoice") {
      if (!invoice.prefix?.trim()) {
        showErrorToast("Please enter Invoice Prefix");
        return false;
      }
      if (!invoice.startNumber || invoice.startNumber <= 0) {
        showErrorToast("Please enter a valid Start Number");
        return false;
      }
      if (!invoice.padLength || invoice.padLength <= 0) {
        showErrorToast("Please enter a valid Pad Length");
        return false;
      }
    }
    return true;
  };

  const handleSaveSettings = async () => {
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (activeTab === "company") {
        const companyPayload = {
          ...company,
          companyName: (company.companyName || "").trim(),
          ownerName: (company.ownerName || "").trim(),
          street: (company.street || "").trim(),
          city: (company.city || "").trim(),
          district: (company.district || "").trim(),
          state: (company.state || "").trim(),
          buildingNumber: (company.buildingNumber || "").trim(),
          gstin: (company.gstin || "").trim(),
          email: (company.email || "").trim(),
          website: (company.website || "").trim(),
          mobileNumber: formatMobileNumberForPayload(company.mobileNumber),
          cgstRate: Number(company.cgstRate) || 0,
          sgstRate: Number(company.sgstRate) || 0,
          igstRate: Number(company.igstRate) || 0,
          isPrimary: Boolean(company.isPrimary),
        };

        if (companyPayload.isPrimary) {
          const resetPrimaryCompanies = companies.filter(
            (item) =>
              Boolean(item.isPrimary) &&
              getCompanyId(item) !== String(selectedCompanyId),
          );

          await Promise.all(
            resetPrimaryCompanies.map((item) =>
              settingsApi.saveCompany(getCompanyId(item), {
                ...item,
                isPrimary: false,
              }),
            ),
          );
        }

        if (selectedCompanyId) {
          await settingsApi.saveCompany(selectedCompanyId, companyPayload);
        } else {
          await settingsApi.createCompany(companyPayload);
        }
        await dispatch(fetchCompanies());
      } else if (activeTab === "bank") {
        const bankPayload = {
          ...bank,
          isPrimary: Boolean(bank.isPrimary),
        };

        if (bankPayload.isPrimary) {
          const resetPrimaryBanks = banks.filter(
            (item) =>
              Boolean(item.isPrimary) &&
              String(item.id) !== String(selectedBankId),
          );

          await Promise.all(
            resetPrimaryBanks.map((item) =>
              settingsApi.saveBank(item.id, {
                ...item,
                isPrimary: false,
              }),
            ),
          );
        }

        if (selectedBankId) {
          await settingsApi.saveBank(selectedBankId, bankPayload);
        } else {
          await settingsApi.createBank(bankPayload);
        }
        await dispatch(fetchBanks());
      } else if (activeTab === "invoice") {
        const primaryCompany =
          companies.find((item) => item?.isPrimary) ||
          company ||
          companies[0] ||
          {};
        const resolvedCompanyId =
          selectedCompanyId || getCompanyId(primaryCompany);

        const invoicePayload = {
          companyId: resolvedCompanyId,
          invoicePrefix: invoice.prefix || "",
          startNumber: Number(invoice.startNumber) || 1,
          currentNumber: Number(invoice.currentNumber) || 0,
          padLength: Number(invoice.padLength) || 3,
          termsConditions: invoice.terms || "",
          financialYear: invoice.financialYear || "",
        };

        if (invoice?.id) {
          await settingsApi.updateInvoiceSetting(
            resolvedCompanyId,
            invoicePayload,
          );
        } else {
          await settingsApi.createInvoiceSetting(
            resolvedCompanyId,
            invoicePayload,
          );
        }
        await dispatch(fetchInvoiceSettings(resolvedCompanyId));
      }
      showSuccessToast(`${activeTab} settings saved successfully!`);
    } catch (error) {
      showErrorToast(
        error?.response?.data?.message ||
          "Unable to save settings. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCompany = () => {
    setSelectedCompanyId("");
    setCompany({
      companyId: "",
      companyName: "",
      ownerName: "",
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      buildingNumber: "",
      street: "",
      city: "",
      district: "",
      state: "",
      pincode: "",
      gstin: "",
      email: "",
      website: "",
      mobileNumber: "",
      isPrimary: false,
    });
  };

  const handleCreateBank = () => {
    setSelectedBankId("");
    setBank({
      id: "",
      accountName: "",
      accountNumber: "",
      ifsc: "",
      bankName: "",
      branch: "",
      upi: "",
      isPrimary: false,
    });
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompanyId) {
      showErrorToast("Please select a company to delete");
      return;
    }

    setIsSaving(true);
    try {
      await confirmAndHandleDelete({
        confirmMessage: (
          <>
            Are you sure you want to delete company{" "}
            <strong>{company.companyName}</strong>?
          </>
        ),
        confirmAction: (message) =>
          requestConfirmation({
            title: "Delete Company",
            message,
            confirmText: "Delete",
            cancelText: "Cancel",
          }),
        deleteAction: () => settingsApi.deleteCompany(selectedCompanyId),
        onSuccess: async () => {
          await dispatch(fetchCompanies());

          setSelectedCompanyId("");
          setCompany({
            companyId: "",
            companyName: "",
            ownerName: "",
            cgstRate: 0,
            sgstRate: 0,
            igstRate: 0,
            buildingNumber: "",
            street: "",
            city: "",
            district: "",
            state: "",
            pincode: "",
            gstin: "",
            email: "",
            website: "",
            mobileNumber: "",
            isPrimary: false,
          });
        },
        successMessage: "Company deleted successfully!",
        errorMessage: "Unable to delete company. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBank = async () => {
    if (!selectedBankId) {
      showErrorToast("Please select a bank to delete");
      return;
    }

    setIsSaving(true);
    try {
      await confirmAndHandleDelete({
        confirmMessage: (
          <>
            Are you sure you want to delete bank{" "}
            <strong>{bank.bankName}</strong>?
          </>
        ),
        confirmAction: (message) =>
          requestConfirmation({
            title: "Delete Bank",
            message,
            confirmText: "Delete",
            cancelText: "Cancel",
          }),
        deleteAction: () => settingsApi.deleteBank(selectedBankId),
        onSuccess: async () => {
          await dispatch(fetchBanks());

          setSelectedBankId("");
          setBank({
            id: "",
            accountName: "",
            accountNumber: "",
            ifsc: "",
            bankName: "",
            branch: "",
            upi: "",
            isPrimary: false,
          });
        },
        successMessage: "Bank deleted successfully!",
        errorMessage: "Unable to delete bank. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderTab = () => {
    switch (activeTab) {
      case "company":
        return (
          <div className="row">
            <div className="col-md-12 settings-selector">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label>Select Company</label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleCreateCompany}
                  >
                    + New
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleDeleteCompany}
                    disabled={!selectedCompanyId || isSaving}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <select
                className="form-select"
                value={selectedCompanyId}
                onChange={handleCompanySelect}
              >
                <option value="">Select Company</option>
                {companyOptions.map((item) => (
                  <option key={getCompanyId(item)} value={getCompanyId(item)}>
                    {item.companyName || ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label>Company Name</label>
              <input
                className="form-control"
                name="companyName"
                value={company.companyName || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6">
              <label>Building Number</label>
              <input
                className="form-control"
                name="buildingNumber"
                value={company.buildingNumber || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Owner Name</label>
              <input
                className="form-control"
                name="ownerName"
                value={company.ownerName || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Street</label>
              <input
                className="form-control"
                name="street"
                value={company.street || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>City</label>
              <input
                className="form-control"
                name="city"
                value={company.city || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>District</label>
              <input
                className="form-control"
                name="district"
                value={company.district || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>State</label>
              <input
                className="form-control"
                name="state"
                value={company.state || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Pincode</label>
              <input
                className="form-control"
                name="pincode"
                value={company.pincode || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>GSTIN</label>
              <input
                className="form-control"
                name="gstin"
                value={company.gstin || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Email</label>
              <input
                className="form-control"
                name="email"
                value={company.email || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Website</label>
              <input
                className="form-control"
                name="website"
                value={company.website || ""}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Mobile Number</label>
              <div className="input-group">
                <span className="input-group-text">+91</span>
                <input
                  className="form-control"
                  name="mobileNumber"
                  value={normalizeMobileNumber(company.mobileNumber || "")}
                  onChange={handleCompanyChange}
                />
              </div>
            </div>
            <div className="col-md-6 mt-3">
              <label>CGST Rate (%)</label>
              <input
                type="number"
                className="form-control"
                name="cgstRate"
                min="0"
                value={company.cgstRate || 0}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>SGST Rate (%)</label>
              <input
                type="number"
                className="form-control"
                name="sgstRate"
                min="0"
                value={company.sgstRate || 0}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>IGST Rate (%)</label>
              <input
                type="number"
                className="form-control"
                name="igstRate"
                min="0"
                value={company.igstRate || 0}
                onChange={handleCompanyChange}
              />
            </div>
            <div className="col-md-12 mt-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isPrimaryCompany"
                  name="isPrimary"
                  checked={Boolean(company.isPrimary)}
                  onChange={handleCompanyChange}
                />
                <label className="form-check-label" htmlFor="isPrimaryCompany">
                  Set as primary company
                </label>
              </div>
            </div>
          </div>
        );

      case "bank":
        return (
          <div className="row">
            <div className="col-md-12 settings-selector">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label>Select Bank</label>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={handleCreateBank}
                  >
                    + New
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={handleDeleteBank}
                    disabled={!selectedBankId || isSaving}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <select
                className="form-select"
                value={selectedBankId}
                onChange={handleBankSelect}
              >
                <option value="">Select Bank</option>
                {bankOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.accountName || "Unnamed Bank"}
                    {item.bankName ? ` - ${item.bankName}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label>Account Name</label>
              <input
                className="form-control"
                name="accountName"
                value={bank.accountName}
                onChange={handleBankChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label>Account Number</label>
              <input
                className="form-control"
                name="accountNumber"
                value={bank.accountNumber}
                onChange={handleBankChange}
                required
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>IFSC</label>
              <input
                className="form-control"
                name="ifsc"
                value={bank.ifsc}
                onChange={handleBankChange}
                required
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Bank Name</label>
              <input
                className="form-control"
                name="bankName"
                value={bank.bankName}
                onChange={handleBankChange}
                required
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Branch</label>
              <input
                className="form-control"
                name="branch"
                value={bank.branch}
                onChange={handleBankChange}
                required
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>UPI ID</label>
              <input
                className="form-control"
                name="upi"
                value={bank.upi}
                onChange={handleBankChange}
              />
            </div>
            <div className="col-md-12 mt-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isPrimaryBank"
                  name="isPrimary"
                  checked={Boolean(bank.isPrimary)}
                  onChange={handleBankChange}
                />
                <label className="form-check-label" htmlFor="isPrimaryBank">
                  Set as primary bank
                </label>
              </div>
            </div>
          </div>
        );

      case "invoice": {
        const primaryCompany = companies.find((c) => c.isPrimary);
        if (!primaryCompany) {
          return (
            <div className="alert alert-warning d-flex align-items-start gap-2 mt-2">
              <i className="bi bi-exclamation-triangle-fill fs-5 mt-1 flex-shrink-0"></i>
              <div>
                <strong>No primary company set.</strong>
                <div className="mt-1">
                  Please go to the <strong>Company</strong> tab, create a
                  company, and enable <strong>Mark as Primary</strong> before
                  configuring Invoice Settings.
                </div>
              </div>
            </div>
          );
        }
        return (
          <div className="row">
            <div className="col-md-6">
              <label>Financial Year</label>
              <input
                className="form-control"
                value={invoice.financialYear || ""}
                disabled
              />
            </div>
            <div className="col-md-6">
              <label>Invoice Prefix</label>
              <input
                className="form-control"
                name="prefix"
                value={invoice.prefix}
                onChange={handleInvoiceChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Start Number</label>
              <input
                type="number"
                className="form-control"
                name="startNumber"
                min="1"
                value={invoice.startNumber}
                onChange={handleInvoiceChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Current Number</label>
              <input
                type="number"
                className="form-control"
                name="currentNumber"
                min="0"
                value={invoice.currentNumber}
                onChange={handleInvoiceChange}
              />
            </div>
            <div className="col-md-6 mt-3">
              <label>Pad Length</label>
              <input
                type="number"
                className="form-control"
                name="padLength"
                min="1"
                value={invoice.padLength}
                onChange={handleInvoiceChange}
              />
            </div>
            <div className="col-md-12 mt-3">
              <label>Terms & Conditions</label>
              <textarea
                className="form-control"
                name="terms"
                rows="4"
                value={invoice.terms}
                onChange={handleInvoiceChange}
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <h3 className="page-title">
        <i className="bi bi-gear me-2 text-success"></i>Settings
      </h3>

      <div className="settings-layout">
        <div className="settings-tabs">
          <button
            className={activeTab === "company" ? "active" : ""}
            onClick={() => setActiveTab("company")}
          >
            Company
          </button>
          <button
            className={activeTab === "bank" ? "active" : ""}
            onClick={() => setActiveTab("bank")}
          >
            Bank
          </button>
          <button
            className={activeTab === "invoice" ? "active" : ""}
            onClick={() => setActiveTab("invoice")}
          >
            Invoice
          </button>
        </div>

        <div className="settings-content">
          {isLoading ? (
            <div className="settings-empty-state">Loading settings...</div>
          ) : settingsError ? (
            <div className="settings-empty-state text-danger">
              {settingsError}
            </div>
          ) : (
            renderTab()
          )}

          {!settingsError && (
            <button
              className="btn btn-success mt-4"
              onClick={handleSaveSettings}
              disabled={isLoading || isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </div>
      </div>

      <ConfirmModal />
    </div>
  );
}

export default Settings;
