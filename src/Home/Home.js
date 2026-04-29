import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import "./Home.css";

function Home() {
  const navigate = useNavigate();
  const userProfile = useSelector((state) => state.user.profile);
  const isUserLoading = useSelector((state) => state.user.loading);
  const userName = (userProfile?.name || "").trim();

  const companyList = useSelector((state) => state.companies?.data || []);
  const companiesLoading = useSelector((state) => state.companies?.loading);
  const companiesLoaded = useSelector((state) => state.companies?.loaded);
  const bankList = useSelector((state) => state.banks?.data || []);
  const banksLoading = useSelector((state) => state.banks?.loading);
  const banksLoaded = useSelector((state) => state.banks?.loaded);
  const invoiceSettings = useSelector(
    (state) => state.invoiceSettings?.data || {},
  );
  const invoiceSettingsLoading = useSelector(
    (state) => state.invoiceSettings?.loading,
  );
  const invoiceSettingsLoaded = useSelector(
    (state) => state.invoiceSettings?.loaded,
  );

  const primaryCompany = companyList.find((company) => company?.isPrimary);
  const hasPrimaryCompany = Boolean(primaryCompany);
  const hasCompany = companyList.length > 0;
  const hasBank = bankList.length > 0;
  const hasInvoiceSettings = hasPrimaryCompany && Boolean(invoiceSettings?.id);

  const isDataLoading =
    companiesLoading || banksLoading || (hasCompany && invoiceSettingsLoading);

  const isInitialDataReady =
    companiesLoaded &&
    banksLoaded &&
    (!hasCompany || !hasPrimaryCompany || invoiceSettingsLoaded);

  const showSetupModal =
    isInitialDataReady &&
    !isDataLoading &&
    (!hasCompany || !hasBank || !hasInvoiceSettings);

  const setupSteps = [
    {
      label: "Company Details",
      desc: "Name, Address, GSTIN, Tax Rates",
      done: hasCompany,
      icon: "bi-building",
    },
    {
      label: "Bank Account",
      desc: "Account Number, Bank Name, IFSC",
      done: hasBank,
      icon: "bi-bank",
    },
    ...(hasCompany && !hasPrimaryCompany
      ? [
          {
            label: "Set Primary Company",
            desc: "Mark one company as primary",
            done: false,
            icon: "bi-star",
          },
        ]
      : []),
    ...(hasCompany
      ? [
          {
            label: "Invoice Settings",
            desc: "Prefix, Numbering, Terms & Conditions",
            done: hasInvoiceSettings,
            icon: "bi-receipt",
          },
        ]
      : []),
  ];

  const pendingCount = setupSteps.filter((s) => !s.done).length;

  const cards = [
    {
      title: "Create Invoice",
      icon: "bi-receipt",
      color: "blue",
      path: "/create-invoice",
      btn: "Create",
    },
    {
      title: "Invoice List",
      icon: "bi-card-list",
      color: "green",
      path: "/invoice-list",
      btn: "View",
    },
    {
      title: "Products",
      icon: "bi-box-seam",
      color: "orange",
      path: "/products",
      btn: "Manage",
    },
    {
      title: "Categories",
      icon: "bi-tags",
      color: "cyan",
      path: "/categories",
      btn: "Manage",
    },
    {
      title: "Customers",
      icon: "bi-people",
      color: "red",
      path: "/customers",
      btn: "Manage",
    },
    {
      title: "Profile",
      icon: "bi-person-circle",
      color: "navy",
      path: "/profile",
      btn: "Open",
    },
    {
      title: "Settings",
      icon: "bi-gear",
      color: "mint",
      path: "/settings",
      btn: "Open",
    },
  ];

  return (
    <div className="home">
      <h3 className="dashboard-title">
        Welcome {isUserLoading || !userName ? "" : userName.toUpperCase()}{" "}
        <i className="bi bi-hand-index-thumb me-2 text-warning"></i>
      </h3>
      <p className="text-muted">Manage your business efficiently</p>

      {showSetupModal && (
        <div className="setup-modal-overlay">
          <div className="setup-modal-card">
            <div className="setup-modal-icon">
              <i className="bi bi-gear-wide-connected text-warning"></i>
            </div>
            <h5>
              {pendingCount === 3
                ? "Welcome! Let's set up your business"
                : `${pendingCount} setup step${pendingCount > 1 ? "s" : ""} remaining`}
            </h5>
            <p className="text-muted">
              Complete the steps below to start creating invoices.
            </p>
            <div className="setup-steps">
              {setupSteps.map((step, i) => (
                <div
                  key={i}
                  className={`setup-step ${step.done ? "setup-step-done" : ""}`}
                >
                  <span className="setup-step-number">
                    {step.done ? <i className="bi bi-check-lg"></i> : i + 1}
                  </span>
                  <div className="setup-step-info">
                    <strong>{step.label}</strong>
                    <small>{step.desc}</small>
                  </div>
                  {step.done && <span className="setup-step-badge">Done</span>}
                </div>
              ))}
            </div>
            <button
              className="btn btn-success w-100 mt-3"
              onClick={() => navigate("/settings")}
            >
              <i className="bi bi-gear me-2"></i>Go to Settings
            </button>
          </div>
        </div>
      )}

      <div className="card-grid">
        {cards.map((card, index) => (
          <div key={index} className={`card-box ${card.color}`}>
            <i className={`bi ${card.icon}`}></i>
            <h5>{card.title}</h5>

            <Link to={card.path} className="card-btn">
              {card.btn}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;
