import { Slide, toast } from "react-toastify";

const baseToastOptions = {
  position: "top-right",
  autoClose: 2000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "colored",
};

export const showErrorToast = (message, transition = Slide) => {
  if (!message) return;

  toast.error(message, {
    ...baseToastOptions,
    transition,
  });
};

export const showSuccessToast = (message, transition = Slide) => {
  if (!message) return;

  toast.success(message, {
    ...baseToastOptions,
    transition,
  });
};

export const confirmAndHandleDelete = async ({
  confirmMessage,
  confirmAction,
  deleteAction,
  onSuccess,
  successMessage = "Deleted successfully!",
  errorMessage = "Unable to delete. Please try again.",
  transition = Slide,
}) => {
  const isConfirmed = confirmAction
    ? await confirmAction(confirmMessage)
    : window.confirm(confirmMessage);

  if (!isConfirmed) return false;

  try {
    await deleteAction();

    if (typeof onSuccess === "function") {
      await onSuccess();
    }

    showSuccessToast(successMessage, transition);
    return true;
  } catch (error) {
    console.error(errorMessage, error);
    showErrorToast(errorMessage, transition);
    return false;
  }
};

export const formatAddress = (address = {}) => {
  const formattedAddress = [
    address.buildingNumber,
    address.street,
    address.city,
    address.district,
    address.state,
  ]
    .filter(Boolean)
    .join(", ");

  return address.pincode
    ? `${formattedAddress} - ${address.pincode}`
    : formattedAddress;
};

export const toUpperCaseText = (value = "") => value.toString().toUpperCase();

export const toTitleCaseText = (value = "") =>
  value
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trimStart()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getFinancialYearLabel = (dateInput) => {
  const isDateOnlyString =
    typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  const parsedDate = isDateOnlyString
    ? (() => {
        const [year, month, day] = dateInput.split("-").map(Number);
        return new Date(year, month - 1, day);
      })()
    : dateInput
      ? new Date(dateInput)
      : new Date();
  const validDate = Number.isNaN(parsedDate.getTime())
    ? new Date()
    : parsedDate;
  const month = validDate.getMonth();
  const year = validDate.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
};

export const formatInvoiceNumber = (invoiceNumber, invoiceSettings = {}) => {
  if (
    invoiceNumber === null ||
    invoiceNumber === undefined ||
    invoiceNumber === ""
  ) {
    return "";
  }

  const prefix = (invoiceSettings?.prefix || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");

  if (typeof invoiceNumber === "string") {
    const rawInvoiceNumber = invoiceNumber.trim().replace(/^\/+/, "");
    if (!rawInvoiceNumber) return "";
    if (!prefix) return rawInvoiceNumber;

    const hasPrefix = rawInvoiceNumber
      .toLowerCase()
      .startsWith(`${prefix.toLowerCase()}/`);

    return hasPrefix ? rawInvoiceNumber : `${prefix}/${rawInvoiceNumber}`;
  }

  if (typeof invoiceNumber === "number" && !Number.isFinite(invoiceNumber)) {
    return "";
  }

  const financialYear = (
    invoiceSettings?.financialYear || getFinancialYearLabel()
  )
    .toString()
    .trim();
  const padLength = Number(invoiceSettings?.padLength) || 3;
  const numericPortion = String(invoiceNumber).padStart(padLength, "0");

  return [prefix, numericPortion, financialYear].filter(Boolean).join("/");
};

export const getPaymentTermDays = (terms) => {
  if (typeof terms === "number") return terms;
  if (terms === null || terms === undefined) return 0;
  const match = String(terms).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export const numberToWords = (amount) => {
  const numericAmount = Number(amount);

  if (!numericAmount) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const convert = (value) => {
    const wholeValue = Math.floor(value);

    if (wholeValue === 0) return "";

    if (wholeValue < 20) return ones[wholeValue];

    if (wholeValue < 100) {
      return (
        tens[Math.floor(wholeValue / 10)] +
        " " +
        ones[wholeValue % 10]
      ).trim();
    }

    if (wholeValue < 1000) {
      return (
        ones[Math.floor(wholeValue / 100)] +
        " Hundred " +
        convert(wholeValue % 100)
      ).trim();
    }

    if (wholeValue < 100000) {
      return (
        convert(Math.floor(wholeValue / 1000)) +
        " Thousand " +
        convert(wholeValue % 1000)
      ).trim();
    }

    if (wholeValue < 10000000) {
      return (
        convert(Math.floor(wholeValue / 100000)) +
        " Lakh " +
        convert(wholeValue % 100000)
      ).trim();
    }

    return (
      convert(Math.floor(wholeValue / 10000000)) +
      " Crore " +
      convert(wholeValue % 10000000)
    ).trim();
  };

  const rupees = Math.floor(numericAmount);
  const paise = Math.round((numericAmount - rupees) * 100);

  let words = convert(rupees) + " Rupees";

  if (paise > 0) {
    words += " and " + convert(paise) + " Paise";
  }

  return words + " Only";
};
