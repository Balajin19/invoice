import { userApi } from "../services/api";
import { getCookie } from "../utils/cookies";

const FETCH_USER_PROFILE_REQUEST = "user/FETCH_USER_PROFILE_REQUEST";
const FETCH_USER_PROFILE_SUCCESS = "user/FETCH_USER_PROFILE_SUCCESS";
const FETCH_USER_PROFILE_FAILURE = "user/FETCH_USER_PROFILE_FAILURE";
const CLEAR_USER_STATE = "user/CLEAR_USER_STATE";

const initialState = {
  profile: null,
  loading: false,
  error: null,
};

export const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_USER_PROFILE_REQUEST:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case FETCH_USER_PROFILE_SUCCESS:
      return {
        ...state,
        loading: false,
        profile: action.payload,
        error: null,
      };
    case FETCH_USER_PROFILE_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case CLEAR_USER_STATE:
      return {
        ...initialState,
      };
    default:
      return state;
  }
};

export const clearUserState = () => ({
  type: CLEAR_USER_STATE,
});

export const fetchUserProfile = () => async (dispatch) => {
  if (!getCookie("token")) {
    return null;
  }

  dispatch({ type: FETCH_USER_PROFILE_REQUEST });

  try {
    const response = await userApi.getProfile();
    const payload = response?.data || {};
    const profile = {
      name: payload?.name || payload?.user?.name || payload?.data?.name || "",
      email:
        payload?.email || payload?.user?.email || payload?.data?.email || "",
    };

    dispatch({ type: FETCH_USER_PROFILE_SUCCESS, payload: profile });
    return profile;
  } catch (error) {
    const message =
      error?.response?.data?.message || "Unable to load user details.";

    dispatch({ type: FETCH_USER_PROFILE_FAILURE, payload: message });
    throw error;
  }
};
