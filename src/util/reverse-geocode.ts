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

// export const reverseGeocodeMaptiler = async (lat:number, lng:number) => {
//   try {
//     const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json`;

//     const response = await axios.get(url, {
//       params: {
//         key: process.env.MAPTILER_API_KEY,
//         language: "en",
//       },
//     });

//     const feature = response.data?.features?.[0];
//     if (!feature) return `${lat}, ${lng}`;

//     const context = feature.context || [];

//     const getContext = (type: any) =>
//       context.find((c: any) => c.id?.startsWith(type))?.text;

//     const road = feature.text;
//     const city =
//       getContext("subregion") || getContext("county") || getContext("place");

//     const state = getContext("region");
//     const country = getContext("country");
//     const postcode = getContext("postal_code");

//     // Choose how detailed you want
//     const formatted = [road, city, state, country, postcode]
//       .filter(Boolean)
//       .join(", ");

//     return formatted || `${lat}, ${lng}`;
//   } catch (error: any) {
//     console.error("Reverse geocode failed:", error.message);
//     return `${lat}, ${lng}`;
//   }
// };