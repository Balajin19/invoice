import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { authApi } from "../services/api";
import { setCookie, getCookie } from "../utils/cookies";
import "./Login.css";
import { Navigate } from "react-router-dom";
import { fetchUserProfile } from "../store/user";
import { fetchCompanies } from "../store/companies";
import { showSuccessToast } from "../utils/helpers";

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = getCookie("token");

  if (token) {
    return <Navigate to="/" replace />;
  }
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        email: formData.email,
        password: formData.password,
      };

      const response = await authApi.login(payload);

      const accessToken = response?.data?.accessToken || response?.data?.token;
      const tokenType = response?.data?.tokenType;
      const expiresIn = Number(response?.data?.expiresIn || 0);
      const expiryDays = expiresIn > 0 ? expiresIn / (60 * 60 * 24) : 7;

      if (accessToken) {
        setCookie("token", accessToken, { expiryDays });

        if (tokenType) {
          setCookie("tokenType", tokenType, { expiryDays });
        }

        try {
          await dispatch(fetchUserProfile());
        } catch (profileError) {}

        try {
          await dispatch(fetchCompanies());
        } catch (companiesError) {}

        showSuccessToast("Logged in successfully!");
        navigate("/");
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    }

    setLoading(false);
  };
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>
          Welcome Back <i className="bi bi-hand-index-thumb me-2 text-info"></i>
        </h2>
        <p>Login to your account</p>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group mt-3">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className="login-btn mt-4" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          <div className="forgot-password-link mt-3">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
        </form>

        <div className="auth-links mt-3">
          <p>
            Don't have an account? <Link to="/register">Register now</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
