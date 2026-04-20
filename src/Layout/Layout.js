import Navbar from "../Navbar/Navbar";
import { Outlet } from "react-router-dom";
import "./Layout.css";

function Layout() {
  return (
    <>
      <Navbar />

      <div className="page-container">
        <Outlet />
      </div>
    </>
  );
}

export default Layout;
