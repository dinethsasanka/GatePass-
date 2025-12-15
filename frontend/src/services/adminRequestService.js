import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL;

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

export const getAdminRequests = async (params = {}) => {
  const response = await axios.get(`${API_BASE_URL}/admin/requests`, {
    params,
    headers: authHeaders(),
  });

  // Backend returns: { total, page, limit, rows }
  const data = response.data;
  if (Array.isArray(data)) return data;

  return data;
};

export const getAdminRequestsByRef = async (referenceNumber) => {
  const response = await axios.get(
    `${API_BASE_URL}/admin/requests/by-ref/${encodeURIComponent(
      referenceNumber
    )}`,
    { headers: authHeaders() }
  );

  // Backend returns: { referenceNumber, rows: [...] }
  return response.data;
};
