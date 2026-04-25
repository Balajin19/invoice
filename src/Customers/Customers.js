import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { customerApi } from "../services/api";
import { confirmAndHandleDelete, showErrorToast } from "../utils/helpers";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [hasCustomersLoadError, setHasCustomersLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const { requestConfirmation, ConfirmModal } = useConfirmModal();

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingCustomers(true);
      await fetchCustomers();
      setIsLoadingCustomers(false);
    };

    loadData();
    searchRef.current?.focus();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.list();
      setCustomers(res.data);
      setHasCustomersLoadError(false);
    } catch (error) {
      console.error("Error fetching customers:", error);
      setHasCustomersLoadError(true);
      showErrorToast("Unable to load customers. Please try again.");
    }
  };

  const handleDelete = async (id, name) => {
    await confirmAndHandleDelete({
      confirmMessage: (
        <>
          Are you sure you want to delete customer <strong>{name}</strong>?
        </>
      ),
      confirmAction: (message) =>
        requestConfirmation({
          title: "Delete Customer",
          message,
          confirmText: "Delete",
          cancelText: "Cancel",
        }),
      deleteAction: () => customerApi.remove(id),
      onSuccess: fetchCustomers,
      successMessage: `Customer "${name}" deleted successfully!`,
      errorMessage: "Error deleting customer. Please try again.",
    });
  };

  const filteredCustomers = customers.filter((cust) =>
    cust.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">Customers</h2>
      {!isLoadingCustomers && hasCustomersLoadError ? (
        <div className="alert alert-danger mt-3">
          Unable to load customers. Please try again after some time.
        </div>
      ) : !isLoadingCustomers && customers.length === 0 ? (
        <p>
          No customers found. Please <Link to="/create-customer">create</Link> a
          customer.
        </p>
      ) : (
        <div className="d-flex align-items-center gap-3 mb-3">
          <div className="position-relative" style={{ width: "250px" }}>
            <input
              ref={searchRef}
              type="text"
              className="form-control pe-5"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {search && (
              <button
                className="btn btn-sm position-absolute"
                style={{
                  right: "5px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
                onClick={() => setSearch("")}
              >
                ✖
              </button>
            )}
          </div>

          <Link to="/create-customer" className="btn btn-primary">
            + Create Customer
          </Link>
        </div>
      )}

      {!isLoadingCustomers &&
        !hasCustomersLoadError &&
        filteredCustomers.length > 0 && (
          <small className="text-muted mb-2 d-block">
            {filteredCustomers.length} customer
            {filteredCustomers.length !== 1 && "s"} found
          </small>
        )}

      {!isLoadingCustomers &&
        !hasCustomersLoadError &&
        (filteredCustomers.length > 0 ? (
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCustomers.map((cust, index) => (
                <tr key={cust.customerId}>
                  <td>{index + 1}</td>
                  <td>{cust.customerName}</td>
                  <td>{cust.address.city}</td>
                  <td className="d-flex gap-3">
                    <Link to={`/customer/${cust.customerId}`}>
                      <i
                        className="bi bi-eye text-primary"
                        style={{ cursor: "pointer" }}
                        title="View / Edit"
                      ></i>
                    </Link>

                    <i
                      className="bi bi-trash text-danger"
                      style={{ cursor: "pointer" }}
                      title="Delete"
                      onClick={() =>
                        handleDelete(cust.customerId, cust.customerName)
                      }
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          search && (
            <div className="alert alert-warning mt-3">
              No customers found for "<strong>{search}</strong>"
            </div>
          )
        ))}

      {!isLoadingCustomers && (
        <Link to="/" className="btn btn-secondary mt-3">
          Back to Home
        </Link>
      )}

      <ConfirmModal />
    </div>
  );
}

export default Customers;
