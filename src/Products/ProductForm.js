import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { categoryApi, productApi, unitApi } from "../services/api";
import { useConfirmModal } from "../hooks/useConfirmModal";
import {
  showErrorToast,
  showSuccessToast,
  toUpperCaseText,
  toTitleCaseText,
} from "../utils/helpers";

function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requestConfirmation, ConfirmModal } = useConfirmModal();

  const [rows, setRows] = useState([
    {
      productName: "",
      hsnSac: "",
      unitId: "",
      categoryId: "",
      categoryName: "",
    },
  ]);

  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [newUnitName, setNewUnitName] = useState("");
  const [isSavingUnit, setIsSavingUnit] = useState(false);
  const [existingProducts, setExistingProducts] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);

      try {
        const [categoriesRes, productsRes, unitsRes] = await Promise.all([
          categoryApi.list(),
          productApi.list(),
          unitApi.list(),
        ]);

        setCategories(categoriesRes.data || []);
        setExistingProducts(productsRes.data || []);
        setUnits(unitsRes.data || []);

        if (id) {
          const productRes = await productApi.getById(id);
          const productData = productRes.data || {};
          const matchedUnit = (unitsRes.data || []).find(
            (unitItem) =>
              unitItem.unitId === productData.unitId ||
              unitItem.unitName === productData.unit,
          );

          setRows([
            {
              ...productData,
              productName: toUpperCaseText(productData.productName || ""),
              unitId: productData.unitId || matchedUnit?.unitId || "",
            },
          ]);
        }
      } catch (err) {
        console.error("Error loading product form data:", err);
        showErrorToast("Unable to load product form data. Please try again.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [id]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        productName: "",
        hsnSac: "",
        unitId: "",
        categoryId: "",
        categoryName: "",
      },
    ]);
  };

  const removeRow = (index) => {
    const updatedRows = rows.filter((_, i) => i !== index);
    setRows(updatedRows);
  };

  const handleChange = (index, field, value) => {
    const updatedRows = [...rows];

    if (field === "categoryId") {
      const selectedCategory = categories.find((c) => c.categoryId === value);

      updatedRows[index]["categoryId"] = value;
      updatedRows[index]["categoryName"] = selectedCategory?.categoryName || "";
    } else if (field === "unitId") {
      updatedRows[index]["unitId"] = value;
    } else if (field === "productName") {
      updatedRows[index][field] = toUpperCaseText(value);
    } else {
      updatedRows[index][field] = value;
    }

    setRows(updatedRows);
  };

  const validateRows = () => {
    const filledProductRows = rows.filter(
      (row) =>
        row.productName.trim() ||
        (row.hsnSac || "").trim() ||
        row.unitId ||
        row.categoryId,
    );

    if (filledProductRows.length === 0) {
      showErrorToast("Please add at least one product.");
      return false;
    }

    for (let i = 0; i < filledProductRows.length; i++) {
      const row = filledProductRows[i];

      if (!row.productName.trim()) {
        showErrorToast(`Row ${i + 1}: Please add product name`);
        return false;
      }

      if (!row.unitId) {
        showErrorToast(`Row ${i + 1}: Please select unit`);
        return false;
      }

      if (!row.categoryId) {
        showErrorToast(`Row ${i + 1}: Please select category`);
        return false;
      }
    }

    const seenKeys = new Set();
    for (let i = 0; i < filledProductRows.length; i++) {
      const row = filledProductRows[i];
      const normalizedName = toUpperCaseText(row.productName).trim();
      const key = `${row.categoryId}::${normalizedName}`;

      if (seenKeys.has(key)) {
        showErrorToast(
          `Row ${i + 1}: Duplicate product in the same category is not allowed.`,
        );
        return false;
      }

      seenKeys.add(key);
    }

    return true;
  };

  const validateAgainstExistingProducts = async () => {
    const filledProductRows = rows.filter(
      (row) => row.productName.trim() && row.unitId && row.categoryId,
    );

    const getProductIdentifier = (product) => String(product?.productId || "");

    for (let i = 0; i < filledProductRows.length; i++) {
      const row = filledProductRows[i];
      const normalizedRowName = toUpperCaseText(row.productName).trim();

      const duplicate = existingProducts.find((product) => {
        const normalizedProductName = toUpperCaseText(
          product.productName || "",
        ).trim();

        const sameName = normalizedProductName === normalizedRowName;
        const sameCategory = product.categoryId === row.categoryId;
        const isDifferentRecord =
          getProductIdentifier(product) !== getProductIdentifier(row);

        return sameName && sameCategory && isDifferentRecord;
      });

      if (duplicate) {
        showErrorToast(
          `Row ${i + 1}: "${row.productName}" already exists in this category.`,
        );
        return false;
      }
    }

    return true;
  };

  const buildProductPayload = (product, includeProductId = false) => {
    const selectedCategory = categories.find(
      (c) => c.categoryId === product.categoryId,
    );
    const selectedUnit = units.find((u) => u.unitId === product.unitId);

    const payload = {
      productName: toUpperCaseText(product.productName).trim(),
      hsnSac: (product.hsnSac || "").trim(),
      unitId: product.unitId,
      unit: selectedUnit?.unitName || product.unit || "",
      categoryId: product.categoryId,
      categoryName:
        product.categoryName || selectedCategory?.categoryName || "",
    };

    if (includeProductId && product.productId) {
      payload.productId = product.productId;
    }

    return payload;
  };

  const saveProducts = async () => {
    if (!validateRows()) return;

    const productsToSave = rows.filter(
      (row) =>
        row.productName.trim() ||
        (row.hsnSac || "").trim() ||
        row.unitId ||
        row.categoryId,
    );

    try {
      setLoading(true);
      const hasNoDuplicates = await validateAgainstExistingProducts();
      if (!hasNoDuplicates) return;

      const payload = productsToSave.map((product) =>
        buildProductPayload(product),
      );

      await productApi.create(payload);

      showSuccessToast("Products saved successfully!");

      navigate("/products");
    } catch (err) {
      console.error("Error saving products:", err);
      showErrorToast("Unable to save products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const unitsRes = await unitApi.list();
      setUnits(unitsRes.data || []);
    } catch (err) {
      console.error("Error fetching units:", err);
    }
  };

  const handleAddUnit = async () => {
    const trimmed = toTitleCaseText(newUnitName).trim();
    if (!trimmed) {
      showErrorToast("Please enter a unit name");
      return;
    }
    const duplicate = units.find(
      (u) => (u.unitName || "").toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      showErrorToast(`"${trimmed}" already exists.`);
      return;
    }
    try {
      setIsSavingUnit(true);
      await unitApi.create([{ unitName: trimmed }]);
      setNewUnitName("");
      await fetchUnits();
      showSuccessToast(`Unit "${trimmed}" added!`);
    } catch (err) {
      console.error("Error adding unit:", err);
      showErrorToast("Unable to add unit. Please try again.");
    } finally {
      setIsSavingUnit(false);
    }
  };

  const handleDeleteUnit = async (unitId, unitName) => {
    const isConfirmed = await requestConfirmation({
      title: "Delete Unit",
      message: (
        <>
          Are you sure you want to delete unit <strong>"{unitName}"</strong>?
        </>
      ),
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!isConfirmed) return;

    try {
      await unitApi.remove(unitId);
      await fetchUnits();
      showSuccessToast(`Unit "${unitName}" deleted!`);
    } catch (err) {
      console.error("Error deleting unit:", err);
      showErrorToast("Unable to delete unit. Please try again.");
    }
  };

  const updateProduct = async () => {
    if (!validateRows()) return;

    const productsToUpdate = rows.filter(
      (row) =>
        row.productName.trim() ||
        (row.hsnSac || "").trim() ||
        row.unitId ||
        row.categoryId,
    );

    try {
      setLoading(true);
      const hasNoDuplicates = await validateAgainstExistingProducts();
      if (!hasNoDuplicates) return;

      for (const product of productsToUpdate) {
        await productApi.update(
          product.productId,
          buildProductPayload(product, true),
        );
      }

      showSuccessToast("Product updated successfully!");

      navigate("/products");
    } catch (err) {
      console.error("Error updating product:", err);
      showErrorToast("Unable to update product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">{id ? "Edit Product" : "Add Products"}</h2>

      {!isInitialLoading && (
        <>
          <div className="card mb-4">
            <div className="card-header fw-bold">Manage Units</div>
            <div className="card-body">
              <div className="d-flex gap-2 mb-3">
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: "260px" }}
                  placeholder="New unit name (e.g. Kg, Litre)"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddUnit();
                  }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddUnit}
                  disabled={isSavingUnit}
                >
                  {isSavingUnit ? "Adding..." : "+ Add Unit"}
                </button>
              </div>
              {units.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {units.map((unit) => (
                    <span
                      key={unit.unitId}
                      className="badge bg-secondary d-flex align-items-center gap-1"
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                    >
                      {unit.unitName}
                      <button
                        type="button"
                        className="btn-close btn-close-white"
                        style={{ width: "10px", height: "10px" }}
                        aria-label="Delete"
                        onClick={() =>
                          handleDeleteUnit(unit.unitId, unit.unitName)
                        }
                      />
                    </span>
                  ))}
                </div>
              ) : (
                <small className="text-muted">No units added yet.</small>
              )}
            </div>
          </div>

          <table className="table table-bordered">
            <thead>
              <tr>
                <th style={{ width: "28%" }}>Product Name</th>
                <th style={{ width: "18%" }}>HSN/SAC</th>
                <th style={{ width: "16%" }}>Unit</th>
                <th style={{ width: "23%" }}>Category</th>
                {!id && <th style={{ width: "15%" }}>Action</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Product Name"
                      value={row.productName}
                      onChange={(e) =>
                        handleChange(index, "productName", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter HSN/SAC"
                      value={row.hsnSac || ""}
                      onChange={(e) =>
                        handleChange(index, "hsnSac", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <select
                      className="form-select"
                      value={row.unitId || ""}
                      onChange={(e) =>
                        handleChange(index, "unitId", e.target.value)
                      }
                    >
                      <option value="">Select Unit</option>
                      {units.map((unit) => (
                        <option key={unit.unitId} value={unit.unitId}>
                          {unit.unitName}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>
                    <select
                      className="form-select"
                      value={row.categoryId}
                      onChange={(e) =>
                        handleChange(index, "categoryId", e.target.value)
                      }
                    >
                      <option value="">Select Category</option>

                      {categories.map((cat) => (
                        <option key={cat.categoryId} value={cat.categoryId}>
                          {cat.categoryName}
                        </option>
                      ))}
                    </select>
                  </td>

                  {!id && (
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeRow(index)}
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {!id && (
            <button className="btn btn-primary mb-3" onClick={addRow}>
              + Add Product
            </button>
          )}

          <br />

          <button
            className="btn btn-success me-2"
            onClick={id ? updateProduct : saveProducts}
            disabled={loading}
          >
            {loading
              ? id
                ? "Updating..."
                : "Saving..."
              : id
                ? "Update"
                : "Save"}
          </button>

          <Link to="/products" className="btn btn-secondary">
            Cancel
          </Link>

          <ConfirmModal />
        </>
      )}
    </div>
  );
}

export default ProductForm;
