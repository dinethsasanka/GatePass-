import axiosInstance from "./axiosConfig";

export const getAdminRequests = async (params = {}) => {
  const response = await axiosInstance.get(`/admin/requests`, {
    params,
  });

  // Backend returns: { total, page, limit, rows }
  const data = response.data;
  if (Array.isArray(data)) return data;

  return data;
};

export const getAdminRequestsByRef = async (referenceNumber) => {
  const response = await axiosInstance.get(
    `/admin/requests/by-ref/${encodeURIComponent(
      referenceNumber
    )}`
  );

  // Backend returns: { referenceNumber, rows: [...] }
  return response.data;
};
