import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../services/api";
import {
  showErrorToast,
  showSuccessToast,
  toTitleCaseText,
} from "../utils/helpers";

function CategoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [rows, setRows] = useState([{ categoryName: "" }]);
  const [existingCategories, setExistingCategories] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);

      try {
        const categoriesRes = await categoryApi.list();
        setExistingCategories(categoriesRes.data || []);

        if (id) {
          const categoryRes = await categoryApi.getById(id);
          setRows([categoryRes.data]);
        }
      } catch (err) {
        console.error("Error loading category form data:", err);
        showErrorToast("Unable to load category data. Please try again.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [id]);

  const addRow = () => {
    setRows([...rows, { categoryName: "" }]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };
  
  const handleChange = (index, value) => {
    const updated = [...rows];
    updated[index].categoryName = toTitleCaseText(value);
    setRows(updated);
  };

  const validateRows = () => {
    const filledCategoryRows = rows.filter((row) => row.categoryName.trim());

    if (filledCategoryRows.length === 0) {
      showErrorToast("Please add at least one category.");
      return false;
    }
    for (let i = 0; i < filledCategoryRows.length; i++) {
      if (!filledCategoryRows[i].categoryName.trim()) {
        showErrorToast(`Row ${i + 1}: Please add category name`);
        return false;
      }
    }
    return true;
  };

  const validateAgainstExistingCategories = async () => {
    const filledCategoryRows = rows.filter((row) => row.categoryName.trim());

    for (let i = 0; i < filledCategoryRows.length; i++) {
      const row = filledCategoryRows[i];
      const normalizedRowName = toTitleCaseText(row.categoryName)
        .trim()
        .toLowerCase();

      const duplicate = existingCategories.find((category) => {
        const normalizedCategoryName = (category.categoryName || "")
          .trim()
          .toLowerCase();

        const sameName = normalizedCategoryName === normalizedRowName;
        const isDifferentRecord = category.categoryId !== row.categoryId;

        return sameName && isDifferentRecord;
      });

      if (duplicate) {
        showErrorToast(`Row ${i + 1}: "${row.categoryName}" already exists.`);
        return false;
      }
    }

    return true;
  };

  const saveCategories = async () => {
    if (!validateRows()) return;

    const categoriesToSave = rows
      .filter((row) => row.categoryName.trim())
      .map((category) => ({
        ...category,
        categoryName: toTitleCaseText(category.categoryName).trim(),
      }));

    try {
      setLoading(true);
      const hasNoDuplicates = await validateAgainstExistingCategories();
      if (!hasNoDuplicates) return;

      await categoryApi.create(categoriesToSave);

      showSuccessToast("Categories saved successfully!");

      navigate("/categories");
    } catch (err) {
      console.error("Error saving categories:", err);
      showErrorToast("Unable to save categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async () => {
    if (!validateRows()) return;

    try {
      setLoading(true);
      const hasNoDuplicates = await validateAgainstExistingCategories();
      if (!hasNoDuplicates) return;

      const category = {
        ...rows[0],
        categoryName: toTitleCaseText(rows[0].categoryName).trim(),
      };

      await categoryApi.update(category.categoryId, category);

      showSuccessToast("Category updated successfully!");

      navigate("/categories");
    } catch (err) {
      console.error("Error updating category:", err);
      showErrorToast("Unable to update category. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mt-4 mb-4">
      <h2 className="mb-4">{id ? "Edit Category" : "Add Categories"}</h2>

      {!isInitialLoading && (
        <>
          <table className="table table-bordered">
            <thead>
              <tr>
                <th style={{ width: "80%" }}>Category Name</th>
                {!id && <th style={{ width: "20%" }}>Action</th>}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Category Name"
                      value={row.categoryName}
                      onChange={(e) => handleChange(index, e.target.value)}
                    />
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
              + Add Category
            </button>
          )}

          <br />

          <button
            className="btn btn-success me-2"
            onClick={id ? updateCategory : saveCategories}
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

          <Link to="/categories" className="btn btn-secondary">
            Cancel
          </Link>
        </>
      )}
    </div>
  );
}

export default CategoryForm;
