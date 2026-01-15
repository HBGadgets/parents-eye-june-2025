"use client";
import { reverseGeocode } from "@/util/reverse-geocode";
import axios from "axios";
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

const reverseGeocodeCache = new Map<string, string>();
const reverseGeocodePromiseCache = new Map<string, Promise<string>>();

export const reverseGeocodeMapTiler = async (
  lat: number,
  lng: number
): Promise<string> => {
  const cacheKey = `${lat},${lng}`;
  console.log("🌍 Reverse geocode API HIT:", cacheKey);
  // 1️⃣ Return cached result if available
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  // 2️⃣ If request already in-flight, return SAME promise
  if (reverseGeocodePromiseCache.has(cacheKey)) {
    return reverseGeocodePromiseCache.get(cacheKey)!;
  }

  // 3️⃣ Create new request promise
  const requestPromise = (async () => {
    try {
      const response = await axios.get(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json`,
        {
          params: {
            key: process.env.NEXT_PUBLIC_MAPTILER_API_KEY,
            language: "en",
          },
        }
      );

      const feature = response.data?.features?.[0];
      if (!feature) return cacheKey;

      const context = feature.context || [];

      const getContext = (type: string) =>
        context.find((c: any) => c.id?.startsWith(type))?.text;

      const road = feature.text;
      const city =
        getContext("place") || getContext("locality") || getContext("county");
      const subregion = getContext("subregion");
      const state = getContext("region");
      const country = getContext("country");
      const postal_code = getContext("postal_code");

      const formatted = [road, city, subregion, state, postal_code, country]
        .filter(Boolean)
        .join(", ");

      const result = formatted || cacheKey;

      // 4️⃣ Save final result
      reverseGeocodeCache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error("Reverse geocode failed:", error.message);
      return cacheKey;
    } finally {
      // 5️⃣ Clean up in-flight cache
      reverseGeocodePromiseCache.delete(cacheKey);
    }
  })();

  // 6️⃣ Store promise immediately
  reverseGeocodePromiseCache.set(cacheKey, requestPromise);

  return requestPromise;
};
