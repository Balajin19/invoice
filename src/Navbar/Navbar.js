import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { removeCookie } from "../utils/cookies";
import { clearUserState } from "../store/user";
import "./Navbar.css";
import { showSuccessToast } from "../utils/helpers";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const enterpriseName = useSelector((state) => {
    const companies = state.companies?.data || [];
    const primaryCompany =
      companies.find((company) => company?.isPrimary) || companies[0] || {};

    return primaryCompany?.companyName || "INVOICE APP";
  });
  const userProfile = useSelector((state) => state.user.profile);
  const isUserLoading = useSelector((state) => state.user.loading);
  const userName = (userProfile?.name || "").trim();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);

  const dropdownRef = useRef();
  const closingRef = useRef(false);

  const isActive = (path) => (location.pathname === path ? "active-link" : "");

  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const closeMenu = () => {
    closingRef.current = true;
    setShowHamburgerMenu(false);

    setTimeout(() => {
      closingRef.current = false;
    }, 300);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideNav =
        e.target.closest(".nav-right") || e.target.closest(".hamburger-toggle");

      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }

      if (!clickedInsideNav) {
        closeMenu();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleUserDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown((prev) => !prev);
  };

  return (
    <nav className="navbar navbar-expand-lg custom-navbar">
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <h4 className="brand">
          <Link to="/" className="brand">
            {enterpriseName}
          </Link>
        </h4>

        <div className="hamburger-toggle">
          <i
            className="bi bi-list"
            onClick={(e) => {
              e.stopPropagation();
              if (showHamburgerMenu) {
                closeMenu();
              } else {
                setShowHamburgerMenu(true);
              }
            }}
          ></i>
        </div>

        <div
          className={`nav-right d-flex align-items-center gap-3 ${
            showHamburgerMenu ? "show-menu" : ""
          }`}
        >
          <div className="nav-links" onClick={closeMenu}>
            <Link className={isActive("/create-invoice")} to="/create-invoice">
              Invoice
            </Link>
            <Link className={isActive("/invoice-list")} to="/invoice-list">
              Invoice List
            </Link>
            <Link className={isActive("/products")} to="/products">
              Products
            </Link>
            <Link className={isActive("/categories")} to="/categories">
              Categories
            </Link>
            <Link className={isActive("/customers")} to="/customers">
              Customers
            </Link>
          </div>

          <div className="user-menu" ref={dropdownRef}>
            <span
              className={`user-text ${
                showHamburgerMenu || closingRef.current ? "show-user" : ""
              } ${isUserLoading ? "user-text-loading" : ""}`}
              onClick={toggleUserDropdown}
            >
              {userName || "Profile"}
            </span>

            <i
              className={`bi bi-person-circle user-icon ${
                showHamburgerMenu || closingRef.current ? "hide-icon" : ""
              }`}
              onClick={toggleUserDropdown}
            ></i>

            {showDropdown && (
              <div className="dropdown-menu-custom">
                <Link to="/profile" onClick={() => setShowDropdown(false)}>
                  <i className="bi bi-person me-2"></i> Profile
                </Link>

                <Link to="/settings" onClick={() => setShowDropdown(false)}>
                  <i className="bi bi-gear me-2"></i> Settings
                </Link>

                <div
                  className="dropdown-item logout"
                  onClick={() => {
                    removeCookie("token");
                    removeCookie("tokenType");
                    dispatch(clearUserState());
                    showSuccessToast("Logged out successfully");
                    navigate("/login");
                    setShowDropdown(false);
                  }}
                >
                  <i className="bi bi-box-arrow-right me-2"></i> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
