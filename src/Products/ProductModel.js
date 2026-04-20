import { useEffect, useRef, useState } from "react";
import "./ProductModel.css";

function ProductModal({
  show,
  onClose,
  onSelect,
  initialSearch,
  isEditing,
  products,
  selectedProducts = [],
  customerId,
}) {
  const [productsList, setProductsList] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();

        if (isEditing) {
          inputRef.current.select();
        }
      }, 0);
    }
  }, [show, isEditing]);
  useEffect(() => {
    if (show) {
      setSearch(initialSearch || "");
      setSelectedIndex(0);
      setProductsList(products);
    }
  }, [show, initialSearch, products]);

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

  useEffect(() => {
    const row = document.getElementById(`product-row-${selectedIndex}`);
    if (row) {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!show) return null;

  const handleProductClick = (product) => {
    if (selectedProducts.includes(product.productId)) {
      return;
    }
    onSelect(product);
    setSearch("");
  };
  return (
    <div className="modal show d-block" onClick={onClose}>
      <div
        className="modal-dialog modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5>Select Product</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="position-relative mb-2">
              <input
                ref={inputRef}
                autoFocus
                type="text"
                className="form-control pe-5"
                placeholder="Search by product name or HSN/SAC..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" && search) {
                    inputRef.current?.focus();
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                      prev < filteredProducts.length - 1 ? prev + 1 : prev,
                    );
                  }

                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
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
                  className="btn btn-sm position-absolute"
                  style={{
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: "#888",
                  }}
                  onClick={() => {
                    setSearch("");
                    inputRef.current?.focus();
                  }}
                >
                  ✖
                </button>
              )}
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
                        className={`${selectedIndex === index ? "table-primary" : ""} ${
                          selectedProducts.includes(product.productId)
                            ? "table-secondary"
                            : ""
                        }`}
                        style={{
                          pointerEvents: selectedProducts.includes(
                            product.productId,
                          )
                            ? "none"
                            : "auto",
                          opacity: selectedProducts.includes(product.productId)
                            ? 0.5
                            : 1,
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
                      <td colSpan={customerId ? 5 : 4} className="text-center">
                        No products found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductModal;
