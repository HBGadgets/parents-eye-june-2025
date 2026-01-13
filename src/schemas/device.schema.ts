import { z } from "zod";

export const deviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  uniqueId: z.string().min(1, "Unique ID is required"),
  sim: z.string().min(1, "SIM number is required"),
  schoolId: z.string().min(1, "School is required"),
  branchId: z.string().min(1, "Branch is required"),
  routeObjId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  model: z.string().min(1, "Model is required"),
  driverObjId: z.string().optional(),
  speed: z.number().optional(),
  average: z.number().optional(),
  keyFeature: z.boolean().default(false),
  subscriptionEndDate: z.string().min(1, "Subscription Expiry is required"),
});

export type DeviceFormData = z.infer<typeof deviceSchema>;
