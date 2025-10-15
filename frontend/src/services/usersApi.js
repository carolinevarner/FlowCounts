import api from "../api"; // 

export const listUsers = () =>
  api.get("/auth/users/").then(r => r.data);

export const createUser = (payload) =>
  api.post("/auth/users/", payload).then(r => r.data);

export const updateUser = (id, patch) =>
  api.patch(`/auth/users/${id}/`, patch).then(r => r.data);

export const activateUser = (id) =>
  api.post(`/auth/users/${id}/activate`).then(r => r.data);

export const deactivateUser = (id) =>
  api.post(`/auth/users/${id}/deactivate`).then(r => r.data);

export const suspendUser = (id, from, to) =>
  api.post(`/auth/users/${id}/suspend`, {
    suspend_from: from,
    suspend_to: to,
  }).then(r => r.data);
