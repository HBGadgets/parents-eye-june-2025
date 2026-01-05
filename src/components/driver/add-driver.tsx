"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Eye, EyeOff } from "lucide-react";
import { Driver } from "@/interface/modal";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useRouteDropdown, // Changed from useDeviceDropdown
} from "@/hooks/useDropdown";

interface Props {
  onSubmit: (data: {
    name: string;
    phone: string;
    email?: string;
    username: string;
    password?: string;
    routeObjId: string; // Changed from deviceObjId
    schoolId: string;
    branchId: string;
  }) => void;
  onClose: () => void;
  initialData?: Driver | null;
  isCreating?: boolean;
  isUpdating?: boolean;
  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
}

export default function AddDriverForm({
  onSubmit,
  onClose,
  initialData,
  isCreating,
  isUpdating,
  decodedToken,
}: Props) {
  // ---------------- Form State ----------------
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [routeObjId, setRouteObjId] = useState<string>(""); // Changed from deviceObjId

  // ---------------- Selection State ----------------
  const [selectedSchoolId, setSelectedSchoolId] = useState<
    string | undefined
  >();
  const [selectedBranchId, setSelectedBranchId] = useState<
    string | undefined
  >();

  // ---------------- Password Visibility ----------------
  const [showPassword, setShowPassword] = useState(false);

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false); // Changed from deviceOpen

  // ---------------- Error States ----------------
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---------------- Role & Token Info ----------------
  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedToken?.role === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.branchId;

  // ---------------- React Query Hooks ----------------

  // Schools dropdown (only for superAdmin)
  const { data: schools = [], isLoading: isLoadingSchools } = useSchoolDropdown(
    decodedTokenRole === "superAdmin"
  );

  // Branches dropdown (conditional based on role)
  const { data: branches = [], isLoading: isLoadingBranches } =
    useBranchDropdown(
      selectedSchoolId,
      true,
      decodedTokenRole === "branchGroup" // skipSchoolId for branchGroup
    );

  // Routes dropdown (changed from devices)
  const { data: routes = [], isLoading: isLoadingRoutes } = useRouteDropdown(
    selectedBranchId,
    true
  );

  // ---------------- Initialize Form Based on Role ----------------
  useEffect(() => {
    if (!initialData) {
      // For school role, auto-select their school
      if (decodedTokenRole === "school" && tokenSchoolId) {
        setSelectedSchoolId(tokenSchoolId);
      }

      // For branch role, auto-select their branch
      if (decodedTokenRole === "branch" && tokenBranchId) {
        setSelectedBranchId(tokenBranchId);
      }
    }
  }, [decodedTokenRole, tokenSchoolId, tokenBranchId, initialData]);

  // ---------------- Populate Form for Edit Mode ----------------
  useEffect(() => {
    console.log("initial data", initialData);
    if (initialData) {
      setName(initialData.driverName || "");
      setPhone(initialData.mobileNo || "");
      setEmail(initialData.email || "");
      setUsername(initialData.username || "");
      setRouteObjId(initialData.routeObjId?._id || ""); // Changed from deviceObjId

      // Set selected school and branch for edit mode
      setSelectedSchoolId(initialData.schoolId?._id);
      setSelectedBranchId(initialData.branchId?._id);
    } else {
      // Reset form for new driver
      setName("");
      setPhone("");
      setEmail("");
      setUsername("");
      setPassword("");
      setRouteObjId(""); // Changed from deviceObjId
    }
  }, [initialData]);

  // ---------------- Reset Branch & Route When School Changes ----------------
  useEffect(() => {
    if (!initialData && decodedTokenRole === "superAdmin") {
      setSelectedBranchId(undefined);
      setRouteObjId(""); // Changed from deviceObjId
    }
  }, [selectedSchoolId, initialData, decodedTokenRole]);

  // ---------------- Reset Route When Branch Changes ----------------
  useEffect(() => {
    if (!initialData) {
      setRouteObjId(""); // Changed from deviceObjId
    }
  }, [selectedBranchId, initialData]);

  // ---------------- Validation Functions ----------------
  const validateEmail = (email: string) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9_.]{4,20}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (email && !validateEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(username)) {
      newErrors.username =
        "Username must be 4-20 characters (letters, numbers, _, .)";
    }

    if (!initialData) {
      if (!password.trim()) {
        newErrors.password = "Password is required";
      } else if (!validatePassword(password)) {
        newErrors.password = "Password must be at least 6 characters";
      }
    } else if (password && !validatePassword(password)) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Uncomment if route is required
    // if (!routeObjId) {
    //   newErrors.route = "Route is required";
    // }

    switch (decodedTokenRole) {
      case "superAdmin":
        if (!selectedSchoolId) {
          newErrors.school = "School is required";
        }
        if (!selectedBranchId) {
          newErrors.branch = "Branch is required";
        }
        break;

      case "school":
      case "branchGroup":
        if (!selectedBranchId) {
          newErrors.branch = "Branch is required";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const payload: any = {
      driverName: name.trim(),
      mobileNo: phone.trim(),
      username: username.trim(),
      routeObjId, // Changed from deviceObjId
      ...(email ? { email: email.trim() } : {}),
      ...(password ? { password: password.trim() } : {}),
      ...(selectedSchoolId ? { schoolId: selectedSchoolId } : {}),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    };

    onSubmit(payload);
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Driver" : "Add Driver"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Personal Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Driver Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setPhone(value);
                if (errors.phone) setErrors({ ...errors, phone: "" });
              }}
              maxLength={10}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Email (Optional)</label>
            <Input
              type="email"
              placeholder="e.g. driver@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email}</p>
            )}
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Credentials Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">
              Username <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. john_doe123"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""));
                if (errors.username) setErrors({ ...errors, username: "" });
              }}
              className={errors.username ? "border-red-500" : ""}
            />
            {errors.username && (
              <p className="text-xs text-red-500 mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              Password{" "}
              {!initialData ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-500 text-[10px]">
                  (Leave empty to keep current)
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={initialData ? "••••••••" : "Enter password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: "" });
                }}
                className={`pr-10 ${errors.password ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password}</p>
            )}
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Organization Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          {decodedTokenRole === "superAdmin" && (
            <div className="col-span-2">
              <label className="text-sm font-medium">
                School <span className="text-red-500">*</span>
              </label>
              <Combobox
                items={schools.map((s: any) => ({
                  label: s.schoolName,
                  value: s._id,
                }))}
                value={selectedSchoolId}
                onValueChange={(value) => {
                  setSelectedSchoolId(value);
                  if (errors.school) setErrors({ ...errors, school: "" });
                }}
                placeholder="Select School"
                searchPlaceholder="Search schools..."
                emptyMessage={
                  isLoadingSchools ? "Loading schools..." : "No school found."
                }
                width="w-full"
                open={schoolOpen}
                onOpenChange={setSchoolOpen}
                className={errors.school ? "border-red-500" : ""}
              />
              {errors.school && (
                <p className="text-xs text-red-500 mt-1">{errors.school}</p>
              )}
            </div>
          )}

          {decodedTokenRole !== "branch" && (
            <div
              className={decodedTokenRole === "superAdmin" ? "" : "col-span-2"}
            >
              <label className="text-sm font-medium">
                Branch <span className="text-red-500">*</span>
              </label>
              <Combobox
                items={branches.map((b: any) => ({
                  label: b.branchName,
                  value: b._id,
                }))}
                value={selectedBranchId}
                onValueChange={(value) => {
                  setSelectedBranchId(value);
                  if (errors.branch) setErrors({ ...errors, branch: "" });
                }}
                placeholder={
                  selectedSchoolId || decodedTokenRole !== "superAdmin"
                    ? "Select Branch"
                    : "Select school first"
                }
                searchPlaceholder="Search branches..."
                emptyMessage={
                  isLoadingBranches ? "Loading branches..." : "No branch found."
                }
                width="w-full"
                disabled={
                  decodedTokenRole === "superAdmin" && !selectedSchoolId
                }
                open={branchOpen}
                onOpenChange={setBranchOpen}
                className={errors.branch ? "border-red-500" : ""}
              />
              {errors.branch && (
                <p className="text-xs text-red-500 mt-1">{errors.branch}</p>
              )}
            </div>
          )}

          <div
            className={
              decodedTokenRole !== "branch" && decodedTokenRole === "superAdmin"
                ? ""
                : "col-span-2"
            }
          >
            <label className="text-sm font-medium">
              Route {/* Changed from Vehicle */}
            </label>
            <Combobox
              items={routes.map((r: any) => ({
                label: r.routeNumber, // Adjust property name based on your API response
                value: r._id,
              }))}
              value={routeObjId} // Changed from deviceObjId
              onValueChange={(value) => {
                setRouteObjId(value || ""); // Changed from setDeviceObjId
                if (errors.route) setErrors({ ...errors, route: "" }); // Changed from device
              }}
              placeholder={
                selectedBranchId || decodedTokenRole === "branch"
                  ? "Select Route"
                  : "Select branch first"
              }
              searchPlaceholder="Search routes..." // Changed from vehicles
              emptyMessage={
                isLoadingRoutes ? "Loading routes..." : "No route found." // Changed from vehicles
              }
              width="w-full"
              disabled={decodedTokenRole !== "branch" && !selectedBranchId}
              open={routeOpen} // Changed from deviceOpen
              onOpenChange={setRouteOpen} // Changed from setDeviceOpen
              className={errors.route ? "border-red-500" : ""} // Changed from device
            />
            {errors.route && ( // Changed from device
              <p className="text-xs text-red-500 mt-1">{errors.route}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
            disabled={isCreating || isUpdating}
          >
            Cancel
          </Button>
          <Button
            className="bg-primary cursor-pointer"
            onClick={handleSave}
            disabled={isCreating || isUpdating}
          >
            {initialData
              ? isUpdating
                ? "Updating..."
                : "Update"
              : isCreating
              ? "Creating..."
              : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
