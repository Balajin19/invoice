import { useCallback, useEffect, useRef, useState } from "react";
import "./ProductModel.css";
import { productApi, categoryApi, unitApi } from "../services/api";
import {
  showErrorToast,
  showSuccessToast,
  toUpperCaseText,
} from "../utils/helpers";

function ProductModal({
  show,
  onClose,
  onSelect,
  onProductCreated,
  initialSearch,
  isEditing,
  products,
  selectedProducts = [],
  customerId,
}) {
  const [productsList, setProductsList] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [selectedExistingProductId, setSelectedExistingProductId] =
    useState("");
  const [isPreparingAddForm, setIsPreparingAddForm] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    productName: "",
    hsnSac: "",
    categoryId: "",
    unitId: "",
    price: "",
  });
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current && !showAddForm) {
      setTimeout(() => {
        inputRef.current.focus();

        if (isEditing) {
          inputRef.current.select();
        }
      }, 0);
    }
  }, [show, isEditing, showAddForm]);
  useEffect(() => {
    if (show) {
      setSearch(initialSearch || "");
      setSelectedIndex(0);
      setProductsList(products);
    }
  }, [show, initialSearch, products]);

  useEffect(() => {
    if (show) {
      setShowAddForm(false);
    }
  }, [show]);

  useEffect(() => {
    if (!show) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (showAddForm) {
        setShowAddForm(false);
        return;
      }

      onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show, showAddForm, onClose]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredProducts = productsList.filter((p) => {
    if (!normalizedSearch) {
      return true;
    }

    const productName = (p.productName || "").toLowerCase();
    const hsnSac = String(p.hsnSac || "").toLowerCase();

    return (
      productName.includes(normalizedSearch) ||
      hsnSac.includes(normalizedSearch)
    );
  });

  const normalizedSelectedProductIds = new Set(
    (Array.isArray(selectedProducts) ? selectedProducts : []).map((id) =>
      String(id || ""),
    ),
  );

  const isProductDisabled = useCallback(
    (product) =>
      normalizedSelectedProductIds.has(String(product.productId || "")),
    [normalizedSelectedProductIds],
  );

  const getNextEnabledIndex = (startIndex, direction) => {
    if (!filteredProducts.length) {
      return 0;
    }

    let nextIndex = startIndex;
    while (nextIndex >= 0 && nextIndex < filteredProducts.length) {
      if (!isProductDisabled(filteredProducts[nextIndex])) {
        return nextIndex;
      }
      nextIndex += direction;
    }

    return startIndex;
  };

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedIndex(0);
      return;
    }

    const firstEnabledIndex = filteredProducts.findIndex(
      (product) => !isProductDisabled(product),
    );
    if (firstEnabledIndex === -1) {
      setSelectedIndex(0);
      return;
    }

    const isCurrentInvalid =
      selectedIndex >= filteredProducts.length ||
      selectedIndex < 0 ||
      isProductDisabled(filteredProducts[selectedIndex]);

    if (isCurrentInvalid) {
      setSelectedIndex(firstEnabledIndex);
    }
  }, [filteredProducts, selectedProducts, selectedIndex, isProductDisabled]);

  useEffect(() => {
    const row = document.getElementById(`product-row-${selectedIndex}`);
    if (row) {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!show) return null;

  const handleOpenAddProductForm = async () => {
    try {
      setIsPreparingAddForm(true);
      if (!categories.length || !units.length) {
        const [categoriesRes, unitsRes] = await Promise.all([
          categoryApi.list(),
          unitApi.list(),
        ]);
        setCategories(categoriesRes.data || []);
        setUnits(unitsRes.data || []);
      }

      if (customerId && !catalogProducts.length) {
        const productsRes = await productApi.list();
        setCatalogProducts(productsRes.data || []);
      }

      setSelectedExistingProductId("");
      setNewProduct({
        productName: "",
        hsnSac: "",
        categoryId: "",
        unitId: "",
        price: "",
      });
      setShowAddForm(true);
    } catch (error) {
      console.error("Error loading product form data:", error);
      showErrorToast("Unable to load product form data.");
    } finally {
      setIsPreparingAddForm(false);
    }
  };

  const mappedProductIds = new Set(
    (Array.isArray(productsList) ? productsList : []).map((product) =>
      String(product?.productId || ""),
    ),
  );

  const unmappedCatalogProducts = (
    Array.isArray(catalogProducts) ? catalogProducts : []
  ).filter(
    (product) => !mappedProductIds.has(String(product?.productId || "")),
  );

  const isUsingExistingProduct = Boolean(selectedExistingProductId);

  const handleExistingProductChange = (selectedId) => {
    setSelectedExistingProductId(selectedId);

    if (!selectedId) {
      setNewProduct((prev) => ({
        ...prev,
        productName: "",
        hsnSac: "",
        categoryId: "",
        unitId: "",
      }));
      return;
    }

    const selectedProduct = unmappedCatalogProducts.find(
      (product) => String(product.productId) === String(selectedId),
    );

    if (!selectedProduct) {
      return;
    }

    setNewProduct((prev) => ({
      ...prev,
      productName: selectedProduct.productName || "",
      hsnSac: selectedProduct.hsnSac || "",
      categoryId: selectedProduct.categoryId || "",
      unitId: selectedProduct.unitId || "",
      price:
        prev.price !== undefined && prev.price !== null && prev.price !== ""
          ? prev.price
          : selectedProduct.price !== undefined &&
              selectedProduct.price !== null
            ? String(selectedProduct.price)
            : "",
    }));
  };

  const handleProductClick = (product) => {
    if (normalizedSelectedProductIds.has(String(product.productId || ""))) {
      return;
    }
    onSelect(product);
    setSearch("");
  };

  const handleCreateProduct = async () => {
    if (!newProduct.productName.trim()) {
      showErrorToast("Please enter product name");
      return;
    }

    if (!newProduct.unitId) {
      showErrorToast("Please select unit");
      return;
    }

    try {
      setIsCreatingProduct(true);

      if (isUsingExistingProduct) {
        const selectedExistingProduct = unmappedCatalogProducts.find(
          (product) =>
            String(product.productId) === String(selectedExistingProductId),
        );

        if (!selectedExistingProduct) {
          showErrorToast("Please select an existing product");
          return;
        }

        const selectedUnit = units.find(
          (unitItem) =>
            unitItem.unitId ===
            (newProduct.unitId || selectedExistingProduct.unitId),
        );

        const mappedExistingProduct = {
          ...selectedExistingProduct,
          productId: selectedExistingProduct.productId,
          productName:
            selectedExistingProduct.productName || newProduct.productName,
          hsnSac: selectedExistingProduct.hsnSac || newProduct.hsnSac || "",
          categoryId:
            selectedExistingProduct.categoryId || newProduct.categoryId || "",
          unitId: newProduct.unitId || selectedExistingProduct.unitId || "",
          unit:
            selectedExistingProduct.unit ||
            selectedUnit?.unitName ||
            selectedExistingProduct.unitName ||
            "",
          price: Number(
            newProduct.price || selectedExistingProduct.price || 0,
          ).toFixed(2),
        };

        setProductsList((prev) => [...prev, mappedExistingProduct]);
        if (typeof onProductCreated === "function") {
          onProductCreated(mappedExistingProduct);
        }
        if (typeof onSelect === "function") {
          onSelect(mappedExistingProduct);
        }
        showSuccessToast("Product added successfully!");

        setSelectedExistingProductId("");
        setNewProduct({
          productName: "",
          hsnSac: "",
          categoryId: "",
          unitId: "",
          price: "",
        });
        setSearch("");
        return;
      }

      const payload = {
        productName: toUpperCaseText(newProduct.productName.trim()),
        hsnSac: newProduct.hsnSac || "",
        categoryId: newProduct.categoryId || "",
        unitId: newProduct.unitId,
        price: newProduct.price ? parseFloat(newProduct.price) : 0,
      };

      const response = await productApi.create(payload);
      const createdProduct = response.data || {};
      const selectedUnit = units.find(
        (unitItem) =>
          unitItem.unitId === (createdProduct.unitId || payload.unitId),
      );
      const normalizedCreatedProduct = {
        ...createdProduct,
        productId: createdProduct.productId,
        productName: createdProduct.productName || payload.productName,
        hsnSac: createdProduct.hsnSac || payload.hsnSac || "",
        unitId: createdProduct.unitId || payload.unitId,
        unit:
          createdProduct.unit ||
          selectedUnit?.unitName ||
          createdProduct.unitName ||
          "",
        price: Number(createdProduct.price ?? payload.price ?? 0).toFixed(2),
      };

      setProductsList((prev) => [...prev, normalizedCreatedProduct]);
      if (typeof onProductCreated === "function") {
        onProductCreated(normalizedCreatedProduct);
      }
      if (typeof onSelect === "function") {
        onSelect(normalizedCreatedProduct);
      }
      showSuccessToast("Product created successfully!");

      setNewProduct({
        productName: "",
        hsnSac: "",
        categoryId: "",
        unitId: "",
        price: "",
      });
      setSelectedExistingProductId("");

      setSearch("");
    } catch (error) {
      console.error("Error creating product:", error);
      const createErrorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to create product. Please try again.";

      showErrorToast(createErrorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <div className="modal show d-block" onClick={onClose}>
      <div
        className="modal-dialog modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5>{showAddForm ? "Add New Product" : "Select Product"}</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {showAddForm ? (
              <div className="add-product-form">
                {customerId && (
                  <div className="mb-3">
                    <label className="form-label">
                      Select Existing Product (Not Mapped)
                    </label>
                    <select
                      className="form-select"
                      value={selectedExistingProductId}
                      onChange={(e) =>
                        handleExistingProductChange(e.target.value)
                      }
                    >
                      <option value="">Type New Product Name</option>
                      {unmappedCatalogProducts.map((product) => (
                        <option
                          key={product.productId}
                          value={product.productId}
                        >
                          {product.productName}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Pick an existing product to map it with this customer and
                      set a customer price.
                    </small>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newProduct.productName}
                    disabled={isUsingExistingProduct}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        productName: toUpperCaseText(e.target.value),
                      })
                    }
                    placeholder="Enter product name"
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">HSN/SAC</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newProduct.hsnSac}
                    disabled={isUsingExistingProduct}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, hsnSac: e.target.value })
                    }
                    placeholder="Enter HSN/SAC code"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={newProduct.categoryId}
                    disabled={isUsingExistingProduct}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        categoryId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.categoryName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Unit *</label>
                  <select
                    className="form-select"
                    value={newProduct.unitId}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, unitId: e.target.value })
                    }
                  >
                    <option value="">Select Unit</option>
                    {units.map((unit) => (
                      <option key={unit.unitId} value={unit.unitId}>
                        {unit.unitName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    placeholder="Enter price"
                    step="0.01"
                  />
                </div>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={handleCreateProduct}
                    disabled={isCreatingProduct}
                  >
                    {isCreatingProduct
                      ? isUsingExistingProduct
                        ? "Adding..."
                        : "Creating..."
                      : isUsingExistingProduct
                        ? "Add Product"
                        : "Create Product"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowAddForm(false)}
                    disabled={isCreatingProduct}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="position-relative mb-2 d-flex gap-2">
                  <input
                    ref={inputRef}
                    autoFocus
                    type="text"
                    className="form-control flex-grow-1"
                    placeholder="Search by product name or HSN/SAC..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" && search) {
                        inputRef.current?.focus();
                      }
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setSelectedIndex((prev) =>
                          getNextEnabledIndex(
                            Math.min(prev + 1, filteredProducts.length - 1),
                            1,
                          ),
                        );
                      }
                      // eslint-disable-next-line no-empty
                      else if (false) {
                      }

                      if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setSelectedIndex((prev) =>
                          getNextEnabledIndex(Math.max(prev - 1, 0), -1),
                        );
                      }

                      if (e.key === "Enter" && filteredProducts.length > 0) {
                        handleProductClick(filteredProducts[selectedIndex]);
                      }

                      if (e.key === "Escape") {
                        onClose();
                      }
                    }}
                  />

                  {search && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={{
                        cursor: "pointer",
                        padding: "6px 12px",
                      }}
                      onClick={() => {
                        setSearch("");
                        inputRef.current?.focus();
                      }}
                    >
                      ✖
                    </button>
                  )}

                  <button
                    className="btn btn-success btn-sm"
                    onClick={handleOpenAddProductForm}
                    disabled={isPreparingAddForm}
                    title="Add new product"
                  >
                    {isPreparingAddForm ? "Loading..." : "+ Add Product"}
                  </button>
                </div>
                {filteredProducts.length > 0 && (
                  <small className="text-muted ms-2">
                    {filteredProducts.length} product
                    {filteredProducts.length !== 1 ? "s" : ""} found
                  </small>
                )}
                <br />

                <div className="product-table-container">
                  <table className="table table-bordered table-hover">
                    <thead>
                      <tr>
                        <th>S.No</th>
                        <th>Name</th>
                        <th>HSN/SAC</th>
                        <th>Unit</th>
                        {customerId && <th>Price</th>}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((product, index) => (
                          <tr
                            id={`product-row-${index}`}
                            key={product.productId}
                            className={`${selectedIndex === index && !isProductDisabled(product) ? "table-primary" : ""} ${
                              isProductDisabled(product)
                                ? "table-secondary"
                                : ""
                            }`}
                            style={{
                              pointerEvents: isProductDisabled(product)
                                ? "none"
                                : "auto",
                              opacity: isProductDisabled(product) ? 0.5 : 1,
                            }}
                            onClick={() => handleProductClick(product)}
                          >
                            <td>{index + 1}</td>

                            <td>{product.productName}</td>

                            <td>{product.hsnSac || "-"}</td>

                            <td>{product.unit}</td>
                            {customerId && <td>{product.price}</td>}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={customerId ? 5 : 4}
                            className="text-center"
                          >
                            No products found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
