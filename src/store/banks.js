import { settingsApi } from "../services/api";
import { getCookie } from "../utils/cookies";

const FETCH_REQUEST = "banks/FETCH_REQUEST";
const FETCH_SUCCESS = "banks/FETCH_SUCCESS";
const FETCH_FAILURE = "banks/FETCH_FAILURE";

export const defaultBanks = {
  data: [],
  loading: false,
  loaded: false,
  error: null,
};

export const banksReducer = (state = defaultBanks, action) => {
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

export const fetchBanks = () => async (dispatch) => {
  if (!getCookie("token")) {
    return [];
  }

  dispatch({ type: FETCH_REQUEST });

  try {
    const response = await settingsApi.listBanks();
    const banks = Array.isArray(response?.data)
      ? response.data
      : response?.data?.banks || [];

    dispatch({
      type: FETCH_SUCCESS,
      payload: banks,
    });

    return banks;
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      "Unable to load banks. Please try again.";

    dispatch({ type: FETCH_FAILURE, payload: message });
    throw error;
  }
};
