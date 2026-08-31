// public/js/api.js
// עטיפה קטנה סביב fetch — מרכזת את כל התקשורת עם ה-API במקום אחד.
// משמשת גם את האתר הציבורי וגם את פאנל הניהול.

const API = {
  // מפתח שבו נשמר טוקן ההתחברות (משמש בפאנל הניהול)
  tokenKey: 'restaurant_token',

  getToken() {
    return localStorage.getItem(this.tokenKey);
  },
  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  },
  clearToken() {
    localStorage.removeItem(this.tokenKey);
  },

  // פונקציית הבקשה המרכזית. מחזירה את גוף התשובה, וזורקת שגיאה עם ההודעה מהשרת.
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    let data = null;
    try { data = await res.json(); } catch { /* ייתכן שאין גוף */ }

    if (!res.ok) {
      const message = (data && data.message) || `Request failed (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  patch(path, body) { return this.request('PATCH', path, body); },
  del(path) { return this.request('DELETE', path); },
};
