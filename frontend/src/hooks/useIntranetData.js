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
      console.error("Failed to fetch categories from API:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch categories",
      );
      // Use comprehensive fallback categories when API fails
      setCategories([
        "Network Equipment.Switches, Routers & Gateways",
        "Electro Mechanical Equipment.Machinery",
        "Power.UPS",
        "Vehicle.SUV",
        "Customer Premises Equipment.Data",
        "Miscellaneous.R&D Equipment",
        "Customer Premises Equipment.STB Accessories",
        "Network Equipment.MSAN",
        "Electrical Equipment.Household Appliance",
        "IT Equipment.Mobile/Smart Device",
        "Network Equipment.Data Communication",
        "Customer Premises Equipment.Router",
        "Network Equipment.Wi-Fi & Wi-Max",
        "Air Conditioner.AC Plant",
        "Electronic Equipment.Audio Visual",
        "Office Equipment.Printer",
        "IT Equipment.Storage",
        "Office Equipment.Multimedia",
        "Power.Battery & Rectifier",
        "Vehicle.Miscellaneous",
        "Network Equipment.SFP",
        "Customer Premises Equipment.FTTH",
        "Customer Premises Equipment.Router Accessories",
        "Electro Mechanical Equipment.Pump",
        "Network Equipment.PABX",
        "Network Equipment.Core Network",
        "Miscellaneous",
        "Customer Premises Equipment.LTE Accessories",
        "Enterprise Sales.Equipment",
        "IT Equipment.CPU",
        "Network Equipment.Transmission",
        "Office Equipment.Miscellaneous",
        "Vehicle.Bicycle",
        "Vehicle.Motor Cycle",
        "Customer Premises Equipment.Smart Device",
        "Printed Material.Miscellaneous",
        "Network Equipment.LTE",
        "IT Equipment.Accessories",
        "IT Equipment.Monitors & Displays",
        "Power.Generator",
        "IT Equipment.Server",
        "Office Equipment.Fax Machine",
        "Network Equipment.Miscellaneous",
        "Network Equipment.LTE Accessories",
        "Customer Premises Equipment.LTE",
        "Network Equipment.Accessories",
        "IT Equipment.Laptop",
        "Network Equipment.Ethernet Access",
        "Office Equipment.Photocopy",
        "Office Equipment.Scanner",
        "Customer Premises Equipment.STB",
        "Customer Premises Equipment.PSTN",
        "Customer Premises Equipment.Cordless Phone",
        "Customer Premises Equipment.PSTN Accessories"
      ]);
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
      setError(
        err.response?.data?.message || err.message || "Failed to fetch item",
      );
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
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to fetch holidays",
      );
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
