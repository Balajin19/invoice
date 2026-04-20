import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../services/api";
import { showErrorToast, showSuccessToast } from "../utils/helpers";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  
  const handleChange = (e) => {
    setEmail(e.target.value);
  };
  
  const handlePasswordChange = (e) => {
    setNewPassword(e.target.value);
  };
  
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      showErrorToast("Email is required");
      return;
    }

    setLoading(true);

    try {
      await authApi.forgotPassword({ email: email });

      setShowResetModal(true);
      showSuccessToast("Email found! Please enter your new password.");
    } catch (err) {
      showErrorToast(
        err.response?.data?.message || "Email not found in our database",
      );
      console.error("Forgot password error:", err);
    }

    setLoading(false);
  };
  
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      showErrorToast("Please enter new password");
      return;
    }

    if (!confirmPassword.trim()) {
      showErrorToast("Please confirm password");
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast("Passwords do not match");
      return;
    }

    if (newPassword.length < 4) {
      showErrorToast("Password must be at least 4 characters");
      return;
    }

    setResetLoading(true);

    try {
      const payload = {
        email: email,
        password: newPassword,
      };

      await authApi.resetPassword(payload);

      showSuccessToast(
        "Password reset successfully! Please login with your new password.",
      );
      setShowResetModal(false);
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showErrorToast(err.response?.data?.message || "Failed to reset password");
      console.error("Password reset error:", err);
    }

    setResetLoading(false);
  };
  
  const handleCloseModal = () => {
    setShowResetModal(false);
    setNewPassword("");
    setConfirmPassword("");
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Forgot Password 🔐</h2>
        <p>Enter your email to reset your password</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={handleChange}
              required
              disabled={showResetModal}
            />
          </div>

          <button
            className="login-btn mt-4"
            disabled={loading || showResetModal}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="auth-links mt-3">
          <p>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>

      
      {showResetModal && (
        <div className="modal-overlay reset-password-modal">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reset Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleCloseModal}
                  disabled={resetLoading}
                >
                  X
                </button>
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  <div className="form-group mb-3">
                    <label>New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={handlePasswordChange}
                      minLength={4}
                      required
                      disabled={resetLoading}
                    />
                  </div>
                  <div className="form-group mb-3">
                    <label>Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={handleConfirmPasswordChange}
                      required
                      disabled={resetLoading}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={resetLoading}
                  >
                    {resetLoading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ForgotPassword;
