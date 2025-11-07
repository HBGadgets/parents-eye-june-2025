import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

interface DevicePayload {
  name: string;
  uniqueId: string;
  phone: string;
  model: string;
  category: string;
}

// 🧠 Basic Auth credentials
const BASIC_AUTH_USER = process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASS = process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_PASSWORD;

export const useAddDeviceOld = () => {

  return useMutation({
    mutationFn: async (payload: DevicePayload) => {
      // Build Basic Auth header
      const token = Buffer.from(
        `${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`
      ).toString("base64");

      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_URL}/devices`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${token}`,
          },
        }
      );
      return data;
    },
  });
};
