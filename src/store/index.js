import { applyMiddleware, combineReducers, compose, createStore } from "redux";
import { thunk } from "redux-thunk";
import { companiesReducer } from "./companies";
import { banksReducer } from "./banks";
import { invoiceSettingsReducer } from "./invoiceSettings";
import { userReducer } from "./user";

const rootReducer = combineReducers({
  companies: companiesReducer,
  banks: banksReducer,
  invoiceSettings: invoiceSettingsReducer,
  user: userReducer,
});

const composeEnhancers =
  (typeof window !== "undefined" &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
  compose;

export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk)),
);
