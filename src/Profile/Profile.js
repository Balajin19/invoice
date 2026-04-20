import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { authApi } from "../services/api";
import { fetchUserProfile } from "../store/user";
import { showErrorToast, showSuccessToast } from "../utils/helpers";
import "./Profile.css";

function Profile() {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.user.profile);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (!profile?.name && !profile?.email) {
      dispatch(fetchUserProfile()).catch((error) => {
        showErrorToast(
          error?.response?.data?.message || "Unable to load profile details.",
        );
      });
    }
  }, [dispatch, profile?.email, profile?.name]);

  useEffect(() => {
    setFormData({
      name: profile?.name || "",
      email: profile?.email || "",
    });
  }, [profile]);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleOpenPasswordModal = () => {
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    if (isChangingPassword) return;

    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsPasswordModalOpen(false);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword) {
      showErrorToast("Current password is required");
      return;
    }

    if (passwordData.newPassword.length < 4) {
      showErrorToast("New password must be at least 4 characters");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast("New password and confirm password must match");
      return;
    }

    setIsChangingPassword(true);

    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showSuccessToast("Password changed successfully");
      setIsPasswordModalOpen(false);
    } catch (error) {
      showErrorToast(
        error?.response?.data?.message ||
          "Unable to change password. Please try again.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page-container">
      <h3 className="page-title">
        <i className="bi bi-person me-2 text-primary"></i>Profile
      </h3>

      <div className="card p-4">
        <div className="row">
          <div className="col-md-6">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              className="form-control"
              disabled
            />
          </div>

          <div className="col-md-6">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              className="form-control"
              disabled
            />
          </div>
        </div>

        <hr className="my-4" />

        <button
          className="btn btn-outline-primary"
          onClick={handleOpenPasswordModal}
        >
          Change Password
        </button>
      </div>

      {isPasswordModalOpen && (
        <div
          className="password-modal-overlay"
          onClick={handleClosePasswordModal}
        >
          <div
            className="password-modal-card"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="password-modal-header">
              <h5>Change Password</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClosePasswordModal}
                disabled={isChangingPassword}
                aria-label="Close"
              ></button>
            </div>

            <div className="password-modal-body">
              <label>Confirm Password</label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="form-control"
              />

              <label className="mt-3">New Password</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="form-control"
              />

              <label className="mt-3">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="form-control"
              />
            </div>

            <div className="password-modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleClosePasswordModal}
                disabled={isChangingPassword}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
