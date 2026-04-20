import { settingsApi } from "../services/api";

const FETCH_REQUEST = "invoiceSettings/FETCH_REQUEST";
const FETCH_SUCCESS = "invoiceSettings/FETCH_SUCCESS";
const FETCH_FAILURE = "invoiceSettings/FETCH_FAILURE";

export const defaultInvoiceSettings = {
  data: {
    id: "",
    prefix: "",
    startNumber: 1,
    currentNumber: 0,
    padLength: 3,
    terms: "",
  },
  loading: false,
  loaded: false,
  error: null,
};

export const invoiceSettingsReducer = (
  state = defaultInvoiceSettings,
  action,
) => {
  switch (action.type) {
    case FETCH_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case FETCH_SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        data: action.payload,
        error: null,
      };
    case FETCH_FAILURE:
      return {
        ...state,
        loading: false,
        loaded: true,
        error: action.payload,
      };

    default:
      return state;
  }
};

export const fetchInvoiceSettings = (companyId) => async (dispatch) => {
  if (!companyId) {
    dispatch({
      type: FETCH_SUCCESS,
      payload: defaultInvoiceSettings.data,
    });

    return defaultInvoiceSettings.data;
  }

  dispatch({ type: FETCH_REQUEST });

  try {
    const response = await settingsApi.getInvoiceSettings(companyId);
    const payload = response?.data || {};
    const invoiceRaw = payload?.invoice || payload || {};

    const invoice = {
      id: String(invoiceRaw?.id || ""),
      prefix: invoiceRaw?.prefix || invoiceRaw?.invoicePrefix || "",
      startNumber:
        Number(invoiceRaw?.startNumber) ||
        defaultInvoiceSettings.data.startNumber,
      currentNumber:
        Number(invoiceRaw?.currentNumber) ||
        defaultInvoiceSettings.data.currentNumber,
      padLength:
        Number(invoiceRaw?.padLength) || defaultInvoiceSettings.data.padLength,
      terms: invoiceRaw?.terms || invoiceRaw?.termsConditions || "",
    };

    dispatch({
      type: FETCH_SUCCESS,
      payload: invoice,
    });

    return invoice;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Unable to load invoice settings. Please try again.";

    dispatch({ type: FETCH_FAILURE, payload: message });
    throw error;
  }
};
