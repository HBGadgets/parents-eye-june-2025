"use client";
import { reverseGeocode } from "@/util/reverse-geocode";
import { useCallback, useEffect, useRef, useState } from "react";

export const useReverseGeocode = () => {
  const [addresses, setAddresses] = useState<{ [key: number]: string }>({});
  const [loadingAddresses, setLoadingAddresses] = useState<{
    [key: number]: boolean;
  }>({});
  const queueRef = useRef<
    { deviceId: number; lat: number; lng: number; priority?: boolean }[]
  >([]);
  const processingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Process queue with rate limiting (1 request per second for Nominatim)
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) return;

    processingRef.current = true;
    const item = queueRef.current.shift();

    if (!item) {
      processingRef.current = false;
      return;
    }

    const { deviceId, lat, lng } = item;

    // Skip if already have address or currently loading
    if (addresses[deviceId] || loadingAddresses[deviceId]) {
      processingRef.current = false;
      return;
    }

    try {
      setLoadingAddresses((prev) => ({ ...prev, [deviceId]: true }));

      // Fetch address with error handling
      const address = await reverseGeocode(lat, lng);

      setAddresses((prev) => ({ ...prev, [deviceId]: address }));
    } catch (error) {
      console.error(`Failed to geocode for device ${deviceId}:`, error);
      // Set fallback address on error
      setAddresses((prev) => ({
        ...prev,
        [deviceId]: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));
    } finally {
      setLoadingAddresses((prev) => ({ ...prev, [deviceId]: false }));
      processingRef.current = false;
    }
  }, [addresses, loadingAddresses]);

  // Start processing queue with 1.2 second intervals (respecting Nominatim rate limits)
  useEffect(() => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(processQueue, 1200); // 1.2 seconds to be safe
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [processQueue]);

  // Add device to geocoding queue
  const queueForGeocoding = useCallback(
    (deviceId: number, lat: number, lng: number, priority = false) => {
      // Skip if already have address or in queue
      if (
        addresses[deviceId] ||
        queueRef.current.some((item) => item.deviceId === deviceId)
      ) {
        return;
      }

      const newItem = { deviceId, lat, lng, priority };

      if (priority) {
        // Add high priority items to front of queue
        queueRef.current.unshift(newItem);
      } else {
        queueRef.current.push(newItem);
      }
    },
    [addresses]
  );

  return { addresses, loadingAddresses, queueForGeocoding };
};
