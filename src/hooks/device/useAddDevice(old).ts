import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

interface DevicePayload {
  name: string;
  uniqueId: string;
  sim: string;
  speed: string;
  average: string;
  driver: string;
  model: string;
  routeNo: string;
  category: string;
  schoolId: string;
  branchId: string;
}

// 🧠 Basic Auth credentials
const BASIC_AUTH_USER = process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASS = process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_PASSWORD;

export const useAddDeviceOld = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DevicePayload) => {
      // Build Basic Auth header
      const token = Buffer.from(
        `${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`
      ).toString("base64");

    //   const { data } = await axios.post(
    //     `${process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_URL}/device`,
    //     payload,
    //     {
    //       headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Basic ${token}`,
    //       },
    //     }
    //   );

      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_URL}/devices`,
        // payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${token}`,
          },
        }
      );

      console.log("Response from old add device API: ", data);

      return data;
    },

    // onSuccess: () => {
    //   toast.success("✅ Device added successfully!");
    //   queryClient.invalidateQueries(["devices"]); // refresh cache if you have a list
    // },

    // onError: (error: any) => {
    //   console.error(error);
    //   toast.error(error?.response?.data?.message || "❌ Failed to add device");
    // },
  });
};
