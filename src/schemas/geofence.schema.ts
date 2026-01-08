import { z } from "zod";

export const geofenceSchema = z.object({
  geofenceName: z.string().trim().min(3, "Geofence name is required"),

  latitude: z
    .number({ required_error: "Latitude is required" })
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),

  longitude: z
    .number({ required_error: "Longitude is required" })
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),

  radius: z
    .number({ required_error: "Radius is required" })
    .min(50, "Radius must be at least 50 meters")
    .max(10000, "Radius cannot exceed 10 km"),

  schoolId: z
    .string({ required_error: "School is required" })
    .min(1, "School is required"),

  branchId: z
    .string({ required_error: "Branch is required" })
    .min(1, "Branch is required"),

  routeObjId: z
    .string({ required_error: "Route is required" })
    .min(1, "Route is required"),

  pickupTime: z
    .string({ required_error: "Pickup time is required" })
    .min(1, "Pickup time is required"),

  dropTime: z.string().optional(), // ❌ NOT mandatory
});
