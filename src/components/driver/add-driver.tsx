"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Eye, EyeOff } from "lucide-react";

interface Driver {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  licenseNumber?: string;
  username: string;
  deviceObjId: { _id: string; name: string };
  schoolId?: { _id: string; schoolName: string };
  branchId?: { _id: string; branchName: string };
}

interface Props {
  onSubmit: (data: {
    name: string;
    phone: string;
    email?: string;
    licenseNumber?: string;
    username: string;
    password?: string;
    deviceObjId: string;
    schoolId: string;
    branchId: string;
  }) => void;

  onClose: () => void;
  initialData?: Driver | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];
  devices: { _id: string; name: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;

  shouldFetchBranches?: boolean;
  shouldFetchDevices?: boolean;

  onFetchBranches?: (value: boolean) => void;
  onFetchDevices?: (value: boolean) => void;

  isLoadingBranches?: boolean;
  isLoadingDevices?: boolean;
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
  schools,
  branches,
  devices,
  selectedSchoolId,
  selectedBranchId,
  onSchoolChange,
  onBranchChange,
  decodedToken,
  isLoadingBranches,
  isLoadingDevices,
  isCreating,
  isUpdating,
  onFetchBranches,
  onFetchDevices,
}: Props) {
  // ---------------- Form State ----------------
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [deviceObjId, setDeviceObjId] = useState<string>("");

  // ---------------- Password Visibility ----------------
  const [showPassword, setShowPassword] = useState(false);

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  // ---------------- Error States ----------------
  const [errors, setErrors] = useState<Record<string, string>>({});

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedToken?.role === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.id;

  // ---------------- Initialize Form on Role Change ----------------
  useEffect(() => {
    if (!initialData) {
      if (decodedTokenRole === "school" && tokenSchoolId) {
        onSchoolChange?.(tokenSchoolId);
        onFetchBranches?.(true);
      }

      if (decodedTokenRole === "branch" && tokenBranchId) {
        onBranchChange?.(tokenBranchId);
        onFetchDevices?.(true);
      }

      if (decodedTokenRole === "branchGroup") {
        onFetchBranches?.(true);
      }
    }
  }, [decodedTokenRole, tokenSchoolId, tokenBranchId]);

  // ---------------- Populate Form for Edit Mode ----------------
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setLicenseNumber(initialData.licenseNumber || "");
      setUsername(initialData.username || "");
      setDeviceObjId(initialData.deviceObjId?._id || "");
      // Password is not populated for security reasons

      onSchoolChange?.(initialData.schoolId?._id);
      onBranchChange?.(initialData.branchId?._id);

      if (initialData.schoolId?._id) {
        onFetchBranches?.(true);
      }
      if (initialData.branchId?._id) {
        onFetchDevices?.(true);
      }
    } else {
      // Reset form for new driver
      setName("");
      setPhone("");
      setEmail("");
      setLicenseNumber("");
      setUsername("");
      setPassword("");
      setDeviceObjId("");
    }
  }, [
    initialData,
    onSchoolChange,
    onBranchChange,
    onFetchBranches,
    onFetchDevices,
  ]);

  // ---------------- Reset Branch & Device When School Changes (New Driver Only) ----------------
  useEffect(() => {
    if (!initialData && decodedTokenRole === "superAdmin") {
      onBranchChange?.(undefined);
      setDeviceObjId("");
    }
  }, [selectedSchoolId, initialData, decodedTokenRole, onBranchChange]);

  // ---------------- Reset Device When Branch Changes (New Driver Only) ----------------
  useEffect(() => {
    if (!initialData) {
      setDeviceObjId("");
    }
  }, [selectedBranchId, initialData]);

  // ---------------- Validation Functions ----------------
  const validateEmail = (email: string) => {
    if (!email) return true; // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    // Username: 4-20 characters, alphanumeric, underscore, dot allowed
    const usernameRegex = /^[a-zA-Z0-9_.]{4,20}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    // Password: minimum 6 characters
    return password.length >= 6;
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    // Phone validation
    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    // Email validation (optional)
    if (email && !validateEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    // Username validation
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (!validateUsername(username)) {
      newErrors.username =
        "Username must be 4-20 characters (letters, numbers, _, .)";
    }

    // Password validation (required only for new driver)
    if (!initialData) {
      if (!password.trim()) {
        newErrors.password = "Password is required";
      } else if (!validatePassword(password)) {
        newErrors.password = "Password must be at least 6 characters";
      }
    } else if (password && !validatePassword(password)) {
      // If updating and password is provided, validate it
      newErrors.password = "Password must be at least 6 characters";
    }

    // Device validation
    if (!deviceObjId) {
      newErrors.device = "Vehicle is required";
    }

    // Role-based validation
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

      case "branch":
        // No additional validation needed
        break;

      default:
        newErrors.role = "Invalid role";
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------- Handle Submit ----------------
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const payload: any = {
      name: name.trim(),
      phone: phone.trim(),
      username: username.trim(),
      deviceObjId,
      ...(email ? { email: email.trim() } : {}),
      ...(licenseNumber ? { licenseNumber: licenseNumber.trim() } : {}),
      ...(password ? { password: password.trim() } : {}),
      ...(selectedSchoolId ? { schoolId: selectedSchoolId } : {}),
      ...(selectedBranchId ? { branchId: selectedBranchId } : {}),
    };

    onSubmit(payload);
  };

  return (
    <Card className="w-[700px] shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Driver" : "Add Driver"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* TWO COLUMN GRID FOR PERSONAL INFO */}
        <div className="grid grid-cols-2 gap-4">
          {/* NAME */}
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

          {/* PHONE */}
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

          {/* EMAIL */}
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

          {/* LICENSE NUMBER */}
          <div>
            <label className="text-sm font-medium">
              License Number (Optional)
            </label>
            <Input
              placeholder="e.g. MH1220210012345"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {/* DIVIDER */}
        <div className="border-t pt-4" />

        {/* TWO COLUMN GRID FOR CREDENTIALS */}
        <div className="grid grid-cols-2 gap-4">
          {/* USERNAME */}
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

          {/* PASSWORD */}
          <div>
            <label className="text-sm font-medium">
              Password{" "}
              {!initialData ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-gray-500 text-xs">
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

        {/* DIVIDER */}
        <div className="border-t pt-4" />

        {/* TWO COLUMN GRID FOR ORGANIZATION INFO */}
        <div className="grid grid-cols-2 gap-4">
          {/* SCHOOL (SuperAdmin only) */}
          {decodedTokenRole === "superAdmin" && (
            <div className="col-span-2">
              <label className="text-sm font-medium">
                School <span className="text-red-500">*</span>
              </label>
              <Combobox
                items={schools.map((s) => ({
                  label: s.schoolName,
                  value: s._id,
                }))}
                value={selectedSchoolId}
                onValueChange={(value) => {
                  onSchoolChange?.(value);
                  if (value) {
                    onFetchBranches?.(true);
                  }
                  if (errors.school) setErrors({ ...errors, school: "" });
                }}
                placeholder="Select School"
                searchPlaceholder="Search schools..."
                emptyMessage="No school found."
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

          {/* BRANCH (SuperAdmin, School, BranchGroup) */}
          {decodedTokenRole !== "branch" && (
            <div
              className={decodedTokenRole === "superAdmin" ? "" : "col-span-2"}
            >
              <label className="text-sm font-medium">
                Branch <span className="text-red-500">*</span>
              </label>
              <Combobox
                items={branches.map((b) => ({
                  label: b.branchName,
                  value: b._id,
                }))}
                value={selectedBranchId}
                onValueChange={(value) => {
                  onBranchChange?.(value);
                  if (value) {
                    onFetchDevices?.(true);
                  }
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

          {/* VEHICLE/DEVICE (All roles) */}
          <div
            className={
              decodedTokenRole !== "branch" && decodedTokenRole === "superAdmin"
                ? ""
                : "col-span-2"
            }
          >
            <label className="text-sm font-medium">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <Combobox
              items={devices.map((d) => ({
                label: d.name,
                value: d._id,
              }))}
              value={deviceObjId}
              onValueChange={(value) => {
                setDeviceObjId(value || "");
                if (errors.device) setErrors({ ...errors, device: "" });
              }}
              placeholder={
                selectedBranchId || decodedTokenRole === "branch"
                  ? "Select Vehicle"
                  : "Select branch first"
              }
              searchPlaceholder="Search vehicles..."
              emptyMessage={
                isLoadingDevices ? "Loading vehicles..." : "No vehicle found."
              }
              width="w-full"
              disabled={decodedTokenRole !== "branch" && !selectedBranchId}
              open={deviceOpen}
              onOpenChange={(open) => {
                setDeviceOpen(open);
                if (open && selectedBranchId && !initialData) {
                  onFetchDevices?.(true);
                }
              }}
              className={errors.device ? "border-red-500" : ""}
            />
            {errors.device && (
              <p className="text-xs text-red-500 mt-1">{errors.device}</p>
            )}
          </div>
        </div>

        {/* ACTIONS */}
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
