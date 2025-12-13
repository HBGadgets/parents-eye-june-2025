"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Combobox, ComboboxItem } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useRouteDropdown,
  useCategoryDropdown,
  useModelDropdown,
  DropdownItem,
  useDriverDropdown,
} from "@/hooks/useDropdown";
import { Loader2 } from "lucide-react";
import { useAddDeviceNew } from "@/hooks/device/useAddDevice(new)";
import { useAddDeviceOld } from "@/hooks/device/useAddDevice(old)";
import { useDebounce } from "@/hooks/useDebounce";
import { routeService } from "@/services/api/routeService";
import { toast } from "sonner";
import { deviceApiService } from "@/services/api/deviceApiService";

// Validation schema
const deviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  uniqueId: z.string().min(1, "Unique ID is required"),
  sim: z.string().min(1, "SIM number is required"),
  schoolId: z.string().min(1, "School is required"),
  branchId: z.string().min(1, "Branch is required"),
  routeObjId: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  model: z.string().min(1, "Model is required"),
  driver: z.string().optional(),
  speed: z.string().optional(),
  average: z.string().optional(),
  keyFeature: z.boolean().default(false), // ✅ Added keyFeature
});

type DeviceFormData = z.infer<typeof deviceSchema>;

interface AddDeviceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
  pagination: any;
  sorting: any;
  filters: any;
}

export function AddDeviceForm({
  open,
  onOpenChange,
  editData,
  pagination,
  sorting,
  filters,
}: AddDeviceFormProps) {
  const isEditMode = !!editData;
  const [driverSearch, setDriverSearch] = useState("");
  const debouncedDriverSearch = useDebounce(driverSearch, 300);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormData>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: "",
      uniqueId: "",
      sim: "",
      schoolId: "",
      branchId: "",
      routeObjId: "",
      category: "",
      model: "",
      driver: "",
      speed: "",
      average: "",
      keyFeature: false,
    },
  });

  // Watch form fields for dependent dropdowns
  const selectedSchoolId = watch("schoolId");
  const selectedBranchId = watch("branchId");

  // Dropdown hooks
  const { data: schools, isLoading: isLoadingSchools } =
    useSchoolDropdown(open);
  const {
    data: branches,
    isLoading: isLoadingBranches,
    isFetching: isFetchingBranches,
  } = useBranchDropdown(selectedSchoolId, open && !!selectedSchoolId);
  const {
    data: routes,
    isLoading: isLoadingRoutes,
    isFetching: isFetchingRoutes,
  } = useRouteDropdown(selectedBranchId, open && !!selectedBranchId);
  const { data: categories, isLoading: isLoadingCategories } =
    useCategoryDropdown(open);
  const { data: models, isLoading: isLoadingModels } = useModelDropdown(open);

  // Driver dropdown with infinite scroll
  const {
    data: driversData,
    isLoading: isLoadingDrivers,
    isFetching: isFetchingDrivers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useDriverDropdown(
    open && !!selectedBranchId,
    debouncedDriverSearch,
    selectedBranchId
  );

  // Mutations
  const {
    createDevice,
    updateDevice,
    isCreateDeviceLoading,
    isUpdateDeviceLoading,
  } = useAddDeviceNew(pagination, sorting, filters);
  const { mutateAsync: createOldDevice } = useAddDeviceOld();

  // Reset dependent dropdowns when parent changes
  useEffect(() => {
    if (selectedSchoolId && !isEditMode) {
      setValue("branchId", "");
      setValue("routeObjId", "");
      setValue("driver", "");
    }
  }, [selectedSchoolId, setValue, isEditMode]);

  useEffect(() => {
    if (selectedBranchId && !isEditMode) {
      setValue("routeObjId", "");
      setValue("driver", "");
    }
  }, [selectedBranchId, setValue, isEditMode]);

  // Populate form for edit mode
  useEffect(() => {
    if (open && editData) {
      reset({
        name: editData.name || "",
        uniqueId: editData.uniqueId || "",
        sim: editData.sim || "",
        schoolId: editData.schoolId?._id || "",
        branchId: editData.branchId?._id || "",
        routeObjId: editData.routeObjId?._id || "",
        category: editData.category || "",
        model: editData.model || "",
        driver: editData.driver?._id || "",
        speed: editData.speed || "",
        average: editData.average || "",
        keyFeature: editData.keyFeature ?? false, // ✅ Added keyFeature with fallback
      });
    } else if (open && !editData) {
      reset({
        name: "",
        uniqueId: "",
        sim: "",
        schoolId: "",
        branchId: "",
        routeObjId: "",
        category: "",
        model: "",
        driver: "",
        speed: "",
        average: "",
        keyFeature: false, // ✅ Reset to false
      });
    }
  }, [open, editData, reset]);

  // Transform dropdown data to ComboboxItem format with proper null safety
  const transformToComboboxItems = (
    items: DropdownItem[] | undefined,
    type?: "category" | "model"
  ): ComboboxItem[] => {
    if (!items || !Array.isArray(items)) return [];

    return items.map((item) => {
      if (type === "category") {
        const categoryName = item?.categoryName || item?.name || "";
        return {
          value: item?._id || categoryName || "unknown-category",
          label: categoryName || "Unknown Category",
        };
      }

      if (type === "model") {
        const modelName = item?.modelName || item?.name || "";
        return {
          value: item?._id || modelName || "unknown-model",
          label: modelName || "Unknown Model",
        };
      }

      return {
        value: item?._id || "",
        label:
          item?.name ||
          item?.schoolName ||
          item?.branchName ||
          item?.routeNumber ||
          "Unknown",
      };
    });
  };

  const schoolItems = transformToComboboxItems(schools);
  const branchItems = transformToComboboxItems(branches);
  const routeItems = transformToComboboxItems(routes);
  const categoryItems = transformToComboboxItems(categories, "category");
  const modelItems = transformToComboboxItems(models, "model");

  // Transform driver data from infinite query pages + add edit driver if exists
  const driverItems: ComboboxItem[] = useMemo(() => {
    const drivers = driversData
      ? driversData.pages.flatMap((page) =>
          (page.data || []).map((driver: DropdownItem) => ({
            value: driver._id || "",
            label: driver.driverName || "Unknown Driver",
          }))
        )
      : [];

    if (isEditMode && editData?.driver?._id) {
      const driverExists = drivers.some((d) => d.value === editData.driver._id);

      if (!driverExists) {
        drivers.unshift({
          value: editData.driver._id,
          label: editData.driver.driverName || "Selected Driver",
        });
      }
    }

    return drivers;
  }, [driversData, isEditMode, editData?.driver]);

  // Submit handler
  const onSubmit = async (data: DeviceFormData) => {
    console.log("Submitted data:", data);

    try {
      // try {
      //   // When editing, user may not change the route, so fallback to editData.routeObjId._id
        
      // } catch (err) {
      //   console.error("[RouteCheck] error:", err);
      //   toast.error("Failed to check route assignment");
      //   return;
      // }
      const routeId = data.routeObjId || editData?.routeObjId?._id;

      if (routeId) {
        const check = await deviceApiService.checkRouteAssign(routeId);
        console.log("❌ [RouteCheck] response:", check);

        // If route assigned => ALWAYS show warning (as per your requirement)
        if (check?.assigned) {
          console.log("⛔ Route is already assigned to another device.");
          const confirmed = confirm(
            `${check.message}. Do you still want to continue?`
          );

          if (!confirmed) {
            console.log("⛔ User cancelled route assignment.");
            return; // Stop submit
          }
        }
      }

      // -------------------------------------------------------
      // 2️⃣ IF NOT CANCELLED → Continue with CREATE or UPDATE
      // -------------------------------------------------------

      if (isEditMode) {
        // UPDATE PAYLOAD
        const payload = {
          name: data.name,
          uniqueId: data.uniqueId,
          sim: data.sim,
          schoolId: data.schoolId,
          branchId: data.branchId,
          routeObjId: data.routeObjId || undefined,
          category: data.category,
          model: data.model,
          driver: data.driver || undefined,
          speed: data.speed,
          average: data.average,
          keyFeature: data.keyFeature,
        };

        // UPDATE NEW API
        updateDevice({ id: editData._id, payload });

        // UPDATE OLD API IF deviceId EXISTS
        if (editData.deviceId) {
          const { updateDeviceOld } = await import(
            "@/hooks/device/useAddDevice(old)"
          );
          await updateDeviceOld(editData.deviceId, {
            name: data.name,
            uniqueId: data.uniqueId,
            model: data.model,
            category: data.category,
            sim: data.sim,
          });
        }
      } else {
        // CREATE MODE
        const oldApiPayload = {
          name: data.name,
          uniqueId: data.uniqueId,
          phone: data.sim,
          model: data.model,
          category: data.category,
        };

        // CREATE DEVICE IN OLD API
        const oldApiResponse = await createOldDevice(oldApiPayload);

        if (!oldApiResponse?.id) {
          throw new Error("Old API failed to return device ID");
        }

        const newApiPayload = {
          name: data.name,
          uniqueId: data.uniqueId,
          sim: data.sim,
          schoolId: data.schoolId,
          branchId: data.branchId,
          routeObjId: data.routeObjId || undefined,
          category: data.category,
          model: data.model,
          deviceId: oldApiResponse.id,
          driver: data.driver || undefined,
          speed: data.speed,
          average: data.average,
          keyFeature: data.keyFeature,
        };

        createDevice(newApiPayload);
      }

      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error("❌ Form submission error:", error);
      toast.error(error?.message || "Failed to process device request");
    }
  };

  const isLoading = isCreateDeviceLoading || isUpdateDeviceLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Device" : "Add New Device"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Device Name <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="name"
                    placeholder="Enter device name"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* IMEI No */}
            <div className="space-y-2">
              <Label htmlFor="uniqueId">
                IMEI Number <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="uniqueId"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="uniqueId"
                    placeholder="Enter IMEI number"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.uniqueId && (
                <p className="text-sm text-red-500">
                  {errors.uniqueId.message}
                </p>
              )}
            </div>

            {/* SIM Number */}
            <div className="space-y-2">
              <Label htmlFor="sim">
                SIM Number <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="sim"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="sim"
                    type="number"
                    placeholder="Enter SIM number"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.sim && (
                <p className="text-sm text-red-500">{errors.sim.message}</p>
              )}
            </div>

            {/* School */}
            <div className="space-y-2">
              <Label>
                School <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="schoolId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={schoolItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select school"
                    searchPlaceholder="Search schools..."
                    emptyMessage="No school found"
                    width="w-full"
                    disabled={isLoadingSchools || isLoading}
                  />
                )}
              />
              {errors.schoolId && (
                <p className="text-sm text-red-500">
                  {errors.schoolId.message}
                </p>
              )}
            </div>

            {/* Branch */}
            <div className="space-y-2">
              <Label>
                Branch <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={branchItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={
                      !selectedSchoolId
                        ? "Select school first"
                        : "Select branch"
                    }
                    searchPlaceholder="Search branches..."
                    emptyMessage={
                      isFetchingBranches ? "Loading..." : "No branch found"
                    }
                    width="w-full"
                    disabled={
                      !selectedSchoolId ||
                      isLoadingBranches ||
                      isFetchingBranches ||
                      isLoading
                    }
                  />
                )}
              />
              {errors.branchId && (
                <p className="text-sm text-red-500">
                  {errors.branchId.message}
                </p>
              )}
            </div>

            {/* Route */}
            <div className="space-y-2">
              <Label>Route</Label>
              <Controller
                name="routeObjId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={routeItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={
                      !selectedBranchId ? "Select branch first" : "Select route"
                    }
                    searchPlaceholder="Search routes..."
                    emptyMessage={
                      isFetchingRoutes ? "Loading..." : "No route found"
                    }
                    width="w-full"
                    disabled={
                      !selectedBranchId ||
                      isLoadingRoutes ||
                      isFetchingRoutes ||
                      isLoading
                    }
                  />
                )}
              />
            </div>

            {/* Driver */}
            <div className="space-y-2">
              <Label>Driver</Label>
              <Controller
                name="driver"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={driverItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder={
                      !selectedBranchId
                        ? "Select branch first"
                        : "Select driver"
                    }
                    searchPlaceholder="Search drivers..."
                    emptyMessage={
                      isFetchingDrivers ? "Loading..." : "No driver found"
                    }
                    width="w-full"
                    disabled={
                      !selectedBranchId ||
                      isLoadingDrivers ||
                      isFetchingDrivers ||
                      isLoading
                    }
                    // onSearchChange={setDriverSearch}
                    onReachEnd={() => {
                      if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                      }
                    }}
                    isLoadingMore={isFetchingNextPage}
                  />
                )}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>
                Category <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={categoryItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select category"
                    searchPlaceholder="Search categories..."
                    emptyMessage="No category found"
                    width="w-full"
                    disabled={isLoadingCategories || isLoading}
                  />
                )}
              />
              {errors.category && (
                <p className="text-sm text-red-500">
                  {errors.category.message}
                </p>
              )}
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label>
                Model <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <Combobox
                    items={modelItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select model"
                    searchPlaceholder="Search models..."
                    emptyMessage="No model found"
                    width="w-full"
                    disabled={isLoadingModels || isLoading}
                  />
                )}
              />
              {errors.model && (
                <p className="text-sm text-red-500">{errors.model.message}</p>
              )}
            </div>

            {/* Overspeed */}
            <div className="space-y-2">
              <Label htmlFor="overspeed">Overspeed Limit (km/h)</Label>
              <Controller
                name="speed"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="overspeed"
                    type="number"
                    placeholder="Enter overspeed limit"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.speed && (
                <p className="text-sm text-red-500">{errors.speed.message}</p>
              )}
            </div>

            {/* Average */}
            <div className="space-y-2">
              <Label htmlFor="average">Average (km/l)</Label>
              <Controller
                name="average"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="average"
                    type="number"
                    placeholder="Enter average speed"
                    disabled={isLoading}
                  />
                )}
              />
              {errors.average && (
                <p className="text-sm text-red-500">{errors.average.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Controller
                name="keyFeature"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="keyFeature"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                )}
              />
              <Label
                htmlFor="keyFeature"
                className="cursor-pointer font-normal"
              >
                Enable Key Feature
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              className="cursor-pointer"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Device" : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
