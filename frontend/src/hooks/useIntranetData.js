import { useState, useEffect } from "react";
import {
  getItemCategories,
  getItemBySerialNumber,
  getHolidays,
} from "../services/intranetService";

/**
 * Custom hook to fetch item categories
 * @returns {Object} { categories, loading, error, refetch }
 */
export const useItemCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getItemCategories();
      setCategories(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch categories");
      // Set empty array on error to prevent breaking UI
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return { categories, loading, error, refetch: fetchCategories };
};

/**
 * Custom hook to fetch item by serial number
 * @param {string} serialNumber - The serial number to fetch
 * @param {boolean} shouldFetch - Whether to fetch automatically
 * @returns {Object} { item, loading, error, found, fetchItem }
 */
export const useItemBySerialNumber = (serialNumber, shouldFetch = false) => {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [found, setFound] = useState(null);

  const fetchItem = async (sn) => {
    const numberToFetch = sn || serialNumber;
    
    if (!numberToFetch) {
      setItem(null);
      setFound(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getItemBySerialNumber(numberToFetch);
      setItem(data);
      setFound(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch item");
      setItem(null);
      setFound(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shouldFetch && serialNumber) {
      fetchItem(serialNumber);
    }
  }, [serialNumber, shouldFetch]);

  return { item, loading, error, found, fetchItem };
};

/**
 * Custom hook to fetch holidays
 * @param {number} year - The year to fetch holidays for
 * @returns {Object} { holidays, loading, error, refetch }
 */
export const useHolidays = (year) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHolidays(year);
      setHolidays(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch holidays");
      // Set empty array on error to prevent breaking UI
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [year]);

  return { holidays, loading, error, refetch: fetchHolidays };
};
