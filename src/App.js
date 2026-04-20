import "./App.css";
import { useEffect, useLayoutEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Layout from "./Layout/Layout";
import Login from "./Login/Login";
import Register from "./Login/Register";
import ForgotPassword from "./Login/ForgotPassword";
import Home from "./Home/Home";
import InvoiceForm from "./InvoiceForm/InvoiceForm";
import InvoiceList from "./InvoiceList/InvoiceList";
import Categories from "./Categories/Categories";
import CategoryForm from "./Categories/CategoryForm";
import Products from "./Products/Products";
import ProductForm from "./Products/ProductForm";
import Customers from "./Customers/Customers";
import CustomerForm from "./Customers/CustomerForm";
import InvoicePrint from "./InvoicePrint/InvoicePrint";
import Profile from "./Profile/Profile";
import Settings from "./Settings/Settings";
import ProtectedRoute from "./ProtectedRoutes/ProtectedRoute";
import { setApiLoaderHandler } from "./services/api";
import { useDispatch, useSelector } from "react-redux";
import { fetchCompanies } from "./store/companies";
import { fetchBanks } from "./store/banks";
import { fetchInvoiceSettings } from "./store/invoiceSettings";
import { fetchUserProfile } from "./store/user";
import { getCookie } from "./utils/cookies";

const getPageTitle = (pathname) => {
  if (pathname === "/") return "Home";
  if (pathname === "/login") return "Login";
  if (pathname === "/register") return "Register";
  if (pathname === "/forgot-password") return "Forgot Password";
  if (pathname === "/profile") return "Profile";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/create-invoice" || /^\/invoice\/[^/]+$/.test(pathname)) {
    return "Invoice";
  }
  if (pathname === "/invoice-list") return "Invoice List";
  if (pathname === "/invoice-print") return "Invoice Print";
  if (pathname === "/create-category") return "Category";
  if (pathname === "/categories") return "Categories";
  if (/^\/category\/[^/]+$/.test(pathname)) return "Category";
  if (pathname === "/create-product") return "Product";
  if (pathname === "/products") return "Products";
  if (/^\/product\/[^/]+$/.test(pathname)) return "Product";
  if (pathname === "/create-customer") return "Customer";
  if (pathname === "/customers") return "Customers";
  if (/^\/customer\/[^/]+$/.test(pathname)) return "Customer";

  return "Home";
};

function App() {
  const dispatch = useDispatch();
  const location = useLocation();
  const companyList = useSelector((state) => state.companies?.data || []);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
  const [holdLoader, setHoldLoader] = useState(false);

  const selectedCompanyName =
    companyList.find((company) => company?.isPrimary)?.companyName ||
    companyList[0]?.companyName ||
    "SK ENTERPRISES";
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    setApiLoaderHandler(setIsApiLoading);

    return () => {
      setApiLoaderHandler(() => {});
    };
  }, []);

  useLayoutEffect(() => {
    setIsRouteTransitioning(true);

    const transitionTimer = setTimeout(() => {
      setIsRouteTransitioning(false);
    }, 350);

    return () => clearTimeout(transitionTimer);
  }, [location.pathname]);

  useEffect(() => {
    const initializeAppData = async () => {
      if (!getCookie("token")) {
        return;
      }

      let companies = [];

      try {
        companies = await dispatch(fetchCompanies());
      } catch {
        companies = [];
      }

      dispatch(fetchBanks()).catch(() => {});

      const selectedCompany =
        companies.find((company) => company?.isPrimary) || companies[0];
      const selectedCompanyId = selectedCompany?.companyId || "";

      if (selectedCompanyId) {
        dispatch(fetchInvoiceSettings(selectedCompanyId)).catch(() => {});
      }

      dispatch(fetchUserProfile()).catch(() => {});
    };

    initializeAppData();
  }, [dispatch]);

  const isBusy = isApiLoading || isRouteTransitioning;
  const showGlobalLoader = isBusy || holdLoader;

  useEffect(() => {
    if (isBusy) {
      setHoldLoader(true);
      return undefined;
    }

    const hideTimer = setTimeout(() => {
      setHoldLoader(false);
    }, 250);

    return () => clearTimeout(hideTimer);
  }, [isBusy]);

  useEffect(() => {
    document.title = `${selectedCompanyName} | ${pageTitle}`;
  }, [pageTitle, selectedCompanyName]);

  return (
    <div className="app">
      {showGlobalLoader && (
        <div className="global-loader-overlay" role="status" aria-live="polite">
          <div className="spinner-border text-primary" aria-hidden="true"></div>
          <span>Loading...</span>
        </div>
      )}

      <div className="app-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/create-invoice" element={<InvoiceForm />} />
            <Route path="/invoice/:id" element={<InvoiceForm />} />
            <Route path="/invoice-list" element={<InvoiceList />} />
            <Route path="/invoice-print" element={<InvoicePrint />} />
            <Route path="/create-product" element={<ProductForm />} />
            <Route path="/create-category" element={<CategoryForm />} />
            <Route path="/create-customer" element={<CustomerForm />} />
            <Route path="/category/:id" element={<CategoryForm />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer/:id" element={<CustomerForm />} />
            <Route path="/product/:id" element={<ProductForm />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
          </Route>
        </Routes>

        <ToastContainer position="top-right" />
      </div>
    </div>
  );
}

export default App;
