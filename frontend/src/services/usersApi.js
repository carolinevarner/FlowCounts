// frontend/src/services/usersApi.js
import api from "../api"; // 

// GET /api/auth/users/
export const listUsers = () =>
  api.get("/auth/users/").then(r => r.data);

// POST /api/auth/users/
export const createUser = (payload) =>
  api.post("/auth/users/", payload).then(r => r.data);

// PATCH /api/auth/users/:id/
export const updateUser = (id, patch) =>
  api.patch(`/auth/users/${id}/`, patch).then(r => r.data);

// POST /api/auth/users/:id/activate
export const activateUser = (id) =>
  api.post(`/auth/users/${id}/activate`).then(r => r.data);

// POST /api/auth/users/:id/deactivate
export const deactivateUser = (id) =>
  api.post(`/auth/users/${id}/deactivate`).then(r => r.data);

// POST /api/auth/users/:id/suspend
export const suspendUser = (id, from, to) =>
  api.post(`/auth/users/${id}/suspend`, {
    suspend_from: from,
    suspend_to: to,
  }).then(r => r.data);
