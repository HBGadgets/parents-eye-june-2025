"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FloatingMenu } from "@/components/floatingMenu";
import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { Student, School, Branch, Route, Geofence } from "@/interface/modal";
import { useExport } from "@/hooks/useExport";
import { useStudents } from "@/hooks/useStudent";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Alert } from "@/components/Alert";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, X, XCircle } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/datePicker";
import Cookies from "js-cookie";
import { getDecodedToken } from "@/lib/jwt";

// ==================== CONSTANTS ====================
const EDIT_FIELDS: FieldConfig[] = [
  { key: "childName", label: "Student Name", type: "text", required: true },
  { key: "age", label: "Age", type: "number", required: true },
  { key: "className", label: "Class", type: "text", required: true },
  { key: "section", label: "Section", type: "text", required: true },
  { key: "schoolId", label: "School", type: "select", required: true },
  { key: "branchId", label: "Branch", type: "select", required: true },
  { key: "routeObjId", label: "Route", type: "select", required: true },
  {
    key: "pickupGeoId",
    label: "Pickup Location",
    type: "select",
    required: true,
  },
  { key: "dropGeoId", label: "Drop Location", type: "select", required: true },
];

const EXPORT_COLUMNS = [
  { key: "childName", header: "Child Name" },
  { key: "section", header: "Section" },
  { key: "age", header: "Age" },
  { key: "schoolId.schoolName", header: "School" },
  { key: "branchId.branchName", header: "Branch" },
  { key: "routeObjId.routeNumber", header: "Route Number" },
  { key: "parentId.parentName", header: "Parent Name" },
  { key: "parentId.mobileNo", header: "Contact no" },
  { key: "pickupGeoId.geofenceName", header: "Pickup Location" },
  { key: "dropGeoId.geofenceName", header: "Drop Location" },
  { key: "parentId.username", header: "Username" },
  { key: "parentId.password", header: "Password" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const PARENT_FORM_FIELDS = [
  { id: "parentName", label: "Parent Name", type: "text" },
  {
    id: "mobileNo",
    label: "Mobile No",
    type: "tel",
    pattern: "[0-9]{10}",
    maxLength: 10,
  },
  { id: "username", label: "Username", type: "text" },
  { id: "email", label: "Email", type: "email" },
  { id: "password", label: "Password", type: "text" },
];

// ==================== HELPER FUNCTIONS ====================
const getId = (obj: any, fallbackKey?: string): string => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj._id || (fallbackKey && obj[fallbackKey]) || "";
};

const extractData = (data: any, fallbackKeys: string[] = []): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  for (const key of fallbackKeys) {
    if (data[key] && Array.isArray(data[key])) return data[key];
  }
  return [];
};

// ==================== COMPONENTS ====================
const FilterBadge = ({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) => (
  <Badge
    variant="secondary"
    className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200"
  >
    <span className="text-xs">
      {label}: {value}
    </span>
    <button
      onClick={onRemove}
      className="ml-1 rounded-full hover:bg-blue-200 p-0.5"
      type="button"
    >
      <XCircle className="w-3 h-3" />
    </button>
  </Badge>
);

// ==================== MAIN COMPONENT ====================
export default function StudentDetails() {
  const queryClient = useQueryClient();
  const addParentCloseRef = useRef<HTMLButtonElement>(null);

  // State
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: false }]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [date, setDate] = useState<Date | undefined>(new Date());

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addParentDialogOpen, setAddParentDialogOpen] = useState(false);

  // Form states
  const [children, setChildren] = useState<any[]>([]);
  const [childForm, setChildForm] = useState({
    childName: "",
    age: "",
    className: "",
    section: "",
  });

  // Selection states
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedPickupGeo, setSelectedPickupGeo] = useState("");
  const [selectedDropGeo, setSelectedDropGeo] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedDOB, setSelectedDOB] = useState<Date | undefined>(undefined);

  // Edit states
  const [editSelectedSchool, setEditSelectedSchool] = useState("");
  const [editSelectedBranch, setEditSelectedBranch] = useState("");

  // Add parent states
  const [addParentSchool, setAddParentSchool] = useState("");
  const [addParentBranch, setAddParentBranch] = useState("");

  // Search states
  const [searchStates, setSearchStates] = useState({
    parent: "",
    school: "",
    branch: "",
    route: "",
    pickupGeo: "",
    dropGeo: "",
    gender: "",
    addParentSchool: "",
    addParentBranch: "",
  });

  // Role-based state
  const [role, setRole] = useState<string | null>(null);
  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    school: "",
    branch: "",
    route: "",
    pickupGeo: "",
    dropGeo: "",
  });

  const { exportToPDF, exportToExcel } = useExport();

  // Get user role and permissions
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    const decoded = getDecodedToken(token);
    const userRole = (decoded?.role || "").toLowerCase();
    setRole(userRole);

    if (userRole === "school") {
      setUserSchoolId(decoded?.schoolId || null);
      setSelectedSchool(decoded?.schoolId || "");
      setFilters((prev) => ({ ...prev, school: decoded?.schoolId || "" }));
    } else if (userRole === "branch") {
      setUserBranchId(decoded?.branchId || null);
      setSelectedBranch(decoded?.branchId || "");
      setFilters((prev) => ({ ...prev, branch: decoded?.branchId || "" }));

      if (decoded?.schoolId) {
        setUserSchoolId(decoded.schoolId);
        setSelectedSchool(decoded.schoolId);
        setFilters((prev) => ({ ...prev, school: decoded.schoolId }));
      }
    }
  }, []);

  // Role checks
  const isSuperAdmin = useMemo(
    () => ["admin", "superadmin", "super_admin", "root"].includes(role || ""),
    [role]
  );
  const isSchoolRole = useMemo(
    () => ["school", "schooladmin"].includes(role || ""),
    [role]
  );
  const isBranchRole = useMemo(
    () => ["branch", "branchadmin"].includes(role || ""),
    [role]
  );

  // Data fetching
  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => api.get<School[]>("/school"),
    enabled: isSuperAdmin,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branch"),
    enabled: true,
  });

  const { data: routesData } = useQuery({
    queryKey: ["routes", userBranchId],
    queryFn: () => {
      if (isBranchRole && userBranchId) {
        return api.get<Route[]>(`/route?branchId=${userBranchId}`);
      }
      return api.get<Route[]>("/route");
    },
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });

  const { data: geofencesData } = useQuery({
    queryKey: ["geofences"],
    queryFn: () => api.get<Geofence[]>("/geofence"),
    staleTime: 5 * 60 * 1000,
    enabled: true,
  });

  const { data: parentsData } = useQuery({
    queryKey: ["parents"],
    queryFn: () => api.get<any[]>("/parent"),
  });

  const studentFilters = useMemo(
    () => ({
      ...(debouncedSearchTerm && { search: debouncedSearchTerm.trim() }),
      ...(filters.school && { schoolId: filters.school }),
      ...(filters.branch && { branchId: filters.branch }),
      ...(filters.route && { routeObjId: filters.route }),
      ...(filters.pickupGeo && { pickupGeoId: filters.pickupGeo }),
      ...(filters.dropGeo && { dropGeoId: filters.dropGeo }),
      ...(isSchoolRole && userSchoolId && { schoolId: userSchoolId }),
      ...(isBranchRole && userBranchId && { branchId: userBranchId }),
    }),
    [
      debouncedSearchTerm,
      filters,
      isSchoolRole,
      userSchoolId,
      isBranchRole,
      userBranchId,
    ]
  );

  const {
    data: studentsData,
    isLoading: studentsLoading,
    isFetching,
  } = useStudents({
    pagination,
    sorting,
    filters: studentFilters,
  });

  // Data extraction
  const routes = extractData(routesData, ["data", "routes"]);
  const geofences = extractData(geofencesData, ["data", "geofences"]);
  const students = extractData(studentsData, ["data", "children", "students"]);
  const parents = extractData(parentsData, ["data", "parents"]);
  const totalCount =
    studentsData?.total ??
    studentsData?.totalCount ??
    studentsData?.pagination?.total ??
    students.length;

  // ✅ FIXED: Define schoolOptions
  const schoolOptions = useMemo(() => {
    return schools.map((s: School) => ({
      label: s.schoolName || `School ${s._id}`,
      value: s._id,
    }));
  }, [schools]);

  // ✅ FIXED: Define branchOptions
  const branchOptions = useMemo(() => {
    if (isSchoolRole && userSchoolId) {
      return branches
        .filter((b) => getId(b.schoolId) === userSchoolId)
        .map((b) => ({ label: b.branchName, value: b._id }));
    }
    if (selectedSchool) {
      return branches
        .filter((b) => getId(b.schoolId) === selectedSchool)
        .map((b) => ({ label: b.branchName, value: b._id }));
    }
    return branches.map((b) => ({ label: b.branchName, value: b._id }));
  }, [branches, selectedSchool, isSchoolRole, userSchoolId]);

  // ✅ FIXED: Define routeOptions
  const routeOptions = useMemo(() => {
    if (isBranchRole && userBranchId) {
      return routes
        .filter((r) => getId(r.branchId) === userBranchId)
        .map((r) => ({
          label: r.routeNumber || `Route ${r.routeName || r._id}`,
          value: r._id,
        }));
    }
    if (selectedBranch) {
      return routes
        .filter((r) => getId(r.branchId) === selectedBranch)
        .map((r) => ({
          label: r.routeNumber || `Route ${r.routeName || r._id}`,
          value: r._id,
        }));
    }
    return routes.map((r) => ({
      label: r.routeNumber || `Route ${r.routeName || r._id}`,
      value: r._id,
    }));
  }, [routes, selectedBranch, isBranchRole, userBranchId]);

  // ✅ FIXED: Define parentOptions - Only show parent name
  const parentOptions = useMemo(() => {
    let filteredParents = parents;

    if (isSchoolRole && userSchoolId) {
      filteredParents = parents.filter(
        (p) => getId(p.schoolId) === userSchoolId
      );
    } else if (isBranchRole && userBranchId) {
      filteredParents = parents.filter(
        (p) => getId(p.branchId) === userBranchId
      );
    } else if (selectedSchool && selectedBranch) {
      filteredParents = parents.filter(
        (p) =>
          getId(p.schoolId) === selectedSchool &&
          getId(p.branchId) === selectedBranch
      );
    } else if (selectedSchool) {
      filteredParents = parents.filter(
        (p) => getId(p.schoolId) === selectedSchool
      );
    }

    return filteredParents.map((p) => ({
      label: p.parentName, // Only show parent name, removed mobile number
      value: p._id,
    }));
  }, [
    parents,
    selectedSchool,
    selectedBranch,
    isSchoolRole,
    userSchoolId,
    isBranchRole,
    userBranchId,
  ]);
  // ✅ FIXED: More robust geofence name resolver
  const findGeofenceName = (geo: any) => {
    if (!geo) return "N/A";

    // Case 1: It's an object
    if (typeof geo === "object") {
      if (geo.geofenceName) return geo.geofenceName;
      if (geo.name) return geo.name;
      if (geo.area && geo.area.center) return `(${geo.area.center.join(", ")})`;
      return "N/A";
    }

    // Case 2: It's an ID string — lookup in geofences list
    const found = geofences.find(
      (g: any) => g._id?.toString() === geo?.toString()
    );
    return found
      ? found.geofenceName || found.name || `Geofence ${found._id}`
      : "N/A";
  };

  // Create geofence options and helper to resolve names (handles object or id)
  const geofenceOptions = useMemo(() => {
    return geofences.map((g: any) => ({
      label: g.geofenceName || `Geofence ${g._id}`,
      value: g._id,
    }));
  }, [geofences]);

  // ✅ FIXED: Pickup and drop options for add student form - show ALL geofences when route is selected
  const routePickupOptions = useMemo(() => {
    // When route is selected, show ALL geofences (not just route-specific ones)
    if (selectedRoute) {
      return geofenceOptions;
    }
    // If no route selected, show empty options
    return [];
  }, [selectedRoute, geofenceOptions]);

  const routeDropOptions = useMemo(() => {
    // When route is selected, show ALL geofences (not just route-specific ones)
    if (selectedRoute) {
      return geofenceOptions;
    }
    // If no route selected, show empty options
    return [];
  }, [selectedRoute, geofenceOptions]);

  const addParentBranchOptions = useMemo(() => {
    if (!addParentSchool) return [];
    return branches
      .filter((b) => getId(b.schoolId) === addParentSchool)
      .map((b) => ({ label: b.branchName, value: b._id }));
  }, [branches, addParentSchool]);

  const editFilteredBranches = useMemo(
    () =>
      editSelectedSchool
        ? branches.filter((b) => getId(b.schoolId) === editSelectedSchool)
        : [],
    [editSelectedSchool, branches]
  );

  const editFilteredRoutes = useMemo(
    () =>
      editSelectedBranch
        ? routes.filter((r) => getId(r.branchId) === editSelectedBranch)
        : [],
    [editSelectedBranch, routes]
  );

  // Filter options
  const filterBranchOptions = useMemo(() => {
    if (isBranchRole && userBranchId) {
      const userBranch = branches.find((b) => b._id === userBranchId);
      return userBranch
        ? [{ label: userBranch.branchName, value: userBranch._id }]
        : [];
    }

    if (filters.school) {
      return branches
        .filter((b) => getId(b.schoolId) === filters.school)
        .map((b) => ({ label: b.branchName, value: b._id }));
    }

    if (isSchoolRole && userSchoolId) {
      return branches
        .filter((b) => getId(b.schoolId) === userSchoolId)
        .map((b) => ({ label: b.branchName, value: b._id }));
    }

    return branches.map((b) => ({ label: b.branchName, value: b._id }));
  }, [
    branches,
    filters.school,
    isSchoolRole,
    userSchoolId,
    isBranchRole,
    userBranchId,
  ]);

  const filterRouteOptions = useMemo(() => {
    if (isBranchRole && userBranchId) {
      return routes
        .filter((r) => getId(r.branchId) === userBranchId)
        .map((r) => ({
          label: r.routeNumber || `Route ${r.routeName || r._id}`,
          value: r._id,
        }));
    }

    if (filters.branch) {
      return routes
        .filter((r) => getId(r.branchId) === filters.branch)
        .map((r) => ({
          label: r.routeNumber || `Route ${r.routeName || r._id}`,
          value: r._id,
        }));
    }

    if (isSchoolRole && userSchoolId) {
      const schoolBranches = branches
        .filter((b) => getId(b.schoolId) === userSchoolId)
        .map((b) => b._id);
      return routes
        .filter((r) => schoolBranches.includes(getId(r.branchId)))
        .map((r) => ({
          label: r.routeNumber || `Route ${r.routeName || r._id}`,
          value: r._id,
        }));
    }

    return routes.map((r) => ({
      label: r.routeNumber || `Route ${r.routeName || r._id}`,
      value: r._id,
    }));
  }, [
    routes,
    filters.branch,
    branches,
    isSchoolRole,
    userSchoolId,
    isBranchRole,
    userBranchId,
  ]);

  // ✅ FIXED: Pickup and drop options for filters - show ALL geofences when route is selected
  const filterPickupOptions = useMemo(() => {
    // When route is selected in filters, show ALL geofences
    if (filters.route) {
      return geofenceOptions;
    }
    // If no route selected, show empty options
    return [];
  }, [filters.route, geofenceOptions]);

  const filterDropOptions = useMemo(() => {
    // When route is selected in filters, show ALL geofences
    if (filters.route) {
      return geofenceOptions;
    }
    // If no route selected, show empty options
    return [];
  }, [filters.route, geofenceOptions]);

  const selectedParentData = useMemo(
    () => parents.find((p) => p._id === selectedParent),
    [selectedParent, parents]
  );

  // Active filters
  const activeFilters = useMemo(() => {
    const active: Array<{ key: string; label: string; value: string }> = [];

    if (filters.school && isSuperAdmin) {
      const school = schoolOptions.find((s) => s.value === filters.school);
      active.push({
        key: "school",
        label: "School",
        value: school?.label || filters.school,
      });
    }
    if (filters.branch && !isBranchRole) {
      const branch = filterBranchOptions.find(
        (b) => b.value === filters.branch
      );
      active.push({
        key: "branch",
        label: "Branch",
        value: branch?.label || filters.branch,
      });
    }
    if (filters.route) {
      const route = filterRouteOptions.find((r) => r.value === filters.route);
      active.push({
        key: "route",
        label: "Route",
        value: route?.label || filters.route,
      });
    }
    if (filters.pickupGeo) {
      const pickup = filterPickupOptions.find(
        (g) => g.value === filters.pickupGeo
      );
      active.push({
        key: "pickup",
        label: "Pickup",
        value: pickup?.label || filters.pickupGeo,
      });
    }
    if (filters.dropGeo) {
      const drop = filterDropOptions.find((g) => g.value === filters.dropGeo);
      active.push({
        key: "drop",
        label: "Drop",
        value: drop?.label || filters.dropGeo,
      });
    }
    return active;
  }, [
    filters,
    schoolOptions,
    filterBranchOptions,
    filterRouteOptions,
    filterPickupOptions,
    filterDropOptions,
    isSuperAdmin,
    isBranchRole,
  ]);

  // Effects
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [
    filters.school,
    filters.branch,
    filters.route,
    filters.pickupGeo,
    filters.dropGeo,
  ]);

  useEffect(() => {
    if (editTarget) {
      setEditSelectedSchool(getId(editTarget.schoolId));
      setEditSelectedBranch(getId(editTarget.branchId));
    } else {
      setEditSelectedSchool("");
      setEditSelectedBranch("");
    }
  }, [editTarget]);

  useEffect(() => {
    if (isSchoolRole && userSchoolId && branches.length > 0) {
      setSelectedSchool(userSchoolId);
      const schoolBranches = branches.filter(
        (b) => getId(b.schoolId) === userSchoolId
      );
      if (schoolBranches.length > 0) {
        setSelectedBranch(schoolBranches[0]._id);
      }
    }
    if (isBranchRole && userBranchId) {
      setSelectedBranch(userBranchId);
      if (userSchoolId) setSelectedSchool(userSchoolId);
    }
  }, [isSchoolRole, userSchoolId, isBranchRole, userBranchId, branches]);

  useEffect(() => {
    if (!addDialogOpen) {
      setChildren([]);
      setSelectedParent("");
      if (!isSchoolRole) setSelectedSchool("");
      if (!isBranchRole) setSelectedBranch("");
      setSelectedRoute("");
      setSelectedPickupGeo("");
      setSelectedDropGeo("");
      setSelectedGender("");
      setSelectedDOB(undefined);
      setChildForm({ childName: "", age: "", className: "", section: "" });
      setSearchStates((prev) => ({
        ...prev,
        parent: "",
        school: "",
        branch: "",
        route: "",
        pickupGeo: "",
        dropGeo: "",
        gender: "",
      }));
    }
  }, [addDialogOpen, isSchoolRole, isBranchRole]);

  useEffect(() => {
    if (!addParentDialogOpen) {
      setAddParentSchool("");
      setAddParentBranch("");
      setSearchStates((prev) => ({
        ...prev,
        addParentSchool: "",
        addParentBranch: "",
      }));
    }
  }, [addParentDialogOpen]);

  useEffect(() => {
    if (selectedParentData && !isSchoolRole && !isBranchRole) {
      setSelectedSchool(getId(selectedParentData.schoolId));
      setSelectedBranch(getId(selectedParentData.branchId));
    }
  }, [selectedParentData, isSchoolRole, isBranchRole]);

  useEffect(() => {
    if (isSuperAdmin) setSelectedParent("");
  }, [selectedSchool, selectedBranch, isSuperAdmin]);

  useEffect(() => {
    if (
      isBranchRole &&
      userBranchId &&
      routeOptions.length === 1 &&
      !selectedRoute
    ) {
      setSelectedRoute(routeOptions[0].value);
    }
  }, [isBranchRole, userBranchId, routeOptions, selectedRoute]);

  // Filter handlers
  const clearFilters = () => {
    const newFilters = {
      school: "",
      branch: "",
      route: "",
      pickupGeo: "",
      dropGeo: "",
    };
    if (isSchoolRole && userSchoolId) newFilters.school = userSchoolId;
    if (isBranchRole && userBranchId) {
      newFilters.branch = userBranchId;
      if (userSchoolId) newFilters.school = userSchoolId;
    }
    setFilters(newFilters);
  };

  const clearFilter = (filterKey: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (filterKey === "school") {
        newFilters.school = isSchoolRole && userSchoolId ? userSchoolId : "";
        newFilters.branch = "";
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === "branch") {
        newFilters.branch = isBranchRole && userBranchId ? userBranchId : "";
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === "route") {
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === "pickup") {
        newFilters.pickupGeo = "";
      } else if (filterKey === "drop") {
        newFilters.dropGeo = "";
      }

      return newFilters;
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      if (key === "school") {
        newFilters.branch = "";
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (key === "branch") {
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (key === "route") {
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      }
      return newFilters;
    });
  };

  const isSearchActive = searchTerm.trim() !== "";
  const isFilterActive = Object.values(filters).some(Boolean);

  // Mutations
  const addParentMutation = useMutation({
    mutationFn: async (newParent: any) => {
      const parent = await api.post("/parent", newParent);
      return parent.parent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parents"] });
      setAddParentDialogOpen(false);
      setSelectedParent(data._id);
      alert("Parent added successfully.");
    },
    onError: (err: any) =>
      alert(`Failed to add parent.\nError: ${err.message}`),
  });

  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => api.post("/child", newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setAddDialogOpen(false);
      alert("Student(s) added successfully.");
    },
    onError: (err: any) => {
      console.error("Add student error:", err);
      alert(
        `Failed to add student.\nError: ${
          err.response?.data?.message || err.message
        }`
      );
    },
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({
      studentId,
      data,
    }: {
      studentId: string;
      data: Partial<Student>;
    }) => api.put(`/child/${studentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      setEditSelectedSchool("");
      setEditSelectedBranch("");
      alert("Student updated successfully.");
    },
    onError: (err: Error) =>
      alert(`Failed to update student.\nError: ${err.message}`),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => api.mulDelete("/child", { ids: [id] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setDeleteTarget(null);
      alert("Student deleted successfully.");
    },
    onError: (err: any) =>
      alert(`Failed to delete student.\nError: ${err.message}`),
  });

  // Handlers
  const handleSave = (updatedData: Partial<Student>) => {
    if (!editTarget) return;
    const changedFields: Partial<Record<keyof Student, unknown>> = {};
    const dataToCompare = { ...updatedData };

    for (const key in dataToCompare) {
      const newValue = dataToCompare[key as keyof Student];
      const oldValue = editTarget[key as keyof Student];
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Student] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) return;
    updateStudentMutation.mutate({
      studentId: editTarget._id,
      data: changedFields,
    });
  };

  const handleAddParentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;

    const schoolIdToUse = isSchoolRole
      ? userSchoolId
      : isBranchRole
      ? userSchoolId
      : addParentSchool;
    const branchIdToUse = isBranchRole ? userBranchId : addParentBranch;

    if (!schoolIdToUse) {
      alert("Please select a school.");
      return;
    }
    if (!branchIdToUse) {
      alert("Please select a branch.");
      return;
    }

    const data = {
      parentName: form.parentName.value.trim(),
      mobileNo: form.mobileNo.value.trim(),
      email: form.email.value.trim(),
      username: form.username.value.trim(),
      password: form.password.value,
      schoolId: schoolIdToUse,
      branchId: branchIdToUse,
      isActive: form.isActive?.checked ?? true,
    };

    try {
      await addParentMutation.mutateAsync(data);
      form.reset();
    } catch (err) {
      console.error("Failed to add parent:", err);
    }
  };

  const handleChildFormChange = (field: string, value: string) => {
    setChildForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedParent) {
      alert("Please select a parent.");
      return;
    }
    if (!selectedRoute) {
      alert("Please select a route.");
      return;
    }
    if (!selectedPickupGeo) {
      alert("Please select a pickup location.");
      return;
    }
    if (!selectedDropGeo) {
      alert("Please select a drop location.");
      return;
    }
    if (!childForm.childName.trim()) {
      alert("Please enter student name.");
      return;
    }

    const newChild = {
      childName: childForm.childName.trim(),
      className: childForm.className.trim() || "",
      section: childForm.section.trim() || "",
      DOB: selectedDOB ? format(selectedDOB, "yyyy-MM-dd") : "",
      age: childForm.age ? parseInt(childForm.age) : undefined,
      gender: selectedGender || "",
      routeObjId: selectedRoute,
      pickupGeoId: selectedPickupGeo,
      dropGeoId: selectedDropGeo,
      schoolId: selectedSchool,
      branchId: selectedBranch,
    };

    setChildren([...children, newChild]);
    setChildForm({ childName: "", age: "", className: "", section: "" });
    setSelectedGender("");
    setSelectedPickupGeo("");
    setSelectedDropGeo("");
    setSelectedDOB(undefined);
    setSearchStates((prev) => ({
      ...prev,
      gender: "",
      pickupGeo: "",
      dropGeo: "",
    }));

    alert(
      `Child "${newChild.childName}" added! You can add more siblings or submit.`
    );
  };

  const handleRemoveChild = (index: number) =>
    setChildren(children.filter((_, i) => i !== index));

  const handleFinalSubmit = async () => {
    if (!selectedParent) {
      alert("Please select a parent.");
      return;
    }
    if (children.length === 0) {
      alert("Please add at least one child before submitting.");
      return;
    }

    for (const child of children) {
      if (
        !child.childName ||
        !child.routeObjId ||
        !child.pickupGeoId ||
        !child.dropGeoId
      ) {
        alert(
          "Please ensure all children have Student Name, Route, Pickup Location, and Drop Location filled."
        );
        return;
      }
    }

    const selectedParentObj = parents.find((p) => p._id === selectedParent);
    if (!selectedParentObj) {
      alert("Selected parent not found. Please select a valid parent.");
      return;
    }

    const submissionData = {
      parent: {
        _id: selectedParentObj._id,
        parentName: selectedParentObj.parentName,
        mobileNo: selectedParentObj.mobileNo,
        email: selectedParentObj.email,
        username: selectedParentObj.username,
        password: selectedParentObj.password,
        schoolId: selectedParentObj.schoolId,
        branchId: selectedParentObj.branchId,
        isActive: selectedParentObj.isActive,
      },
      children: children.map((child) => ({
        childName: child.childName,
        className: child.className || "",
        section: child.section || "",
        DOB: child.DOB || "",
        age: child.age || undefined,
        gender: child.gender || "",
        routeObjId: child.routeObjId,
        pickupGeoId: child.pickupGeoId,
        dropGeoId: child.dropGeoId,
        schoolId: child.schoolId,
        branchId: child.branchId,
        parentId: selectedParent,
      })),
    };

    try {
      await addStudentMutation.mutateAsync(submissionData);
    } catch (err: any) {
      console.error("SUBMISSION FAILED:", err);
      console.error("Error details:", err.response?.data);
    }
  };

  const handleEditFieldChange = (key: string, value: any) => {
    if (key === "schoolId") {
      setEditSelectedSchool(value);
      setEditSelectedBranch("");
    } else if (key === "branchId") setEditSelectedBranch(value);
  };

  const handleExportPdf = () => {
    exportToPDF(students, EXPORT_COLUMNS, {
      title: "All Students Data",
      companyName: "Parents Eye",
      metadata: {
        Total: `${totalCount} students`,
        Search: isSearchActive ? "Filtered results" : "All students",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && {
          School:
            schoolOptions.find((s) => s.value === filters.school)?.label ||
            filters.school,
        }),
        ...(filters.branch && {
          Branch:
            filterBranchOptions.find((b) => b.value === filters.branch)
              ?.label || filters.branch,
        }),
        ...(filters.route && {
          Route:
            filterRouteOptions.find((r) => r.value === filters.route)?.label ||
            filters.route,
        }),
        ...(filters.pickupGeo && {
          "Pickup Location":
            filterPickupOptions.find((g) => g.value === filters.pickupGeo)
              ?.label || filters.pickupGeo,
        }),
        ...(filters.dropGeo && {
          "Drop Location":
            filterDropOptions.find((g) => g.value === filters.dropGeo)?.label ||
            filters.dropGeo,
        }),
        Role: role || "Unknown",
      },
    });
  };

  const handleExportExcel = () => {
    exportToExcel(students, EXPORT_COLUMNS, {
      title: "All Students Data",
      companyName: "Parents Eye",
      metadata: {
        Total: `${totalCount} students`,
        Search: isSearchActive ? "Filtered results" : "All students",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && {
          School:
            schoolOptions.find((s) => s.value === filters.school)?.label ||
            filters.school,
        }),
        ...(filters.branch && {
          Branch:
            filterBranchOptions.find((b) => b.value === filters.branch)
              ?.label || filters.branch,
        }),
        ...(filters.route && {
          Route:
            filterRouteOptions.find((r) => r.value === filters.route)?.label ||
            filters.route,
        }),
        ...(filters.pickupGeo && {
          "Pickup Location":
            filterPickupOptions.find((g) => g.value === filters.pickupGeo)
              ?.label || filters.pickupGeo,
        }),
        ...(filters.dropGeo && {
          "Drop Location":
            filterDropOptions.find((g) => g.value === filters.dropGeo)?.label ||
            filters.dropGeo,
        }),
        Role: role || "Unknown",
      },
    });
  };

  // Table columns
  const columns: ColumnDef<Student>[] = useMemo(
    () => [
      {
        id: "childName",
        header: "Student Name",
        accessorFn: (row) => row.childName ?? "N/A",
      },
      { id: "age", header: "Age", accessorFn: (row) => row.age ?? "N/A" },
      {
        id: "className",
        header: "Class",
        accessorFn: (row) => row.className ?? "N/A",
      },
      {
        id: "section",
        header: "Section",
        accessorFn: (row) => row.section ?? "N/A",
      },
      {
        id: "schoolName",
        header: "School",
        accessorFn: (row) => {
          if (row.schoolId && typeof row.schoolId === "object")
            return row.schoolId.schoolName ?? "N/A";
          // if it's an id, try to find from schools
          const s = Array.isArray(schools)
            ? schools.find((sc: any) => sc._id === row.schoolId)
            : null;
          return s ? s.schoolName : "N/A";
        },
      },
      {
        id: "branchName",
        header: "Branch",
        accessorFn: (row) => {
          if (row.branchId && typeof row.branchId === "object")
            return row.branchId.branchName ?? "N/A";
          const b = Array.isArray(branches)
            ? branches.find((br: any) => br._id === row.branchId)
            : null;
          return b ? b.branchName : "N/A";
        },
      },
      {
        id: "routeNumber",
        header: "Route Number",
        accessorFn: (row) => {
          if (row.routeObjId && typeof row.routeObjId === "object")
            return row.routeObjId.routeNumber || "N/A";
          const r = routes.find((rt: any) => rt._id === row.routeObjId);
          return r ? r.routeNumber || r.routeName || "N/A" : "N/A";
        },
      },
      {
        id: "parentName",
        header: "Parent Name",
        accessorFn: (row) =>
          row.parentId && typeof row.parentId === "object"
            ? row.parentId.parentName ?? "N/A"
            : "N/A",
      },
      {
        id: "mobileNo",
        header: "Contact no",
        accessorFn: (row) =>
          row.parentId && typeof row.parentId === "object"
            ? row.parentId.mobileNo ?? "N/A"
            : "N/A",
      },
      {
        id: "pickupLocation",
        header: "Pickup Location",
        accessorFn: (row) => {
          return findGeofenceName(row.pickupGeoId);
        },
      },
      {
        id: "dropLocation",
        header: "Drop Location",
        accessorFn: (row) => {
          return findGeofenceName(row.dropGeoId);
        },
      },
      {
        id: "username",
        header: "Username",
        accessorFn: (row) =>
          row.parentId && typeof row.parentId === "object"
            ? row.parentId.username ?? "N/A"
            : "N/A",
      },
      {
        id: "password",
        header: "Password",
        accessorFn: (row) =>
          row.parentId && typeof row.parentId === "object"
            ? row.parentId.password ?? "N/A"
            : "N/A",
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md"
              onClick={() => {
                setEditTarget(row.original);
                setEditDialogOpen(true);
              }}
            >
              Edit
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md"
              onClick={() => setDeleteTarget(row.original)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [geofences, schools, branches, routes]
  );

  const { table, tableElement } = CustomTableServerSidePagination({
    data: students,
    columns,
    pagination,
    totalCount,
    loading: studentsLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage:
      isSearchActive || isFilterActive
        ? "No students found matching your search/filter criteria"
        : "No students found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  const editData = editTarget
    ? {
        _id: editTarget._id,
        childName: editTarget.childName || "",
        age: editTarget.age || "",
        className: editTarget.className || "",
        section: editTarget.section || "",
        schoolId: getId(editTarget.schoolId),
        branchId: getId(editTarget.branchId),
        routeObjId: getId(editTarget.routeObjId),
        pickupGeoId: getId(editTarget.pickupGeoId),
        dropGeoId: getId(editTarget.dropGeoId),
      }
    : null;

  return (
    <>
      <header className="flex items-center gap-4 mb-4 justify-between">
        <section className="flex space-x-2 items-center">
          <div className="relative">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, class...."
              width="w-[230px]"
            />
          </div>

          <ColumnVisibilitySelector
            columns={table?.getAllColumns() || []}
            buttonVariant="outline"
          />

          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <div className="w-33">
                <Combobox
                  items={schoolOptions}
                  value={filters.school}
                  onValueChange={(v) => handleFilterChange("school", v)}
                  placeholder="Select School"
                  searchPlaceholder="Search schools..."
                  emptyMessage="No school found."
                  width="w-full"
                />
              </div>
            )}

            {!isBranchRole && (
              <div className="w-33">
                <Combobox
                  items={filterBranchOptions}
                  value={filters.branch}
                  onValueChange={(v) => handleFilterChange("branch", v)}
                  placeholder={
                    !isSchoolRole && isSuperAdmin && !filters.school
                      ? "Select School First"
                      : "Select Branch"
                  }
                  searchPlaceholder="Search branches..."
                  emptyMessage="No branch found."
                  width="w-full"
                  disabled={isSuperAdmin && !filters.school}
                />
              </div>
            )}

            <div className="w-32">
              <Combobox
                items={filterRouteOptions}
                value={filters.route}
                onValueChange={(v) => handleFilterChange("route", v)}
                placeholder={
                  isBranchRole
                    ? "Select Route"
                    : !filters.branch
                    ? "Select Branch First"
                    : "Select Route"
                }
                searchPlaceholder="Search routes..."
                emptyMessage="No route found."
                width="w-full"
                disabled={!isBranchRole && !filters.branch}
              />
            </div>

            <div className="w-37">
              <Combobox
                items={filterPickupOptions}
                value={filters.pickupGeo}
                onValueChange={(v) => handleFilterChange("pickupGeo", v)}
                placeholder={
                  !filters.route ? "Select Route First" : "Pickup Location"
                }
                searchPlaceholder="Search pickup locations..."
                emptyMessage={
                  !filters.route
                    ? "Please select a route first"
                    : "No pickup location found."
                }
                width="w-full"
                disabled={!filters.route}
              />
            </div>

            <div className="w-35">
              <Combobox
                items={filterDropOptions}
                value={filters.dropGeo}
                onValueChange={(v) => handleFilterChange("dropGeo", v)}
                placeholder={
                  !filters.route ? "Select Route First" : "Drop Location"
                }
                searchPlaceholder="Search drop locations..."
                emptyMessage={
                  !filters.route
                    ? "Please select a route first"
                    : "No drop location found."
                }
                width="w-full"
                disabled={!filters.route}
              />
            </div>
          </div>
        </section>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              className="flex items-center gap-2 cursor-pointer"
            >
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Add New Student
              </DialogTitle>
            </DialogHeader>

            {children.length > 0 && (
              <Card>
                <CardContent className="pt-2">
                  <div className="space-y-3">
                    {children.map((child, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center p-3 bg-card border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                            {i + 1}
                          </div>
                          <div>
                            <div className="font-medium">{child.childName}</div>
                            <div className="text-sm text-muted-foreground">
                              {child.className
                                ? `Class ${child.className}`
                                : "Class not specified"}
                              {child.section ? ` (${child.section})` : ""}
                              {child.age ? ` • Age ${child.age}` : ""}
                              {child.DOB ? ` • DOB: ${child.DOB}` : ""}
                              {child.pickupGeoId
                                ? ` • Pickup: ${findGeofenceName(
                                    child.pickupGeoId
                                  )}`
                                : ""}
                              {child.dropGeoId
                                ? ` • Drop: ${findGeofenceName(
                                    child.dropGeoId
                                  )}`
                                : ""}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveChild(i)}
                          className="text-destructive hover:text-destructive/80 p-1 rounded-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="childName">Student Name *</Label>
                  <Input
                    id="childName"
                    name="childName"
                    type="text"
                    required
                    value={childForm.childName}
                    onChange={(e) =>
                      handleChildFormChange("childName", e.target.value)
                    }
                  />
                </div>

                {isSuperAdmin && (
                  <div className="grid gap-2">
                    <Label>School *</Label>
                    <Combobox
                      items={schoolOptions}
                      value={selectedSchool}
                      onValueChange={(value) => {
                        setSelectedSchool(value);
                        setSelectedBranch("");
                        setSelectedRoute("");
                        setSelectedPickupGeo("");
                        setSelectedDropGeo("");
                      }}
                      placeholder="Select school..."
                      searchPlaceholder="Search schools..."
                      emptyMessage="No school found."
                      width="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(isSuperAdmin || isSchoolRole) && (
                  <div className="grid gap-2">
                    <Label>Branch *</Label>
                    <Combobox
                      items={branchOptions}
                      value={selectedBranch}
                      onValueChange={(value) => {
                        setSelectedBranch(value);
                        setSelectedRoute("");
                        setSelectedPickupGeo("");
                        setSelectedDropGeo("");
                      }}
                      placeholder={
                        isSchoolRole
                          ? "Select branch..."
                          : !selectedSchool
                          ? "Select school first"
                          : "Select branch..."
                      }
                      searchPlaceholder="Search branches..."
                      emptyMessage={
                        isSchoolRole && branchOptions.length === 0
                          ? "No branches found for your school"
                          : !selectedSchool
                          ? "Please select a school first"
                          : "No branches found for this school"
                      }
                      width="w-full"
                      disabled={isSuperAdmin && !selectedSchool}
                    />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Select Parent *</Label>
                  <div className="flex gap-2">
                    <Combobox
                      items={parentOptions}
                      value={selectedParent}
                      onValueChange={setSelectedParent}
                      placeholder={
                        isSuperAdmin && (!selectedSchool || !selectedBranch)
                          ? "Select school & branch first"
                          : isSchoolRole && !selectedBranch
                          ? "Select branch first"
                          : "Search parent..."
                      }
                      searchPlaceholder="Search parents..."
                      emptyMessage={
                        isSuperAdmin && (!selectedSchool || !selectedBranch)
                          ? "Please select school and branch first"
                          : isSchoolRole && !selectedBranch
                          ? "Please select branch first"
                          : "No parents found for this school and branch"
                      }
                      disabled={
                        (isSuperAdmin &&
                          (!selectedSchool || !selectedBranch)) ||
                        (isSchoolRole && !selectedBranch)
                      }
                      onSearchChange={(v) =>
                        setSearchStates((prev) => ({ ...prev, parent: v }))
                      }
                      searchValue={searchStates.parent}
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            onClick={() => setAddParentDialogOpen(true)}
                            className="bg-[#f3c623] hover:bg-[#D3A80C] text-[#e3d728] font-semibold h-10 px-4"
                            disabled={
                              (isSuperAdmin &&
                                (!selectedSchool || !selectedBranch)) ||
                              (isSchoolRole && !selectedBranch)
                            }
                          >
                            <Plus className="w-4 h-4 text-red-700" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black/80 text-white px-2 py-2 rounded-md shadow-md">
                          <p>Add Parent</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="3"
                    max="18"
                    value={childForm.age}
                    onChange={(e) =>
                      handleChildFormChange("age", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="className">Class</Label>
                  <Input
                    id="className"
                    name="className"
                    type="text"
                    value={childForm.className}
                    onChange={(e) =>
                      handleChildFormChange("className", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Input
                    id="section"
                    name="section"
                    type="text"
                    value={childForm.section}
                    onChange={(e) =>
                      handleChildFormChange("section", e.target.value)
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Combobox
                    items={GENDER_OPTIONS}
                    value={selectedGender}
                    onValueChange={setSelectedGender}
                    placeholder="Select gender..."
                    searchPlaceholder="Search gender..."
                    emptyMessage="No gender options found."
                    width="w-full"
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({ ...prev, gender: v }))
                    }
                    searchValue={searchStates.gender}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div className="grid gap-2">
                  <Label>Date of Birth (Optional)</Label>
                  <DatePicker
                    date={selectedDOB}
                    setDate={setSelectedDOB}
                    // onDateChange={setSelectedDOB}
                    disabled={false}
                  />
                </div> */}
                <div className="grid gap-2">
                  <Label>Route *</Label>
                  <Combobox
                    items={routeOptions}
                    value={selectedRoute}
                    onValueChange={(value) => {
                      setSelectedRoute(value);
                      // Clear pickup/drop when route changes
                      setSelectedPickupGeo("");
                      setSelectedDropGeo("");
                    }}
                    placeholder={
                      isBranchRole
                        ? "Select route..."
                        : !selectedBranch
                        ? "Select branch first"
                        : "Select route..."
                    }
                    searchPlaceholder="Search routes..."
                    emptyMessage={
                      isBranchRole
                        ? "No routes found for your branch"
                        : !selectedBranch
                        ? "Please select branch first"
                        : "No routes found for this branch"
                    }
                    width="w-full"
                    disabled={!isBranchRole && !selectedBranch}
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({ ...prev, route: v }))
                    }
                    searchValue={searchStates.route}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Pickup Location *</Label>
                  <Combobox
                    items={routePickupOptions}
                    value={selectedPickupGeo}
                    onValueChange={setSelectedPickupGeo}
                    placeholder={
                      !selectedRoute
                        ? "Select route first"
                        : "Select pickup location..."
                    }
                    searchPlaceholder="Search pickup locations..."
                    emptyMessage={
                      !selectedRoute
                        ? "Please select a route first"
                        : "No pickup locations found."
                    }
                    width="w-full"
                    disabled={!selectedRoute}
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({ ...prev, pickupGeo: v }))
                    }
                    searchValue={searchStates.pickupGeo}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Drop Location *</Label>
                  <Combobox
                    items={routeDropOptions}
                    value={selectedDropGeo}
                    onValueChange={setSelectedDropGeo}
                    placeholder={
                      !selectedRoute
                        ? "Select route first"
                        : "Select drop location..."
                    }
                    searchPlaceholder="Search drop locations..."
                    emptyMessage={
                      !selectedRoute
                        ? "Please select a route first"
                        : "No drop locations found."
                    }
                    width="w-full"
                    disabled={!selectedRoute}
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({ ...prev, dropGeo: v }))
                    }
                    searchValue={searchStates.dropGeo}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={handleAddChild}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={
                    !selectedParent ||
                    !selectedRoute ||
                    !selectedPickupGeo ||
                    !selectedDropGeo ||
                    !childForm.childName.trim()
                  }
                >
                  <Plus className="w-4 h-4" />
                  Add This Child
                </Button>
              </div>

              <DialogFooter className="flex justify-between pt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={handleFinalSubmit}
                  disabled={
                    children.length === 0 ||
                    addStudentMutation.isPending ||
                    !selectedParent
                  }
                  type="button"
                  className="flex items-center gap-2"
                >
                  {addStudentMutation.isPending
                    ? "Submitting..."
                    : `Submit ${
                        children.length > 0
                          ? `(${children.length} ${
                              children.length === 1 ? "Child" : "Children"
                            })`
                          : ""
                      }`}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">
            Active Filters:
          </span>
          {activeFilters.map((filter) => (
            <FilterBadge
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => clearFilter(filter.key)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-6 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            Clear All
          </Button>
        </div>
      )}

      <Dialog open={addParentDialogOpen} onOpenChange={setAddParentDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <form onSubmit={handleAddParentSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Parent</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PARENT_FORM_FIELDS.map(({ id, label, type, ...props }) => (
                <div key={id} className="grid gap-2">
                  <Label htmlFor={id}>{label} *</Label>
                  <Input id={id} name={id} type={type} required {...props} />
                </div>
              ))}

              {/* School selector in add parent - only show for super admin */}
              {isSuperAdmin && (
                <div className="grid gap-2">
                  <Label>School *</Label>
                  <Combobox
                    items={schoolOptions}
                    value={addParentSchool}
                    onValueChange={(v) => {
                      setAddParentSchool(v);
                      setAddParentBranch("");
                      setSearchStates((prev) => ({
                        ...prev,
                        addParentBranch: "",
                      }));
                    }}
                    placeholder="Search school..."
                    searchPlaceholder="Search schools..."
                    emptyMessage="No school found."
                    width="w-full"
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({
                        ...prev,
                        addParentSchool: v,
                      }))
                    }
                    searchValue={searchStates.addParentSchool}
                  />
                </div>
              )}

              {/* Branch selector in add parent - show for super admin and school role */}
              {(isSuperAdmin || isSchoolRole) && (
                <div className="grid gap-2">
                  <Label>Branch *</Label>
                  <Combobox
                    items={
                      isSuperAdmin ? addParentBranchOptions : branchOptions
                    }
                    value={addParentBranch}
                    onValueChange={setAddParentBranch}
                    placeholder={
                      isSuperAdmin && !addParentSchool
                        ? "Select school first"
                        : isSchoolRole
                        ? "Search branch..."
                        : "Search branch..."
                    }
                    searchPlaceholder="Search branches..."
                    emptyMessage={
                      isSuperAdmin && !addParentSchool
                        ? "Please select a school first"
                        : isSchoolRole && branchOptions.length === 0
                        ? "No branches found for your school"
                        : "No branches match your search"
                    }
                    width="w-full"
                    disabled={isSuperAdmin && !addParentSchool}
                    onSearchChange={(v) =>
                      setSearchStates((prev) => ({
                        ...prev,
                        addParentBranch: v,
                      }))
                    }
                    searchValue={searchStates.addParentBranch}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                className="h-5 w-5"
                defaultChecked
              />
              <Label htmlFor="isActive">Active Status</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button ref={addParentCloseRef} variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={addParentMutation.isPending}>
                {addParentMutation.isPending ? "Saving..." : "Save Parent"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <main>
        <section>{tableElement}</section>

        {deleteTarget && (
          <Alert<Student>
            title="Are you absolutely sure?"
            description={`This will permanently delete ${
              deleteTarget?.childName || "this student"
            } and all associated data.`}
            actionButton={(target) => deleteStudentMutation.mutate(target._id)}
            target={deleteTarget}
            setTarget={setDeleteTarget}
            butttonText="Delete"
            className="sm:max-w-[425px]"
          />
        )}

        {editTarget && editData && (
          <DynamicEditDialog
            data={editData}
            isOpen={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEditTarget(null);
              setEditSelectedSchool("");
              setEditSelectedBranch("");
            }}
            onSave={handleSave}
            onFieldChange={handleEditFieldChange}
            fields={EDIT_FIELDS.map((f) => {
              if (f.key === "schoolId")
                return {
                  ...f,
                  options: schoolOptions,
                  disabled: isSchoolRole || isBranchRole,
                };
              if (f.key === "branchId")
                return {
                  ...f,
                  options: editFilteredBranches.map((b) => ({
                    label: b.branchName || `Branch ${b._id}`,
                    value: b._id,
                  })),
                  disabled: !editSelectedSchool || isBranchRole,
                };
              if (f.key === "routeObjId")
                return {
                  ...f,
                  options: editFilteredRoutes.map((r) => ({
                    label: r.routeNumber || `Route ${r.routeName || r._id}`,
                    value: r._id,
                  })),
                  disabled: !editSelectedBranch,
                };
              if (f.key === "pickupGeoId" || f.key === "dropGeoId")
                return {
                  ...f,
                  options: geofenceOptions,
                  disabled: false, // Allow selection without route dependency
                };
              return f;
            })}
            title="Edit Student"
            description="Update the student information below."
            loading={updateStudentMutation.isPending}
          />
        )}

        <FloatingMenu
          onExportPdf={handleExportPdf}
          onExportExcel={handleExportExcel}
        />
      </main>
    </>
  );
}
