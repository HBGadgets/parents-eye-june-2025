"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Check,
  ChevronsUpDown,
  Eye,
  EyeOff,
  X,
  CreditCard,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Parent } from "@/interface/modal";
import { toast } from "sonner";

interface Props {
  onSubmit: (data: {
    parentName: string;
    mobileNo: string;
    email: string;
    username: string;
    password?: string;
    schoolId?: string;
    branchId?: string;
    icardAssigned?: boolean;
    vehicleTrack?: boolean;
  }) => void;

  onClose: () => void;
  initialData?: Parent | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;

  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };

  isLoadingParents?: boolean;
  isCreating?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export default function AddParentForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  selectedSchoolId,
  selectedBranchId,
  onSchoolChange,
  onBranchChange,
  decodedToken,
  isLoadingParents,
  isCreating,
  isUpdating,
  isDeleting,
}: Props) {
  const [parentName, setParentName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [icardAssigned, setIcardAssigned] = useState<boolean>(true);
  const [vehicleTrack, setVehicleTrack] = useState<boolean>(true);

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedTokenRole === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.id;

  /* ✅ Token based auto selection */
  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      onSchoolChange?.(tokenSchoolId);
    }

    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }
  }, []);

  /* ✅ Edit Prefill */
  useEffect(() => {
    if (initialData) {
      setParentName(initialData.parentName || "");
      setMobileNo(initialData.mobileNo || "");
      setEmail(initialData.email || "");
      setUsername(initialData.username || "");
      setPassword(initialData.password || "");
      setIcardAssigned(
        initialData.icardAssigned !== undefined
          ? Boolean(initialData.icardAssigned)
          : true
      );
      setVehicleTrack(
        initialData.vehicleTrack !== undefined
          ? Boolean(initialData.vehicleTrack)
          : true
      );
      onSchoolChange?.(initialData.schoolId?._id);
      onBranchChange?.(initialData.branchId?._id);
    } else {
      setParentName("");
      setMobileNo("");
      setEmail("");
      setUsername("");
      setPassword("");
      setIcardAssigned(true);
      setVehicleTrack(true);
    }
  }, [initialData]);

  const handleSave = () => {
    if (!parentName.trim()) {
      toast.error("Please enter parent name");
      return;
    }
    if (!mobileNo.trim()) {
      toast.error("Please enter mobile number");
      return;
    }
    if (!username.trim()) {
      toast.error("Please enter username");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter password");
      return;
    }
    if (decodedTokenRole === "superAdmin" && !selectedSchoolId) {
      toast.error("Please select a school");
      return;
    }
    if (decodedTokenRole !== "branch" && !selectedBranchId) {
      toast.error("Please select a branch");
      return;
    }

    onSubmit({
      parentName,
      mobileNo,
      email,
      username,
      password,
      schoolId: selectedSchoolId,
      branchId: selectedBranchId,
      icardAssigned,
      vehicleTrack,
    });
  };

  return (
    <div className="relative w-full max-w-xl bg-background rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {initialData ? "Edit Parent" : "Add Parent"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {initialData
              ? "Update parent account information and permissions"
              : "Fill in the details below to register a new parent"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Name & Mobile (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Parent Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter parent name"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Mobile No. <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter mobile number"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>
        </div>

        {/* Username & Password (2 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Username <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Password <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 text-sm pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">
            Email Address{" "}
            <span className="text-xs text-muted-foreground font-normal">
              (Optional)
            </span>
          </label>
          <Input
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {/* School & Branch (2 columns) */}
        {(decodedTokenRole === "superAdmin" || decodedTokenRole !== "branch") && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {decodedTokenRole === "superAdmin" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  School <span className="text-destructive">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9 text-sm font-normal"
                    >
                      <span className="truncate">
                        {schools.find((s) => s._id === selectedSchoolId)
                          ?.schoolName || "Select School"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search school..." />
                      <CommandEmpty>No schools found</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {schools.map((s) => (
                          <CommandItem
                            key={s._id}
                            onSelect={() => onSchoolChange?.(s._id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                s._id === selectedSchoolId
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{s.schoolName}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {decodedTokenRole !== "branch" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Branch <span className="text-destructive">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9 text-sm font-normal"
                      disabled={
                        decodedTokenRole === "superAdmin" && !selectedSchoolId
                      }
                    >
                      <span className="truncate">
                        {branches.find((b) => b._id === selectedBranchId)
                          ?.branchName ||
                          (selectedSchoolId
                            ? "Select Branch"
                            : "Select school first")}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search branch..." />
                      <CommandEmpty>No branches found</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {branches.map((b) => (
                          <CommandItem
                            key={b._id}
                            onSelect={() => onBranchChange?.(b._id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                b._id === selectedBranchId
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <span className="truncate">{b.branchName}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        )}

        {/* Access & Permissions (2 columns side by side) */}
        <div className="pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Permissions & Tracking
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* iCard Assigned Card */}
            <div
              onClick={() => setIcardAssigned(!icardAssigned)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                icardAssigned
                  ? "bg-amber-50/50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-foreground">
                    iCard Assigned
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Assign smart iCard for student
                </p>
              </div>
              <Switch
                id="icard-assigned"
                checked={icardAssigned}
                onCheckedChange={setIcardAssigned}
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer shrink-0"
              />
            </div>

            {/* Vehicle Track Card */}
            <div
              onClick={() => setVehicleTrack(!vehicleTrack)}
              className={cn(
                "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none",
                vehicleTrack
                  ? "bg-amber-50/50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-foreground">
                    Vehicle Track
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Live vehicle tracking for parent
                </p>
              </div>
              <Switch
                id="vehicle-track"
                checked={vehicleTrack}
                onCheckedChange={setVehicleTrack}
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer shrink-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom, never cut off */}
      <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t bg-muted/20">
        <Button
          variant="outline"
          type="button"
          className="cursor-pointer h-9 px-4 text-sm"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium cursor-pointer h-9 px-5 text-sm shadow-sm"
          onClick={handleSave}
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating
            ? "Saving..."
            : initialData
            ? "Update Parent"
            : "Create Parent"}
        </Button>
      </div>
    </div>
  );
}
