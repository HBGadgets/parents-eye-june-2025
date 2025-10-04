import axios from "axios";

// 🆕 Optimized Reverse Geocoding Utility with Axios
export const reverseGeocode = async (
  lat: number,
  lng: number,
  zoom: number = 18
): Promise<string> => {
  try {
    const { data } = await axios.get(
      "https://nominatim.openstreetmap.org/reverse",
      {
        params: {
          format: "json",
          lat,
          lon: lng,
          addressdetails: 1,
          zoom,
        },
      }
    );

    return data?.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error("Reverse geocoding failed:", error.message || error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};
