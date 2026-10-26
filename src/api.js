const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("aurora-token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) {
    if (!response.ok) throw new Error("Request failed");
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("aurora-token");
    }
    throw new Error(data.message || "API request failed");
  }

  return data;
}

export async function registerUser(email, password) {
  const data = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("aurora-token", data.token);
  localStorage.setItem("aurora-email", data.user.email);
  return data.user;
}

export async function loginUser(email, password) {
  const data = await apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("aurora-token", data.token);
  localStorage.setItem("aurora-email", data.user.email);
  return data.user;
}

export function logoutUser() {
  localStorage.removeItem("aurora-token");
  localStorage.removeItem("aurora-email");
}

export async function getDay(date) {
  return apiRequest(`/day/${date}`);
}

export async function saveRoutine(date, activityId, targetHours, actualHours) {
  return apiRequest(`/day/${date}/routines`, {
    method: "PUT",
    body: JSON.stringify({ activityId, targetHours, actualHours }),
  });
}

export async function addCloudTask(date, task) {
  return apiRequest(`/day/${date}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title: task.title,
      category: task.category,
      hours: Number(task.hours) || 0,
    }),
  });
}

export async function updateCloudTask(id, changes) {
  return apiRequest(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export async function deleteCloudTask(id) {
  return apiRequest(`/tasks/${id}`, {
    method: "DELETE",
  });
}

export async function getRoutineRange(start, end) {
  const params = new URLSearchParams({ start, end });

  return apiRequest(`/routines/range?${params.toString()}`);
}