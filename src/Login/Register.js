import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../services/api";
import { showErrorToast, showSuccessToast } from "../utils/helpers";
import "./Login.css";

function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [loading, setLoading] = useState(false);
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showErrorToast("Name is required");
      return;
    }

    if (!formData.email.trim()) {
      showErrorToast("Email is required");
      return;
    }

    if (formData.password.length < 4) {
      showErrorToast("Password must be at least 4 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showErrorToast("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      await authApi.register(payload);

      showSuccessToast("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      showErrorToast(err.response?.data?.error || "Registration failed");
      console.error("Registration error:", err);
    }

    setLoading(false);
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Create Account 🎉</h2>
        <p>Join us today</p>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group mt-3">
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
              placeholder="Enter password (min 4 characters)"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group mt-3">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button className="login-btn mt-4" disabled={loading}>
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        <div className="auth-links mt-3">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
