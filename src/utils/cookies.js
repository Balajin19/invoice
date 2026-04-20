
export const setCookie = (name, value, options = {}) => {
  const {
    expiryDays = 7,
    path = "/",
    secure = false,
    sameSite = "Strict",
  } = options;

  let cookieString = `${name}=${encodeURIComponent(value)}`;
  cookieString += `; path=${path}`;
  cookieString += `; SameSite=${sameSite}`;

  if (secure) {
    cookieString += "; Secure";
  }

  if (expiryDays) {
    const expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    cookieString += `; expires=${expiryDate.toUTCString()}`;
  }

  document.cookie = cookieString;
};

export const getCookie = (name) => {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
};

export const removeCookie = (name, path = "/") => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
};
