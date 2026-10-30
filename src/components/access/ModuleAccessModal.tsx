"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accessService } from "@/services/api/accessService";
import { UserAccessPermissions } from "@/store/authStore";
import { toast } from "sonner";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Loader2,
  LayoutGrid,
  School as SchoolIcon,
  FileBarChart2,
} from "lucide-react";

export interface PermissionModuleMeta {
  key: string;
  label: string;
  description: string;
}

export const MODULE_PERMISSIONS_SCHEMA: Record<
  "master" | "school" | "reports",
  PermissionModuleMeta[]
> = {
  master: [
    { key: "device", label: "Device", description: "Device GPS tracking & hardware management" },
    { key: "geoTag", label: "CRTag", description: "BLE GeoTag device management & tracking" },
    { key: "schoolMaster", label: "School Master", description: "School admin management" },
    { key: "branchMaster", label: "Branch Master", description: "Branch management" },
    { key: "userAccess", label: "Branch Group", description: "Branch group access control configuration" },
    { key: "studentDetails", label: "Student Details", description: "Student master database" },
    { key: "parentsMaster", label: "Parents Master", description: "Parent profiles & contacts" },
    { key: "routes", label: "Routes", description: "Bus route planning" },
    { key: "routeRoster", label: "Route Roster", description: "Bus and shift roster assignments" },
    { key: "geofence", label: "Geofence", description: "Geofence zone setup & radius" },
    { key: "model", label: "Model", description: "Vehicle device models" },
    { key: "category", label: "Category", description: "Vehicle categories" },
    { key: "ticketTypes", label: "Ticket Types", description: "Support ticket categories" },
  ],
  school: [
    { key: "leaveRequest", label: "Leave Request", description: "Student leave submissions & approvals" },
    { key: "sendBroadcast", label: "Send Broadcast", description: "Broadcast messaging to parents" },
    { key: "driverApprove", label: "Driver Approve", description: "Driver account approval & onboarding" },
    { key: "supervisorApprove", label: "Supervisor Approve", description: "Supervisor account approval & onboarding" },
  ],
  reports: [
    { key: "analytics", label: "Analytics Report", description: "High-level fleet analytics" },
    { key: "status", label: "Status Report", description: "Online/offline/running vehicle status" },
    { key: "distance", label: "Distance Report", description: "Daily/weekly distance traveled" },
    { key: "history", label: "History Report", description: "Historical playback & route tracing" },
    { key: "stop", label: "Stop Report", description: "Bus stop entry & exit durations" },
    { key: "stoppageSummary", label: "Stoppage Summary", description: "Total stoppage summary breakdown" },
    { key: "travel", label: "Travel Summary", description: "Trip travel duration & distance summary" },
    { key: "trip", label: "Trip Report", description: "Detailed bus trips per day" },
    { key: "idle", label: "Idle Report", description: "Engine idling durations" },
    { key: "alert", label: "Alerts/Events", description: "SOS, overspeed, tampering alerts" },
    { key: "geofenceReport", label: "Geofence Report", description: "Geofence entry/exit timestamp report" },
    { key: "routeReport", label: "Route Report", description: "Route schedule completion report" },
    { key: "pickupAndDrop", label: "Pickup And Drop", description: "Student pickup & drop status" },
    // { key: "ePoliceReport", label: "e-Police Report", description: "Police submission report" },
  ],
};

export const getSchemaForCategory = (
  category: "master" | "school" | "reports",
  targetType: "school" | "branch" | "branchGroup"
): PermissionModuleMeta[] => {
  const list = MODULE_PERMISSIONS_SCHEMA[category];
  if (category === "master") {
    if (targetType === "school" || targetType === "branchGroup") {
      // School/BranchGroup baseline items in Master
      const allowedKeys = [
        "device",
        "geoTag",
        "branchMaster",
        "studentDetails",
        "parentsMaster",
        "routes",
        "routeRoster",
        "geofence",
      ];
      return list.filter((item) => allowedKeys.includes(item.key));
    }
    if (targetType === "branch") {
      // Branch baseline items in Master (no Branch Master)
      const allowedKeys = [
        "device",
        "geoTag",
        "studentDetails",
        "parentsMaster",
        "routes",
        "routeRoster",
        "geofence",
      ];
      return list.filter((item) => allowedKeys.includes(item.key));
    }
  }
  return list;
};

const DEFAULT_ACCESS: UserAccessPermissions = {
  master: {
    device: true,
    geoTag: true,
    schoolMaster: false,
    branchMaster: false,
    userAccess: false,

    studentDetails: true,
    parentsMaster: true,
    routes: true,
    routeRoster: true,
    geofence: true,
    model: false,
    category: false,
    ticketTypes: true,
  },
  school: {
    pickupAndDrop: true,
    leaveRequest: true,
    sendBroadcast: true,
    driverApprove: true,
    supervisorApprove: true,
  },
  users: {
    driverApprove: true,
    supervisorApprove: true,
  },
  reports: {
    analytics: true,
    status: true,
    distance: true,
    history: true,
    stop: true,
    stoppageSummary: true,
    travel: true,
    trip: true,
    idle: true,
    alert: true,
    geofenceReport: true,
    routeReport: true,
    pickupAndDrop: true,
    ePoliceReport: false,
  },
};

interface ModuleAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "school" | "branch" | "branchGroup";
  targetId: string;
  targetName: string;
  initialAccess?: UserAccessPermissions;
  onSuccess?: () => void;
}

export const ModuleAccessModal: React.FC<ModuleAccessModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetName,
  initialAccess,
  onSuccess,
}) => {
  const [access, setAccess] = useState<UserAccessPermissions>(DEFAULT_ACCESS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("master");

  useEffect(() => {
    if (!isOpen || !targetId) return;

    if (initialAccess && Object.keys(initialAccess).length > 0) {
      setAccess({
        master: { ...DEFAULT_ACCESS.master, ...initialAccess.master },
        school: {
          ...DEFAULT_ACCESS.school,
          ...initialAccess.school,
          ...(initialAccess.users?.driverApprove !== undefined ? { driverApprove: initialAccess.users.driverApprove } : {}),
          ...(initialAccess.users?.supervisorApprove !== undefined ? { supervisorApprove: initialAccess.users.supervisorApprove } : {}),
        },
        users: { ...DEFAULT_ACCESS.users, ...initialAccess.users },
        reports: { ...DEFAULT_ACCESS.reports, ...initialAccess.reports },
      });
      return;
    }

    const fetchAccess = async () => {
      setLoading(true);
      try {
        let res: any;
        if (targetType === "school") {
          res = await accessService.getSchoolAccess(targetId);
        } else if (targetType === "branch") {
          res = await accessService.getBranchAccess(targetId);
        } else if (targetType === "branchGroup") {
          res = await accessService.getBranchGroupAccess(targetId);
        }

        const fetched = res?.access || res?.data?.access || res?.data || res;
        if (fetched && typeof fetched === "object") {
          setAccess({
            master: { ...DEFAULT_ACCESS.master, ...fetched.master },
            school: {
              ...DEFAULT_ACCESS.school,
              ...fetched.school,
              ...(fetched.users?.driverApprove !== undefined ? { driverApprove: fetched.users.driverApprove } : {}),
              ...(fetched.users?.supervisorApprove !== undefined ? { supervisorApprove: fetched.users.supervisorApprove } : {}),
            },
            users: { ...DEFAULT_ACCESS.users, ...fetched.users },
            reports: { ...DEFAULT_ACCESS.reports, ...fetched.reports },
          });
        }
      } catch (err: any) {
        console.error("Failed to load access permissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccess();
  }, [isOpen, targetId, targetType, initialAccess]);

  const handleToggle = (
    category: "master" | "school" | "reports",
    feature: string,
    value: boolean
  ) => {
    setAccess((prev) => {
      const updatedCategory = {
        ...(prev[category] || {}),
        [feature]: value,
      };

      const updatedUsers =
        category === "school" && (feature === "driverApprove" || feature === "supervisorApprove")
          ? { ...(prev.users || {}), [feature]: value }
          : prev.users;

      return {
        ...prev,
        [category]: updatedCategory,
        ...(category === "school" ? { users: updatedUsers } : {}),
      };
    });
  };

  const handleToggleAllCategory = (
    category: "master" | "school" | "reports",
    value: boolean
  ) => {
    const updatedCategory: Record<string, boolean> = { ...(access[category] || {}) };
    getSchemaForCategory(category, targetType).forEach((item) => {
      updatedCategory[item.key] = value;
    });

    setAccess((prev) => ({
      ...prev,
      [category]: updatedCategory,
      ...(category === "school"
        ? {
            users: {
              ...(prev.users || {}),
              driverApprove: value,
              supervisorApprove: value,
            },
          }
        : {}),
    }));
  };

  const handleToggleAllGlobal = (value: boolean) => {
    const newAccess: UserAccessPermissions = { ...access };
    (Object.keys(MODULE_PERMISSIONS_SCHEMA) as Array<
      "master" | "school" | "reports"
    >).forEach((cat) => {
      newAccess[cat] = { ...(newAccess[cat] || {}) };
      getSchemaForCategory(cat, targetType).forEach((item) => {
        newAccess[cat]![item.key] = value;
      });
    });
    newAccess.users = {
      ...(newAccess.users || {}),
      driverApprove: value,
      supervisorApprove: value,
    };
    setAccess(newAccess);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadToSave: UserAccessPermissions = {
        ...access,
        users: {
          ...(access.users || {}),
          ...(access.school?.driverApprove !== undefined ? { driverApprove: access.school.driverApprove } : {}),
          ...(access.school?.supervisorApprove !== undefined ? { supervisorApprove: access.school.supervisorApprove } : {}),
        },
      };

      if (targetType === "school") {
        await accessService.updateSchoolAccess(targetId, payloadToSave);
      } else if (targetType === "branch") {
        await accessService.updateBranchAccess(targetId, payloadToSave);
      } else if (targetType === "branchGroup") {
        await accessService.updateBranchGroupAccess(targetId, payloadToSave);
      }

      toast.success(
        `Permissions updated successfully for ${targetName || "target"}`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to update access:", err);
      const msg =
        err?.response?.data?.message || "Failed to update permissions";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryCount = (category: "master" | "school" | "reports") => {
    const list = getSchemaForCategory(category, targetType);
    const active = list.filter((item) => access[category]?.[item.key] === true).length;
    return `${active}/${list.length}`;
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-yellow-400 text-yellow-950 font-bold">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  Access Permissions: {targetName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Granular module permission control for{" "}
                  <span className="capitalize font-semibold text-gray-800">
                    {targetType}
                  </span>
                  . Configure feature access without granting full access.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleAllGlobal(true)}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Allow All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleAllGlobal(false)}
                className="h-8 text-xs font-medium cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />
                Revoke All
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body with Tabs */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
            <p className="text-sm text-muted-foreground">
              Loading module permissions...
            </p>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-5 pt-3 pb-2 border-b bg-background">
              <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted/60">
                <TabsTrigger
                  value="master"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=checked]:bg-white data-[state=checked]:shadow-xs"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Master</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-yellow-400/30 text-yellow-950 font-bold ml-1">
                    {getCategoryCount("master")}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="school"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=checked]:bg-white data-[state=checked]:shadow-xs"
                >
                  <SchoolIcon className="h-3.5 w-3.5" />
                  <span>School</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-yellow-400/30 text-yellow-950 font-bold ml-1">
                    {getCategoryCount("school")}
                  </span>
                </TabsTrigger>

                <TabsTrigger
                  value="reports"
                  className="flex items-center justify-center gap-1.5 text-xs font-semibold data-[state=checked]:bg-white data-[state=checked]:shadow-xs"
                >
                  <FileBarChart2 className="h-3.5 w-3.5" />
                  <span>Reports</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-yellow-400/30 text-yellow-950 font-bold ml-1">
                    {getCategoryCount("reports")}
                  </span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {(
                [
                  "master",
                  "school",
                  "reports",
                ] as Array<"master" | "school" | "reports">
              ).map((category) => (
                <TabsContent
                  key={category}
                  value={category}
                  className="mt-0 space-y-4 focus-visible:outline-none"
                >
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {category} Features ({getSchemaForCategory(category, targetType).length})
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllCategory(category, true)}
                        className="text-xs text-yellow-700 hover:text-yellow-900 font-semibold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-muted-foreground">•</span>
                      <button
                        type="button"
                        onClick={() => handleToggleAllCategory(category, false)}
                        className="text-xs text-muted-foreground hover:text-red-600 font-semibold cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getSchemaForCategory(category, targetType).map((item) => {

                      const isChecked = !!access[category]?.[item.key];
                      return (
                        <div
                          key={item.key}
                          onClick={() =>
                            handleToggle(category, item.key, !isChecked)
                          }
                          className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-yellow-50/50 border-yellow-300/80 shadow-xs"
                              : "bg-white border-border/70 hover:border-border"
                          }`}
                        >
                          <div className="pr-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {item.label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={(val) =>
                              handleToggle(category, item.key, val)
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 data-[state=checked]:bg-yellow-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </div>
          </Tabs>
        )}

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-bold cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Permissions"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
