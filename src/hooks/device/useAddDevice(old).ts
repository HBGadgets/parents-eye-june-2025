import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { id } from "date-fns/locale";
import { toast } from "sonner";

interface DevicePayload {
  name: string;
  uniqueId: string;
  id?: number;
  phone: string;
  model: string;
  category: string;
}

// 🧠 Basic Auth credentials
const BASIC_AUTH_USER =
  process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASS =
  process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_BASIC_AUTH_PASSWORD;

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

export const deleteDeviceOld = async (oldDeviceId: number) => {
  try {
    const token = Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`).toString(
      "base64"
    );
    const res = await axios.delete(
      `${process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_URL}/devices/${oldDeviceId}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
        },
      }
    );
    return res.data;
  } catch (err: any) {
    console.error("Old API Delete Error:", err);
    throw new Error(
      err.response?.data?.message || "Failed to delete old device"
    );
  }
};

export const updateDeviceOld = async (oldDeviceId: number, data: any) => {
  try {
    const token = Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`).toString(
      "base64"
    );
    const payload = {
      name: data.name,
      uniqueId: data.uniqueId,
      model: data.model,
      category: data.category,
      phone: data.sim,
      id: oldDeviceId,
    };

    const res = await axios.put(
      `${process.env.NEXT_PUBLIC_ROCKETSALESTRACKER_URL}/devices/${oldDeviceId}`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${token}`,
        },
      }
    );
    return res.data;
  } catch (err: any) {
    console.error("Old API Update Error:", err);
    throw new Error(
      err.response?.data?.message || "Failed to update old device"
    );
  }
};
