import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bounce } from "react-toastify";
import { useInputGridNavigation } from "../hooks/useInputGridNavigation";
import ProductModal from "../Products/ProductModel";
import { customerApi, productApi } from "../services/api";
import {
  showErrorToast,
  showSuccessToast,
  toUpperCaseText,
} from "../utils/helpers";

function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const emptyRow = useMemo(
    () => ({
      productId: "",
      productName: "",
      hsnSac: "",
      unitId: "",
      unit: "",
      price: 0,
    }),
    [],
  );

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState({
    buildingNumber: "",
    street: "",
    city: "",
    district: "",
    pincode: "",
  });
  const [gstIn, setGstIn] = useState("");

  const [selectedProducts, setSelectedProducts] = useState([emptyRow]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const {
    setRef,
    focusCell,
    handleSequentialNavigation,
    handleVerticalNavigation,
  } = useInputGridNavigation("price");

  useEffect(() => {
    const loadData = async () => {
      setIsInitialLoading(true);

      try {
        const productsRes = await productApi.list();
        setProducts(productsRes.data);

        if (id) {
          const customerRes = await customerApi.getById(id);
          const data = customerRes.data;
          setCustomerName(toUpperCaseText(data.customerName || ""));
          setAddress({
            buildingNumber: toUpperCaseText(data.address?.buildingNumber || ""),
            street: toUpperCaseText(data.address?.street || ""),
            city: toUpperCaseText(data.address?.city || ""),
            district: toUpperCaseText(data.address?.district || ""),
            state: toUpperCaseText(data.address?.state || ""),
            pincode: toUpperCaseText(data.address?.pincode || ""),
          });
          setGstIn(toUpperCaseText(data.gstIn || ""));
          setSelectedProducts(
            data.products?.length
              ? data.products.map((product) => {
                  const matchedProduct = (productsRes.data || []).find(
                    (item) => item.productId === product.productId,
                  );

                  return {
                    ...emptyRow,
                    ...product,
                    productName: toUpperCaseText(
                      product.productName || matchedProduct?.productName || "",
                    ),
                    hsnSac: product.hsnSac || matchedProduct?.hsnSac || "",
                    unitId: product.unitId || matchedProduct?.unitId || "",
                    unit: product.unit || matchedProduct?.unit || "",
                    price: Number(
                      product.price || matchedProduct?.price || 0,
                    ).toFixed(2),
                  };
                })
              : [{ ...emptyRow }],
          );
        }

        const customersRes = await customerApi.list();
        setExistingCustomers(customersRes.data || []);
      } catch (err) {
        console.error("Error loading customer form data:", err);
        showErrorToast("Unable to load form data. Please try again.");
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadData();
  }, [id, emptyRow]);

  const addRow = () => {
    setSelectedProducts((prev) => [...prev, { ...emptyRow }]);
  };

  const removeRow = (index) => {
    const updatedProducts = selectedProducts.filter((_, i) => i !== index);
    setSelectedProducts(updatedProducts);
  };

  const handleProductSelect = (product) => {
    let updatedProducts = [...selectedProducts];

    updatedProducts[selectedRowIndex] = {
      productId: product.productId,
      productName: toUpperCaseText(product.productName || ""),
      hsnSac: product.hsnSac || "",
      unitId: product.unitId || "",
      unit: product.unit || "",
      price: Number(product.price || 0).toFixed(2),
    };

    if (selectedRowIndex === selectedProducts.length - 1) {
      updatedProducts.push(emptyRow);
    }

    setSelectedProducts(updatedProducts);

    setShowProductModal(false);
    setTimeout(() => {
      focusCell(selectedRowIndex, "price");
    }, 100);
  };

  const handleProductCreated = (createdProduct) => {
    if (!createdProduct?.productId) {
      return;
    }

    setProducts((prevProducts) => {
      const exists = prevProducts.some(
        (item) => item.productId === createdProduct.productId,
      );
      if (exists) {
        return prevProducts.map((item) =>
          item.productId === createdProduct.productId ? createdProduct : item,
        );
      }
      return [...prevProducts, createdProduct];
    });
  };

  const handlePriceChange = (index, value) => {
    const updatedProducts = [...selectedProducts];

    const normalized = String(value || "").replace(/[^0-9.]/g, "");

    if (normalized === "") {
      updatedProducts[index].price = "";
      setSelectedProducts(updatedProducts);
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(normalized)) {
      return;
    }

    updatedProducts[index].price = normalized;

    setSelectedProducts(updatedProducts);
  };

  const handlePriceBlur = (index) => {
    const updatedProducts = [...selectedProducts];
    const rawValue = updatedProducts[index].price;
    let price = Number(rawValue);

    if (!rawValue || Number.isNaN(price) || price <= 0) {
      price = 1;
    }

    updatedProducts[index].price = price.toFixed(2);

    setSelectedProducts(updatedProducts);
  };

  const validate = () => {
    if (!customerName.trim()) {
      showErrorToast("Please enter Customer Name");
      return false;
    }
    if (!address.city || !address.district || !address.pincode) {
      showErrorToast("City, District, State and Pincode are required");
      return false;
    }
    if (!gstIn.trim()) {
      showErrorToast("Please enter GSTIN");
      return false;
    }

    const filledProductRows = selectedProducts.filter(
      (r) => r.productName !== "",
    );

    if (filledProductRows.length === 0) {
      showErrorToast("Please add at least one product");
      return false;
    }

    for (let i = 0; i < filledProductRows.length; i++) {
      const product = filledProductRows[i];

      if (!product.productId) {
        showErrorToast(`Row ${i + 1}: Please Select product`);
        return false;
      }

      if (!product.unitId) {
        showErrorToast(`Row ${i + 1}: Unit is missing for selected product`);
        return false;
      }

      if (
        !product.price ||
        isNaN(product.price) ||
        Number(product.price) <= 0
      ) {
        showErrorToast(`Row ${i + 1}: Please Enter price`);
        return false;
      }
    }

    return true;
  };

  const normalizeText = (value) =>
    (value || "").toString().trim().toLowerCase();

  const normalizeAddress = (addr = {}) => ({
    buildingNumber: normalizeText(addr?.buildingNumber),
    street: normalizeText(addr?.street),
    city: normalizeText(addr?.city),
    district: normalizeText(addr?.district),
    state: normalizeText(addr?.state),
    pincode: normalizeText(addr?.pincode),
  });

  const getCustomerIdentifier = (customer) =>
    String(customer?.customerId || "");

  const validateAgainstExistingCustomers = async () => {
    const currentName = normalizeText(customerName);
    const currentAddress = normalizeAddress(address);

    const duplicate = existingCustomers.find((customer) => {
      const existingName = normalizeText(customer.customerName);
      const existingAddress = normalizeAddress(customer.address);

      const samePrimaryAddress =
        existingAddress.buildingNumber === currentAddress.buildingNumber &&
        existingAddress.city === currentAddress.city &&
        existingAddress.district === currentAddress.district &&
        existingAddress.state === currentAddress.state &&
        existingAddress.pincode === currentAddress.pincode;

      const sameStreet =
        existingAddress.street === currentAddress.street ||
        !existingAddress.street ||
        !currentAddress.street;

      const sameName = existingName === currentName;
      const sameAddress = samePrimaryAddress && sameStreet;
      const isDifferentRecord =
        getCustomerIdentifier(customer) !== String(id || "");

      return sameName && sameAddress && isDifferentRecord;
    });

    if (duplicate) {
      showErrorToast(
        "A customer with the same name and address already exists.",
      );
      return false;
    }

    return true;
  };

  const saveCustomer = async () => {
    if (!validate()) return;

    const filledProducts = selectedProducts.filter(
      (product) => product.productName !== "",
    );

    const payload = {
      customerName: toUpperCaseText(customerName),
      address: {
        buildingNumber: toUpperCaseText(address?.buildingNumber || ""),
        street: toUpperCaseText(address?.street || ""),
        city: toUpperCaseText(address?.city || ""),
        district: toUpperCaseText(address?.district || ""),
        state: toUpperCaseText(address?.state || ""),
        pincode: toUpperCaseText(address?.pincode || ""),
      },
      gstIn: toUpperCaseText(gstIn),
      products: filledProducts.map((product) => ({
        productId: product.productId,
        productName: toUpperCaseText(product.productName || ""),
        hsnSac: product.hsnSac || "",
        unitId: product.unitId || "",
        unit: product.unit || "",
        price: Number(product.price) || 0,
      })),
    };

    try {
      setLoading(true);
      const hasNoDuplicates = await validateAgainstExistingCustomers();
      if (!hasNoDuplicates) return;

      if (id) {
        await customerApi.update(id, payload);
      } else {
        await customerApi.create(payload);
      }
      showSuccessToast(
        id
          ? "Customer updated successfully!"
          : "Customer created successfully!",
        Bounce,
      );
      navigate("/customers");
    } catch (err) {
      console.error("Error saving customer:", err);
      showErrorToast("Unable to save customer. Please try again.", Bounce);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4 mb-4 mb-4">
      <h2 className="mb-4">{id ? "Edit Customer" : "Add Customer"}</h2>

      {!isInitialLoading && (
        <>
          <div className="card p-3 mb-3">
            <label className="label">Name</label>
            <input
              className="form-control mb-2"
              placeholder="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(toUpperCaseText(e.target.value))}
            />

            <label className="label">Address</label>

            <input
              className="form-control mb-2"
              placeholder="Building No / Flat"
              value={address.buildingNumber}
              onChange={(e) =>
                setAddress({
                  ...address,
                  buildingNumber: toUpperCaseText(e.target.value),
                })
              }
            />

            <input
              className="form-control mb-2"
              placeholder="Street"
              value={address.street}
              onChange={(e) =>
                setAddress({
                  ...address,
                  street: toUpperCaseText(e.target.value),
                })
              }
            />

            <input
              className="form-control mb-2"
              placeholder="City / Village"
              value={address.city}
              onChange={(e) =>
                setAddress({
                  ...address,
                  city: toUpperCaseText(e.target.value),
                })
              }
            />

            <input
              className="form-control mb-2"
              placeholder="District"
              value={address.district}
              onChange={(e) =>
                setAddress({
                  ...address,
                  district: toUpperCaseText(e.target.value),
                })
              }
            />
            <input
              className="form-control mb-2"
              placeholder="State"
              value={address.state}
              onChange={(e) =>
                setAddress({
                  ...address,
                  state: toUpperCaseText(e.target.value),
                })
              }
            />

            <input
              className="form-control mb-2"
              placeholder="Pincode"
              value={address.pincode}
              onChange={(e) =>
                setAddress({
                  ...address,
                  pincode: toUpperCaseText(e.target.value),
                })
              }
            />

            <label className="label">GSTIN</label>
            <input
              className="form-control"
              placeholder="GSTIN"
              value={gstIn}
              onChange={(e) => setGstIn(toUpperCaseText(e.target.value))}
            />
          </div>

          <div className="card mb-3">
            <div className="card-header fw-bold">Products</div>
            <div className="card-body">
              {selectedProducts && selectedProducts.length > 0 ? (
                <table className="table table-bordered table-hover text-center">
                  <thead className="table-light">
                    <tr>
                      <th>S.No</th>
                      <th title="Product Name">Product</th>
                      <th>HSN/SAC</th>
                      <th>Unit</th>
                      <th>Rate</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {selectedProducts.map((product, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>

                        <td
                          data-row={index}
                          data-col="product"
                          title={product.productName || ""}
                        >
                          <input
                            ref={(el) => setRef(index, "product", el)}
                            type="text"
                            className="form-control"
                            value={toUpperCaseText(product.productName || "")}
                            placeholder="Click or type product"
                            onClick={() => {
                              setSelectedRowIndex(index);
                              setProductSearch(
                                toUpperCaseText(product.productName || ""),
                              );
                              setIsEditingProduct(true);
                              setShowProductModal(true);
                            }}
                            onKeyDown={(e) => {
                              const key = e.key;

                              if (e.ctrlKey || e.metaKey || e.altKey) {
                                return;
                              }

                              handleSequentialNavigation(e, index, "product", {
                                product: { col: "price", rowOffset: 0 },
                                price: { col: "product", rowOffset: 1 },
                              });
                              handleVerticalNavigation(e, index, "product");
                              if (key === "Backspace") {
                                e.preventDefault();

                                setSelectedRowIndex(index);

                                const existingText =
                                  selectedProducts[index].productName || "";

                                setProductSearch(
                                  toUpperCaseText(existingText.slice(0, -1)),
                                );
                                setIsEditingProduct(true);
                                setShowProductModal(true);

                                return;
                              }

                              const allowedKeys = [
                                "Delete",
                                "ArrowLeft",
                                "ArrowRight",
                                "Tab",
                                "Enter",
                              ];
                              if (
                                !allowedKeys.includes(key) &&
                                key.length === 1
                              ) {
                                e.preventDefault();
                                setSelectedRowIndex(index);

                                setProductSearch(toUpperCaseText(key));
                                setIsEditingProduct(false);

                                setShowProductModal(true);
                              }
                            }}
                          />
                        </td>

                        <td>{product.hsnSac || "-"}</td>

                        <td>{product.unit || "-"}</td>

                        <td data-row={index} data-col="price">
                          <input
                            ref={(el) => setRef(index, "price", el)}
                            type="text"
                            inputMode="decimal"
                            className="form-control"
                            value={product.price}
                            disabled={!product.productId}
                            onChange={(e) =>
                              handlePriceChange(index, e.target.value)
                            }
                            onBlur={() => handlePriceBlur(index)}
                            onKeyDown={(e) => {
                              handleSequentialNavigation(e, index, "price", {
                                product: { col: "price", rowOffset: 0 },
                                price: { col: "remove", rowOffset: 0 },
                              });
                            }}
                          />
                        </td>

                        <td>
                          {product.productId && (
                            <button
                              ref={(el) => setRef(index, "remove", el)}
                              className="btn btn-danger btn-sm"
                              onClick={() => removeRow(index)}
                              onKeyDown={(e) => {
                                if (e.key === "Tab") {
                                  e.preventDefault();
                                  focusCell(index + 1, "product");
                                }
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              <button className="btn btn-primary mb-1" onClick={addRow}>
                + Add Product
              </button>
            </div>
          </div>

          <br />

          <button
            className="btn btn-success me-2"
            onClick={saveCustomer}
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

          <Link to="/customers" className="btn btn-secondary">
            Cancel
          </Link>
          <ProductModal
            show={showProductModal}
            onClose={() => setShowProductModal(false)}
            onSelect={handleProductSelect}
            onProductCreated={handleProductCreated}
            initialSearch={productSearch}
            isEditing={isEditingProduct}
            products={[...products]}
            selectedProducts={selectedProducts.map((r) => r.productId)}
          />
        </>
      )}
    </div>
  );
}

export default CustomerForm;
