import { settingsApi } from "../services/api";
import { getCookie } from "../utils/cookies";

const FETCH_REQUEST = "companies/FETCH_REQUEST";
const FETCH_SUCCESS = "companies/FETCH_SUCCESS";
const FETCH_FAILURE = "companies/FETCH_FAILURE";

export const defaultCompanies = {
  data: [],
  loading: false,
  loaded: false,
  error: null,
};

export const companiesReducer = (state = defaultCompanies, action) => {
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

export const fetchCompanies = () => async (dispatch) => {
  if (!getCookie("token")) {
    return [];
  }

  dispatch({ type: FETCH_REQUEST });

  try {
    const response = await settingsApi.listCompanies();
    const companies = Array.isArray(response?.data)
      ? response.data
      : response?.data?.companies || [];

    dispatch({
      type: FETCH_SUCCESS,
      payload: companies,
    });

    return companies;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Unable to load companies. Please try again.";

    dispatch({ type: FETCH_FAILURE, payload: message });
    throw error;
  }
};
