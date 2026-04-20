import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { categoryApi, productApi } from "../services/api";
import { confirmAndHandleDelete, showErrorToast } from "../utils/helpers";

function Categories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [hasCategoriesLoadError, setHasCategoriesLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const { requestConfirmation, ConfirmModal } = useConfirmModal();

  const fetchCategories = async () => {
    try {
      const res = await categoryApi.list();
      setCategories(res.data);
      setFilteredCategories(res.data);
      setHasCategoriesLoadError(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setHasCategoriesLoadError(true);
      showErrorToast("Unable to load categories. Please try again.");
    }
  };
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingCategories(true);
      await fetchCategories();
      setIsLoadingCategories(false);
    };

    loadData();

    searchRef.current?.focus();
  }, []);
  
  useEffect(() => {
    const filtered = categories.filter((category) =>
      (category.categoryName || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

    setFilteredCategories(filtered);
  }, [search, categories]);
  
  const handleDelete = async (id, categoryName) => {
    await confirmAndHandleDelete({
      confirmMessage: `Are you sure you want to delete category "${categoryName}"?`,
      confirmAction: (message) =>
        requestConfirmation({
          title: "Delete Category",
          message,
          confirmText: "Delete",
          cancelText: "Cancel",
        }),
      deleteAction: async () => {
        const productResponse = await productApi.listByCategoryId(id);

        const products = productResponse.data;

        await Promise.all(
          products.map((product) => productApi.remove(product.productId)),
        );

        await categoryApi.remove(id);
      },
      onSuccess: fetchCategories,
      successMessage: `Category "${categoryName}" deleted successfully!`,
      errorMessage: "Error deleting category. Please try again.",
    });
  };
  
  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">My Categories</h2>
      {!isLoadingCategories && hasCategoriesLoadError ? (
        <div className="alert alert-danger mt-3">
          Unable to load categories. Please try again after some time.
        </div>
      ) : !isLoadingCategories && categories.length === 0 ? (
        <p>
          No categories found. Please <Link to="/create-category">create</Link>{" "}
          a category.
        </p>
      ) : (
        <div className="d-flex align-items-center gap-3 mb-3">
          
          <div className="position-relative" style={{ width: "250px" }}>
            <input
              ref={searchRef}
              type="text"
              className="form-control pe-5"
              placeholder="Search category..."
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

          
          <Link to="/create-category" className="btn btn-primary">
            + Create Category
          </Link>
        </div>
      )}

      
      {!isLoadingCategories &&
        !hasCategoriesLoadError &&
        filteredCategories.length > 0 && (
          <small className="text-muted mb-2 d-block">
            {filteredCategories.length}{" "}
            {filteredCategories.length !== 1 ? "categories" : "category"} found
          </small>
        )}

      {!isLoadingCategories &&
        !hasCategoriesLoadError &&
        (filteredCategories.length > 0 ? (
          <table className="table table-bordered">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Category Name</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredCategories.map((category, index) => (
                <tr key={category.categoryId}>
                  <td>{index + 1}</td>
                  <td>{category.categoryName}</td>

                  <td className="d-flex gap-3">
                    <Link to={`/category/${category.categoryId}`}>
                      <i
                        className="bi bi-eye text-primary"
                        title="View Category"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </Link>

                    <i
                      className="bi bi-trash text-danger"
                      title="Delete Category"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        handleDelete(category.categoryId, category.categoryName)
                      }
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          search.trim().length > 0 &&
          filteredCategories.length === 0 && (
            <div className="alert alert-warning mt-3">
              No categories found for "<strong>{search}</strong>"
            </div>
          )
        ))}

      {!isLoadingCategories && (
        <Link to="/" className="btn btn-secondary">
          Back to Home
        </Link>
      )}

      <ConfirmModal />
    </div>
  );
}

export default Categories;
