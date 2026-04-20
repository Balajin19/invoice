import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConfirmModal } from "../hooks/useConfirmModal";
import { categoryApi, productApi } from "../services/api";
import { confirmAndHandleDelete, showErrorToast } from "../utils/helpers";

function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [hasProductsLoadError, setHasProductsLoadError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const { requestConfirmation, ConfirmModal } = useConfirmModal();
  const categoryNameById = categories.reduce((acc, category) => {
    acc[category.categoryId] = category.categoryName;
    return acc;
  }, {});

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingProducts(true);
      await Promise.allSettled([fetchProducts(), fetchCategories()]);
      setIsLoadingProducts(false);
    };

    loadData();
    searchRef.current?.focus();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await productApi.list();
      setProducts(res.data);
      setHasProductsLoadError(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      setHasProductsLoadError(true);
      showErrorToast("Unable to load products. Please try again.");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryApi.list();
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      showErrorToast("Unable to load categories. Please try again.");
    }
  };

  const handleDelete = async (productId, productName) => {
    await confirmAndHandleDelete({
      confirmMessage: `Are you sure you want to delete product "${productName}"?`,
      confirmAction: (message) =>
        requestConfirmation({
          title: "Delete Product",
          message,
          confirmText: "Delete",
          cancelText: "Cancel",
        }),
      deleteAction: () => productApi.remove(productId),
      onSuccess: fetchProducts,
      successMessage: `Product "${productName}" deleted successfully!`,
      errorMessage: "Error deleting product. Please try again.",
    });
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory
      ? product.categoryId === selectedCategory
      : true;

    const productName = (product.productName || "").toLowerCase();
    const hsnSac = String(product.hsnSac || "").toLowerCase();
    const matchesSearch =
      productName.includes(normalizedSearch) ||
      hsnSac.includes(normalizedSearch);

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">My Products</h2>
      {!isLoadingProducts && hasProductsLoadError ? (
        <div className="alert alert-danger mt-3">
          Unable to load products. Please try again after some time.
        </div>
      ) : !isLoadingProducts && products.length === 0 ? (
        <p>
          No products found. Please <Link to="/create-product">create</Link> a
          product.
        </p>
      ) : (
        <div className="d-flex align-items-center gap-3 mb-3">
          <select
            className="form-select w-auto"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>

            {categories.map((cat) => (
              <option key={cat.categoryId} value={cat.categoryId}>
                {cat.categoryName}
              </option>
            ))}
          </select>

          <div className="position-relative" style={{ width: "250px" }}>
            <input
              ref={searchRef}
              type="text"
              className="form-control pe-5"
              placeholder="Search by product name or HSN/SAC..."
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

          <Link to="/create-product" className="btn btn-primary">
            + Create Product
          </Link>
        </div>
      )}

      {!isLoadingProducts &&
        !hasProductsLoadError &&
        filteredProducts.length > 0 && (
          <small className="text-muted mb-2 d-block">
            {filteredProducts.length} product
            {filteredProducts.length !== 1 && "s"} found
          </small>
        )}

      {!isLoadingProducts &&
        !hasProductsLoadError &&
        (filteredProducts.length > 0 ? (
          <table className="table table-bordered table-hover">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Product Name</th>
                <th>HSN/SAC</th>
                <th>Unit</th>
                <th>Category</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product, index) => (
                <tr key={product.productId}>
                  <td>{index + 1}</td>
                  <td>{product.productName}</td>
                  <td>{product.hsnSac || "-"}</td>
                  <td>{product.unit}</td>
                  <td>
                    {categoryNameById[product.categoryId] ||
                      product.categoryName}
                  </td>

                  <td className="d-flex align-items-center gap-3">
                    <Link to={`/product/${product.productId}`}>
                      <i
                        className="bi bi-eye text-primary"
                        title="View Product"
                        style={{ cursor: "pointer" }}
                      ></i>
                    </Link>

                    <i
                      className="bi bi-trash text-danger"
                      title="Delete Product"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        handleDelete(product.productId, product.productName)
                      }
                    ></i>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          normalizedSearch.length > 0 &&
          filteredProducts.length === 0 && (
            <div className="alert alert-warning mt-3">
              No products found for "<strong>{search}</strong>"
            </div>
          )
        ))}

      {!isLoadingProducts && (
        <Link to="/" className="btn btn-secondary mt-3">
          Back to Home
        </Link>
      )}

      <ConfirmModal />
    </div>
  );
}

export default Products;
