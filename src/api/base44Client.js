import demoData from "@/mock/demoData.json";

const isBrowser = typeof window !== "undefined";

const STORAGE_KEYS = {
  users: "docutracker_users",
  documents: "docutracker_documents",
  actions: "docutracker_document_actions",
  notifications: "docutracker_notifications",
  currentUserEmail: "docutracker_current_user_email",
  seedVersion: "docutracker_seed_version",
};

const DEFAULT_USERS = Array.isArray(demoData?.users) ? demoData.users : [];
const DEFAULT_DOCUMENTS = Array.isArray(demoData?.documents) ? demoData.documents : [];
const DEFAULT_ACTIONS = Array.isArray(demoData?.actions) ? demoData.actions : [];
const DEFAULT_NOTIFICATIONS = Array.isArray(demoData?.notifications) ? demoData.notifications : [];
const DEFAULT_CURRENT_USER_EMAIL = demoData?.currentUserEmail || "";
const DEMO_SEED_VERSION = demoData?.seed_version || "v1";

const deepCopy = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const safeParse = (raw, fallback) => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const nowIso = () => new Date().toISOString();

const newId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeValueForSort = (value) => {
  if (value === null || value === undefined) return "";
  return value;
};

const sortItems = (items, sortExpr) => {
  if (!sortExpr) return [...items];
  const descending = sortExpr.startsWith("-");
  const key = descending ? sortExpr.slice(1) : sortExpr;

  return [...items].sort((a, b) => {
    const left = normalizeValueForSort(a[key]);
    const right = normalizeValueForSort(b[key]);
    if (left < right) return descending ? 1 : -1;
    if (left > right) return descending ? -1 : 1;
    return 0;
  });
};

const applyLimit = (items, limit) => {
  if (!limit || Number.isNaN(Number(limit))) return items;
  return items.slice(0, Number(limit));
};

const filterItems = (items, filters = {}) =>
  items.filter((item) =>
    Object.entries(filters).every(([key, value]) => item[key] === value)
  );

const seedDemoData = () => {
  const seeded = {
    users: deepCopy(DEFAULT_USERS),
    documents: deepCopy(DEFAULT_DOCUMENTS),
    actions: deepCopy(DEFAULT_ACTIONS),
    notifications: deepCopy(DEFAULT_NOTIFICATIONS),
    currentUserEmail: DEFAULT_CURRENT_USER_EMAIL,
  };

  if (isBrowser) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(seeded.users));
    localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(seeded.documents));
    localStorage.setItem(STORAGE_KEYS.actions, JSON.stringify(seeded.actions));
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(seeded.notifications));
    localStorage.setItem(STORAGE_KEYS.currentUserEmail, seeded.currentUserEmail);
    localStorage.setItem(STORAGE_KEYS.seedVersion, DEMO_SEED_VERSION);
  }

  return seeded;
};

const ensureStore = () => {
  if (!isBrowser) {
    return {
      users: deepCopy(DEFAULT_USERS),
      documents: deepCopy(DEFAULT_DOCUMENTS),
      actions: deepCopy(DEFAULT_ACTIONS),
      notifications: deepCopy(DEFAULT_NOTIFICATIONS),
      currentUserEmail: DEFAULT_CURRENT_USER_EMAIL,
    };
  }

  const existingSeedVersion = localStorage.getItem(STORAGE_KEYS.seedVersion);
  if (existingSeedVersion !== DEMO_SEED_VERSION) {
    return seedDemoData();
  }

  const currentUsers = safeParse(localStorage.getItem(STORAGE_KEYS.users), null);
  if (!currentUsers || !Array.isArray(currentUsers) || currentUsers.length === 0) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(DEFAULT_USERS));
  }

  const currentDocuments = safeParse(localStorage.getItem(STORAGE_KEYS.documents), null);
  if (!currentDocuments || !Array.isArray(currentDocuments)) {
    localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(DEFAULT_DOCUMENTS));
  }

  const currentActions = safeParse(localStorage.getItem(STORAGE_KEYS.actions), null);
  if (!currentActions || !Array.isArray(currentActions)) {
    localStorage.setItem(STORAGE_KEYS.actions, JSON.stringify(DEFAULT_ACTIONS));
  }

  const currentNotifications = safeParse(localStorage.getItem(STORAGE_KEYS.notifications), null);
  if (!currentNotifications || !Array.isArray(currentNotifications)) {
    localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }

  const currentUserEmail = localStorage.getItem(STORAGE_KEYS.currentUserEmail);
  if (!currentUserEmail) {
    localStorage.setItem(STORAGE_KEYS.currentUserEmail, DEFAULT_CURRENT_USER_EMAIL);
  }

  return {
    users: safeParse(localStorage.getItem(STORAGE_KEYS.users), deepCopy(DEFAULT_USERS)),
    documents: safeParse(localStorage.getItem(STORAGE_KEYS.documents), deepCopy(DEFAULT_DOCUMENTS)),
    actions: safeParse(localStorage.getItem(STORAGE_KEYS.actions), deepCopy(DEFAULT_ACTIONS)),
    notifications: safeParse(localStorage.getItem(STORAGE_KEYS.notifications), deepCopy(DEFAULT_NOTIFICATIONS)),
    currentUserEmail:
      localStorage.getItem(STORAGE_KEYS.currentUserEmail) || DEFAULT_CURRENT_USER_EMAIL,
  };
};

const writeStore = ({ users, documents, actions, notifications, currentUserEmail }) => {
  if (!isBrowser) return;
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents));
  localStorage.setItem(STORAGE_KEYS.actions, JSON.stringify(actions));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  localStorage.setItem(STORAGE_KEYS.currentUserEmail, currentUserEmail);
};

const listEntity = (collection, sortExpr, limit) =>
  applyLimit(sortItems(collection, sortExpr), limit).map(deepCopy);

const filterEntity = (collection, filters, sortExpr, limit) =>
  applyLimit(sortItems(filterItems(collection, filters), sortExpr), limit).map(deepCopy);

const createEntity = (store, key, data) => {
  const timestamp = nowIso();
  const created = {
    id: data.id || newId(),
    ...data,
    created_date: data.created_date || timestamp,
    updated_date: timestamp,
  };
  store[key].unshift(created);
  writeStore(store);
  return deepCopy(created);
};

const updateEntity = (store, key, id, data) => {
  const index = store[key].findIndex((item) => item.id === id);
  if (index < 0) {
    throw Object.assign(new Error("Record not found"), { status: 404 });
  }
  const updated = {
    ...store[key][index],
    ...data,
    updated_date: nowIso(),
  };
  store[key][index] = updated;
  writeStore(store);
  return deepCopy(updated);
};

const deleteEntity = (store, key, id) => {
  const index = store[key].findIndex((item) => item.id === id);
  if (index < 0) {
    throw Object.assign(new Error("Record not found"), { status: 404 });
  }
  const [removed] = store[key].splice(index, 1);
  writeStore(store);
  return deepCopy(removed);
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export const base44 = {
  auth: {
    async me() {
      const store = ensureStore();
      const user = store.users.find((item) => item.email === store.currentUserEmail);
      if (!user) {
        throw Object.assign(new Error("No authenticated user"), { status: 401 });
      }
      return deepCopy(user);
    },
    logout(redirectUrl) {
      const store = ensureStore();
      writeStore({ ...store, currentUserEmail: "" });
      if (redirectUrl && isBrowser) {
        window.location.href = redirectUrl;
      }
    },
    redirectToLogin() {
      const store = ensureStore();
      writeStore({ ...store, currentUserEmail: "" });
      if (isBrowser) {
        window.location.href = "/login";
      }
    },
    async loginAs(email) {
      const store = ensureStore();
      const normalizedEmail = (email || "").trim().toLowerCase();
      const user = store.users.find((item) => item.email.toLowerCase() === normalizedEmail);
      if (!user) {
        throw Object.assign(new Error("User not found"), { status: 404 });
      }
      writeStore({ ...store, currentUserEmail: user.email });
      return deepCopy(user);
    },
    async login(email, password) {
      const store = ensureStore();
      const normalizedEmail = (email || "").trim().toLowerCase();
      const user = store.users.find((item) => item.email.toLowerCase() === normalizedEmail);

      if (!user) {
        throw Object.assign(new Error("Invalid email or password"), { status: 401 });
      }

      const expectedPassword = user.password || "Demo@123";
      if ((password || "") !== expectedPassword) {
        throw Object.assign(new Error("Invalid email or password"), { status: 401 });
      }

      writeStore({ ...store, currentUserEmail: user.email });
      return deepCopy(user);
    },
  },
  users: {
    async inviteUser(email, role = "user") {
      const store = ensureStore();
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        throw Object.assign(new Error("Email is required"), { status: 400 });
      }
      if (store.users.some((item) => item.email.toLowerCase() === normalizedEmail)) {
        throw Object.assign(new Error("User already exists"), { status: 409 });
      }

      const nameSeed = normalizedEmail.split("@")[0] || "New User";
      const fullName = nameSeed
        .split(/[._-]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      const user = {
        id: newId(),
        email: normalizedEmail,
        full_name: fullName || "New User",
        role: role === "admin" ? "ADMIN" : "USER",
        password: "Demo@123",
        section: "GENERAL",
        created_date: nowIso(),
      };

      store.users.unshift(user);
      writeStore(store);
      return deepCopy(user);
    },
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!file) {
          throw Object.assign(new Error("File is required"), { status: 400 });
        }
        const fileUrl = await fileToDataUrl(file);
        return { file_url: fileUrl };
      },
    },
  },
  entities: {
    Document: {
      async list(sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return listEntity(store.documents, sortExpr, limit);
      },
      async filter(filters = {}, sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return filterEntity(store.documents, filters, sortExpr, limit);
      },
      async create(data) {
        const store = ensureStore();
        return createEntity(store, "documents", data);
      },
      async update(id, data) {
        const store = ensureStore();
        return updateEntity(store, "documents", id, data);
      },
      async delete(id) {
        const store = ensureStore();
        const removed = deleteEntity(store, "documents", id);
        store.actions = store.actions.filter((action) => action.document_id !== id);
        store.notifications = store.notifications.filter((item) => item.document_id !== id);
        writeStore(store);
        return removed;
      },
    },
    DocumentAction: {
      async list(sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return listEntity(store.actions, sortExpr, limit);
      },
      async filter(filters = {}, sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return filterEntity(store.actions, filters, sortExpr, limit);
      },
      async create(data) {
        const store = ensureStore();
        return createEntity(store, "actions", data);
      },
      async update(id, data) {
        const store = ensureStore();
        return updateEntity(store, "actions", id, data);
      },
    },
    User: {
      async list(sortExpr = "full_name", limit) {
        const store = ensureStore();
        return listEntity(store.users, sortExpr, limit);
      },
      async filter(filters = {}, sortExpr = "full_name", limit) {
        const store = ensureStore();
        return filterEntity(store.users, filters, sortExpr, limit);
      },
      async create(data) {
        const store = ensureStore();
        return createEntity(store, "users", data);
      },
      async update(id, data) {
        const store = ensureStore();
        return updateEntity(store, "users", id, data);
      },
    },
    Notification: {
      async list(sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return listEntity(store.notifications, sortExpr, limit);
      },
      async filter(filters = {}, sortExpr = "-created_date", limit) {
        const store = ensureStore();
        return filterEntity(store.notifications, filters, sortExpr, limit);
      },
      async create(data) {
        const store = ensureStore();
        return createEntity(store, "notifications", data);
      },
      async update(id, data) {
        const store = ensureStore();
        return updateEntity(store, "notifications", id, data);
      },
    },
  },
};
