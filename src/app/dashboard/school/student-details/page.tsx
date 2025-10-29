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
import { useGeofences } from "@/hooks/useGeofence";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Alert } from "@/components/Alert";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, User, Users, Plus, X, Calendar, Filter, XCircle } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/ui/datePicker";

// ==================== CONSTANTS ====================
const EDIT_FIELDS: FieldConfig[] = [
  { key: "childName", label: "Student Name", type: "text", required: true },
  { key: "age", label: "Age", type: "number", required: true },
  { key: "className", label: "Class", type: "text", required: true },
  { key: "section", label: "Section", type: "text", required: true },
  { key: "schoolId", label: "School", type: "select", required: true },
  { key: "branchId", label: "Branch", type: "select", required: true },
  { key: "routeObjId", label: "Route", type: "select", required: true },
  { key: "pickupGeoId", label: "Pickup Location", type: "select", required: true },
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

const CHILD_FORM_FIELDS = [
  { id: "childName", label: "Student Name", type: "text", required: true },
  { id: "age", label: "Age", type: "number", min: "3", max: "18" },
  { id: "className", label: "Class", type: "text" },
  { id: "section", label: "Section", type: "text" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" }
];

const PARENT_FORM_FIELDS = [
  { id: "parentName", label: "Parent Name", type: "text" },
  { id: "mobileNo", label: "Mobile No", type: "tel", pattern: "[0-9]{10}", maxLength: 10 },
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
const FilterBadge = ({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) => (
  <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200">
    <span className="text-xs">{label}: {value}</span>
    <button onClick={onRemove} className="ml-1 rounded-full hover:bg-blue-200 p-0.5" type="button">
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
  
  // Search states - simplified approach
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addParentDialogOpen, setAddParentDialogOpen] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [selectedPickupGeo, setSelectedPickupGeo] = useState("");
  const [selectedDropGeo, setSelectedDropGeo] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedDOB, setSelectedDOB] = useState<Date | undefined>(undefined);
  const [editSelectedSchool, setEditSelectedSchool] = useState("");
  const [editSelectedBranch, setEditSelectedBranch] = useState("");
  const [searchStates, setSearchStates] = useState({ 
    parent: "", school: "", branch: "", route: "", pickupGeo: "", dropGeo: "", gender: "", addParentSchool: "", addParentBranch: ""
  });

  // Filter states - hierarchical
  const [filters, setFilters] = useState({
    school: "", branch: "", route: "", pickupGeo: "", dropGeo: ""
  });

  // Add Parent form states
  const [addParentSchool, setAddParentSchool] = useState("");
  const [addParentBranch, setAddParentBranch] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  // Data fetching
  const { data: schools = [] } = useQuery<School[]>({ queryKey: ["schools"], queryFn: () => api.get<School[]>("/school") });
  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ["branches"], queryFn: () => api.get<Branch[]>("/branch") });
  const { data: routesData } = useQuery({ queryKey: ["routes"], queryFn: () => api.get<Route[]>("/route"), staleTime: 5 * 60 * 1000 });
  const { data: geofencesData } = useGeofences({ pagination, sorting });
  const { data: parentsData } = useQuery({ queryKey: ["parents"], queryFn: () => api.get<any[]>("/parent") });
  
  // Prepare filter object for useStudents hook
  const studentFilters = useMemo(() => ({
    ...(debouncedSearchTerm && { search: debouncedSearchTerm.trim() }),
    ...(filters.school && { schoolId: filters.school }),
    ...(filters.branch && { branchId: filters.branch }),
    ...(filters.route && { routeId: filters.route }),
    ...(filters.pickupGeo && { pickupGeoId: filters.pickupGeo }),
    ...(filters.dropGeo && { dropGeoId: filters.dropGeo }),
  }), [debouncedSearchTerm, filters]);

  const { data: studentsData, isLoading: studentsLoading, isFetching } = useStudents({
    pagination, sorting, filters: studentFilters,
  });

  // Data extraction
  const routes = extractData(routesData, ["data", "routes"]);
  const geofences = extractData(geofencesData, ["data"]);
  const students = extractData(studentsData, ["data", "children", "students"]);
  const parents = extractData(parentsData, ["data", "parents"]);
  const totalCount = studentsData?.total ?? studentsData?.totalCount ?? studentsData?.pagination?.total ?? students.length;

  // Memoized options
  const schoolOptions = useMemo(() => schools.map(s => ({ label: s.schoolName, value: s._id })), [schools]);
  const geofenceOptions = useMemo(() => geofences.map(g => ({ label: g.geofenceName, value: g._id })), [geofences]);
  const parentOptions = useMemo(() => parents.map(p => ({ label: p.parentName, value: p._id })), [parents]);
  
  const branchOptions = useMemo(() => {
    if (!selectedSchool) return [];
    return branches.filter(b => getId(b.schoolId) === selectedSchool).map(b => ({ label: b.branchName, value: b._id }));
  }, [branches, selectedSchool]);

  const routeOptions = useMemo(() => {
    if (!selectedBranch) return [];
    return routes.filter(r => getId(r.branchId) === selectedBranch).map(r => ({ label: r.routeNumber || `Route ${r.routeName || r._id}`, value: r._id }));
  }, [routes, selectedBranch]);

  const addParentBranchOptions = useMemo(() => {
    if (!addParentSchool) return [];
    return branches.filter(b => getId(b.schoolId) === addParentSchool).map(b => ({ label: b.branchName, value: b._id }));
  }, [branches, addParentSchool]);

  const editFilteredBranches = useMemo(() => 
    editSelectedSchool ? branches.filter(b => getId(b.schoolId) === editSelectedSchool) : [], 
    [editSelectedSchool, branches]
  );

  const editFilteredRoutes = useMemo(() => 
    editSelectedBranch ? routes.filter(r => getId(r.branchId) === editSelectedBranch) : [], 
    [editSelectedBranch, routes]
  );

  // Hierarchical filter options - ALL items shown, but filtered when parent is selected
  const filterBranchOptions = useMemo(() => {
    // If school is selected, show only branches of that school
    if (filters.school) {
      return branches.filter(b => getId(b.schoolId) === filters.school).map(b => ({ label: b.branchName, value: b._id }));
    }
    // If no school selected, show ALL branches
    return branches.map(b => ({ label: b.branchName, value: b._id }));
  }, [branches, filters.school]);

  // Hierarchical filter options - routes filtered by branch ONLY if branch is selected
  const filterRouteOptions = useMemo(() => {
    // If branch is selected, show only routes of that branch
    if (filters.branch) {
      return routes.filter(r => getId(r.branchId) === filters.branch).map(r => ({ label: r.routeNumber || `Route ${r.routeName || r._id}`, value: r._id }));
    }
    // If no branch selected, show ALL routes
    return routes.map(r => ({ label: r.routeNumber || `Route ${r.routeName || r._id}`, value: r._id }));
  }, [routes, filters.branch]);

  // Hierarchical filter options - pickup/drop locations filtered by route ONLY if route is selected
  const filterPickupOptions = useMemo(() => {
    // If route is selected, show only pickup locations of that route
    if (filters.route) {
      const selectedRouteData = routes.find(r => r._id === filters.route);
      if (selectedRouteData && selectedRouteData.pickupIds && selectedRouteData.pickupIds.length > 0) {
        const pickupIdSet = new Set(selectedRouteData.pickupIds.map(p => getId(p)));
        return geofenceOptions.filter(g => pickupIdSet.has(g.value));
      }
    }
    // If no route selected, show ALL pickup locations
    return geofenceOptions;
  }, [geofenceOptions, routes, filters.route]);

  const filterDropOptions = useMemo(() => {
    // If route is selected, show only drop locations of that route
    if (filters.route) {
      const selectedRouteData = routes.find(r => r._id === filters.route);
      if (selectedRouteData && selectedRouteData.dropIds && selectedRouteData.dropIds.length > 0) {
        const dropIdSet = new Set(selectedRouteData.dropIds.map(d => getId(d)));
        return geofenceOptions.filter(g => dropIdSet.has(g.value));
      }
    }
    // If no route selected, show ALL drop locations
    return geofenceOptions;
  }, [geofenceOptions, routes, filters.route]);

  // Get selected parent's school and branch
  const selectedParentData = useMemo(() => parents.find(p => p._id === selectedParent), [selectedParent, parents]);

  // Get display labels for active filters
  const activeFilters = useMemo(() => {
    const active = [];
    if (filters.school) {
      const school = schoolOptions.find(s => s.value === filters.school);
      active.push({ key: 'school', label: 'School', value: school?.label || filters.school });
    }
    if (filters.branch) {
      const branch = filterBranchOptions.find(b => b.value === filters.branch);
      active.push({ key: 'branch', label: 'Branch', value: branch?.label || filters.branch });
    }
    if (filters.route) {
      const route = filterRouteOptions.find(r => r.value === filters.route);
      active.push({ key: 'route', label: 'Route', value: route?.label || filters.route });
    }
    if (filters.pickupGeo) {
      const pickup = geofenceOptions.find(g => g.value === filters.pickupGeo);
      active.push({ key: 'pickup', label: 'Pickup', value: pickup?.label || filters.pickupGeo });
    }
    if (filters.dropGeo) {
      const drop = geofenceOptions.find(g => g.value === filters.dropGeo);
      active.push({ key: 'drop', label: 'Drop', value: drop?.label || filters.dropGeo });
    }
    return active;
  }, [filters, schoolOptions, filterBranchOptions, filterRouteOptions, geofenceOptions]);

  // Effects for debouncing search
  useEffect(() => {
    const handler = setTimeout(() => { 
      setDebouncedSearchTerm(searchTerm); 
      setPagination(p => ({ ...p, pageIndex: 0 })); 
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }));
  }, [filters.school, filters.branch, filters.route, filters.pickupGeo, filters.dropGeo]);

  useEffect(() => {
    if (editTarget) {
      setEditSelectedSchool(getId(editTarget.schoolId));
      setEditSelectedBranch(getId(editTarget.branchId));
    } else {
      setEditSelectedSchool("");
      setEditSelectedBranch("");
    }
  }, [editTarget]);

  // Reset form states when dialogs close
  useEffect(() => {
    if (!addDialogOpen) {
      setChildren([]);
      setSelectedParent("");
      setSelectedSchool(""); 
      setSelectedBranch(""); 
      setSelectedRoute(""); 
      setSelectedPickupGeo(""); 
      setSelectedDropGeo(""); 
      setSelectedGender(""); 
      setSelectedDOB(undefined);
      setSearchStates(prev => ({ ...prev, parent: "", school: "", branch: "", route: "", pickupGeo: "", dropGeo: "", gender: "" }));
    }
  }, [addDialogOpen]);

  useEffect(() => {
    if (!addParentDialogOpen) {
      setAddParentSchool("");
      setAddParentBranch("");
      setSearchStates(prev => ({ ...prev, addParentSchool: "", addParentBranch: "" }));
    }
  }, [addParentDialogOpen]);

  // Update school and branch when parent is selected
  useEffect(() => {
    if (selectedParentData) {
      setSelectedSchool(getId(selectedParentData.schoolId));
      setSelectedBranch(getId(selectedParentData.branchId));
    } else {
      setSelectedSchool("");
      setSelectedBranch("");
      setSelectedRoute("");
    }
  }, [selectedParentData]);

  // Filter functions with hierarchical cascade
  const clearFilters = () => setFilters({ school: "", branch: "", route: "", pickupGeo: "", dropGeo: "" });
  
  const clearFilter = (filterKey: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      
      // Hierarchical clearing - when clearing a parent, clear its children
      if (filterKey === 'school') {
        newFilters.school = "";
        newFilters.branch = "";
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === 'branch') {
        newFilters.branch = "";
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === 'route') {
        newFilters.route = "";
        newFilters.pickupGeo = "";
        newFilters.dropGeo = "";
      } else if (filterKey === 'pickup') {
        newFilters.pickupGeo = "";
      } else if (filterKey === 'drop') {
        newFilters.dropGeo = "";
      }
      
      return newFilters;
    });
  };

  // Hierarchical filter handlers
  const handleSchoolFilterChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      school: value,
      branch: "",
      route: "",
      pickupGeo: "",
      dropGeo: ""
    }));
  };

  const handleBranchFilterChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      branch: value,
      route: "",
      pickupGeo: "",
      dropGeo: ""
    }));
  };

  const handleRouteFilterChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      route: value,
      pickupGeo: "",
      dropGeo: ""
    }));
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
    onError: (err: any) => alert(`Failed to add parent.\nError: ${err.message}`),
  });

  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => api.post("/child", newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setAddDialogOpen(false);
      alert("Student(s) added successfully.");
    },
    onError: (err: any) => alert(`Failed to add student.\nError: ${err.message}`),
  });

  const updateStudentMutation = useMutation({
    mutationFn: ({ studentId, data }: { studentId: string; data: Partial<Student> }) => api.put(`/child/${studentId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setEditDialogOpen(false);
      setEditTarget(null);
      setEditSelectedSchool("");
      setEditSelectedBranch("");
      alert("Student updated successfully.");
    },
    onError: (err: Error) => alert(`Failed to update student.\nError: ${err.message}`),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => api.mulDelete("/child", { ids: [id] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      setDeleteTarget(null);
      alert("Student deleted successfully.");
    },
    onError: (err: any) => alert(`Failed to delete student.\nError: ${err.message}`),
  });

  // Handlers
  const handleSave = (updatedData: Partial<Student>) => {
    if (!editTarget) return;
    const changedFields: Partial<Record<keyof Student, unknown>> = {};
    const dataToCompare = { ...updatedData };
    if (dataToCompare.routeObjId) { 
      (dataToCompare as any).routeId = dataToCompare.routeObjId; 
      delete dataToCompare.routeObjId; 
    }
    for (const key in dataToCompare) {
      const newValue = dataToCompare[key as keyof Student];
      const oldValue = editTarget[key as keyof Student];
      if (newValue !== undefined && newValue !== oldValue) changedFields[key as keyof Student] = newValue;
    }
    if (Object.keys(changedFields).length === 0) return;
    updateStudentMutation.mutate({ studentId: editTarget._id, data: changedFields });
  };

  const handleAddParentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;
    
    if (!addParentSchool) { alert("Please select a school."); return; }
    if (!addParentBranch) { alert("Please select a branch."); return; }

    const data = {
      parentName: form.parentName.value.trim(),
      mobileNo: form.mobileNo.value.trim(),
      email: form.email.value.trim(),
      username: form.username.value.trim(),
      password: form.password.value,
      schoolId: addParentSchool,
      branchId: addParentBranch,
      isActive: form.isActive?.checked ?? true,
    };

    try {
      await addParentMutation.mutateAsync(data);
      form.reset();
    } catch (err) {
      console.error("Failed to add parent:", err);
    }
  };

  const handleAddChild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;
    
    if (!selectedParent) { alert("Please select a parent."); return; }
    if (!selectedRoute) { alert("Please select a route."); return; }
    if (!selectedPickupGeo) { alert("Please select a pickup location."); return; }
    if (!selectedDropGeo) { alert("Please select a drop location."); return; }
    
    const newChild = {
      childName: form.childName.value.trim(), 
      className: form.className?.value?.trim() || "", 
      section: form.section?.value?.trim() || "",
      DOB: selectedDOB ? format(selectedDOB, "yyyy-MM-dd") : "", 
      age: form.age?.value ? parseInt(form.age.value) : undefined,
      gender: selectedGender || "", 
      routeId: selectedRoute, 
      pickupGeoId: selectedPickupGeo, 
      dropGeoId: selectedDropGeo,
    };
    
    setChildren([...children, newChild]);
    form.childName.value = ""; 
    form.className.value = ""; 
    form.section.value = ""; 
    form.age.value = "";
    setSelectedGender(""); 
    setSelectedPickupGeo(""); 
    setSelectedDropGeo(""); 
    setSelectedDOB(undefined);
    setSearchStates(prev => ({ ...prev, gender: "", pickupGeo: "", dropGeo: "" }));
    alert(`Child "${newChild.childName}" added! You can add more siblings or submit.`);
  };

  const handleRemoveChild = (index: number) => setChildren(children.filter((_, i) => i !== index));

  const handleFinalSubmit = async () => {
    if (!selectedParent) { alert("Please select a parent."); return; }
    if (children.length === 0) { alert("Please add at least one child before submitting."); return; }
    
    for (const child of children) {
      if (!child.childName || !child.routeId || !child.pickupGeoId || !child.dropGeoId) {
        alert("Please ensure all children have Student Name, Route, Pickup Location, and Drop Location filled.");
        return;
      }
    }
    
    const data = { 
      parentId: selectedParent,
      children: children.map(c => ({ ...c, routeObjId: c.routeId, routeId: c.routeId })) 
    };
    
    try { 
      await addStudentMutation.mutateAsync(data); 
    } catch (err) { 
      console.error("SUBMISSION FAILED:", err); 
    }
  };

  const handleEditFieldChange = (key: string, value: any) => {
    if (key === "schoolId") { setEditSelectedSchool(value); setEditSelectedBranch(""); }
    else if (key === "branchId") setEditSelectedBranch(value);
  };

  const handleExportPdf = () => {
    exportToPDF(students, EXPORT_COLUMNS, {
      title: "All Students Data", companyName: "Parents Eye", 
      metadata: { 
        Total: `${totalCount} students`, 
        Search: isSearchActive ? "Filtered results" : "All students",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && { "School": schoolOptions.find(s => s.value === filters.school)?.label || filters.school }),
        ...(filters.branch && { "Branch": filterBranchOptions.find(b => b.value === filters.branch)?.label || filters.branch }),
        ...(filters.route && { "Route": filterRouteOptions.find(r => r.value === filters.route)?.label || filters.route }),
        ...(filters.pickupGeo && { "Pickup Location": geofenceOptions.find(g => g.value === filters.pickupGeo)?.label || filters.pickupGeo }),
        ...(filters.dropGeo && { "Drop Location": geofenceOptions.find(g => g.value === filters.dropGeo)?.label || filters.dropGeo }),
      },
    });
  };

  const handleExportExcel = () => {
    exportToExcel(students, EXPORT_COLUMNS, {
      title: "All Students Data", companyName: "Parents Eye", 
      metadata: { 
        Total: `${totalCount} students`, 
        Search: isSearchActive ? "Filtered results" : "All students",
        ...(searchTerm && { "Search Term": `"${searchTerm}"` }),
        ...(filters.school && { "School": schoolOptions.find(s => s.value === filters.school)?.label || filters.school }),
        ...(filters.branch && { "Branch": filterBranchOptions.find(b => b.value === filters.branch)?.label || filters.branch }),
        ...(filters.route && { "Route": filterRouteOptions.find(r => r.value === filters.route)?.label || filters.route }),
        ...(filters.pickupGeo && { "Pickup Location": geofenceOptions.find(g => g.value === filters.pickupGeo)?.label || filters.pickupGeo }),
        ...(filters.dropGeo && { "Drop Location": geofenceOptions.find(g => g.value === filters.dropGeo)?.label || filters.dropGeo }),
      },
    });
  };

  // Table columns
  const columns: ColumnDef<Student>[] = useMemo(() => [
    { id: "childName", header: "Student Name", accessorFn: (row) => row.childName ?? "N/A" },
    { id: "age", header: "Age", accessorFn: (row) => row.age ?? "N/A" },
    { id: "className", header: "Class", accessorFn: (row) => row.className ?? "N/A" },
    { id: "section", header: "Section", accessorFn: (row) => row.section ?? "N/A" },
    { id: "schoolName", header: "School", accessorFn: (row) => row.schoolId && typeof row.schoolId === "object" ? row.schoolId.schoolName ?? "N/A" : "N/A" },
    { id: "branchName", header: "Branch", accessorFn: (row) => row.branchId && typeof row.branchId === "object" ? row.branchId.branchName ?? "N/A" : "N/A" },
    { id: "routeNumber", header: "Route Number", accessorFn: (row) => {
      if (row.routeObjId && typeof row.routeObjId === "object") return row.routeObjId.routeNumber || "N/A";
      if (row.routeId && typeof row.routeId === "object") return row.routeId.routeNumber || "N/A";
      return "N/A";
    }},
    { id: "parentName", header: "Parent Name", accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.parentName ?? "N/A" : "N/A" },
    { id: "mobileNo", header: "Contact no", accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.mobileNo ?? "N/A" : "N/A" },
    { id: "pickupLocation", header: "Pickup Location", accessorFn: (row) => row.pickupGeoId && typeof row.pickupGeoId === "object" ? row.pickupGeoId.geofenceName ?? "N/A" : "N/A" },
    { id: "dropLocation", header: "Drop Location", accessorFn: (row) => row.dropGeoId && typeof row.dropGeoId === "object" ? row.dropGeoId.geofenceName ?? "N/A" : "N/A" },
    { id: "username", header: "Username", accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.username ?? "N/A" : "N/A" },
    { id: "password", header: "Password", accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.password ?? "N/A" : "N/A" },
    {
      id: "action", header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <button className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md"
            onClick={() => { setEditTarget(row.original); setEditDialogOpen(true); }}>Edit</button>
          <button className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md"
            onClick={() => setDeleteTarget(row.original)}>Delete</button>
        </div>
      ),
    },
  ], []);

  const { table, tableElement } = CustomTableServerSidePagination({
    data: students, columns, pagination, totalCount, loading: studentsLoading || isFetching, 
    onPaginationChange: setPagination, onSortingChange: setSorting, sorting, columnVisibility, 
    onColumnVisibilityChange: setColumnVisibility, 
    emptyMessage: isSearchActive || isFilterActive ? "No students found matching your search/filter criteria" : "No students found",
    pageSizeOptions: [5, 10, 20, 30, 50], enableSorting: true, showSerialNumber: true,
  });

  const editData = editTarget ? {
    _id: editTarget._id, childName: editTarget.childName || "", age: editTarget.age || "",
    className: editTarget.className || "", section: editTarget.section || "", 
    schoolId: getId(editTarget.schoolId), branchId: getId(editTarget.branchId), 
    routeObjId: getId(editTarget.routeObjId || editTarget.routeId), 
    pickupGeoId: getId(editTarget.pickupGeoId), dropGeoId: getId(editTarget.dropGeoId),
  } : null;

  return (
    <>
      <header className="flex items-center gap-4 mb-4 justify-between">
        <section className="flex space-x-2 items-center">
          <div className="relative">
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by student name, class, section, age..."
              width="w-[240px]"
            />
          </div>
          
          <ColumnVisibilitySelector columns={table?.getAllColumns() || []} buttonVariant="outline" />

          <div className="flex items-center gap-2">
            {[
              { 
                items: schoolOptions, 
                value: filters.school, 
                onChange: handleSchoolFilterChange, 
                placeholder: "Select School", 
                width: "w-33" 
              },
              { 
                items: filterBranchOptions, 
                value: filters.branch, 
                onChange: handleBranchFilterChange, 
                placeholder: filters.school ? "Select Branch" : "Select School First", 
                width: "w-33",
                disabled: !filters.school 
              },
              { 
                items: filterRouteOptions, 
                value: filters.route, 
                onChange: handleRouteFilterChange, 
                placeholder: filters.branch ? "Select Route" : "Select Branch First", 
                width: "w-32",
                disabled: !filters.branch 
              },
              { 
                items: filterPickupOptions, 
                value: filters.pickupGeo, 
                onChange: (v: string) => setFilters(prev => ({ ...prev, pickupGeo: v })), 
                placeholder: filters.route ? "Pickup Location" : "Select Route First", 
                width: "w-37",
                disabled: !filters.route 
              },
              { 
                items: filterDropOptions, 
                value: filters.dropGeo, 
                onChange: (v: string) => setFilters(prev => ({ ...prev, dropGeo: v })), 
                placeholder: filters.route ? "Drop Location" : "Select Route First", 
                width: "w-35",
                disabled: !filters.route 
              },
            ].map((filter, index) => (
              <div key={index} className={filter.width}>
                <Combobox 
                  items={filter.items} 
                  value={filter.value} 
                  onValueChange={filter.onChange}
                  placeholder={filter.placeholder}
                  searchPlaceholder={`Search ${filter.placeholder.toLowerCase()}...`}
                  emptyMessage={`No ${filter.placeholder.toLowerCase()} found.`}
                  width="w-full"
                  disabled={filter.disabled}
                />
              </div>
            ))}
          </div>
        </section>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">Add Student</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Add New Student</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="childName">Student Name *</Label>
                  <Input id="childName" name="childName" type="text" required />
                </div>

                <div className="grid gap-2">
                  <Label>Select Parent *</Label>
                  <div className="flex gap-2">
                    <Combobox 
                      items={parentOptions} 
                      value={selectedParent} 
                      onValueChange={setSelectedParent}
                      placeholder="Search parent..." 
                      searchPlaceholder="Search parents..." 
                      emptyMessage="No parent found."
                      onSearchChange={(v) => setSearchStates(prev => ({ ...prev, parent: v }))} 
                      searchValue={searchStates.parent} 
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" onClick={() => setAddParentDialogOpen(true)} className="bg-[#f3c623] hover:bg-[#D3A80C] text-[#e3d728] font-semibold h-10 px-4">
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

              {[
                [
                  { id: "age", label: "Age", type: "number", props: { min: "3", max: "18" } },
                  { id: "className", label: "Class", type: "text" }
                ],
                [
                  { id: "section", label: "Section", type: "text" },
                  { component: "gender", label: "Gender", items: GENDER_OPTIONS, value: selectedGender, onChange: setSelectedGender, searchKey: "gender" }
                ],
                [
                  { component: "dob", label: "Date of Birth", value: selectedDOB, onChange: setSelectedDOB },
                  { component: "route", label: "Route *", items: routeOptions, value: selectedRoute, onChange: setSelectedRoute, disabled: !selectedBranch, searchKey: "route" }
                ],
                [
                  { component: "pickup", label: "Pickup Location *", items: geofenceOptions, value: selectedPickupGeo, onChange: setSelectedPickupGeo, searchKey: "pickupGeo" },
                  { component: "drop", label: "Drop Location *", items: geofenceOptions, value: selectedDropGeo, onChange: setSelectedDropGeo, searchKey: "dropGeo" }
                ]
              ].map((row, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {row.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="grid gap-2">
                      <Label>{field.label}</Label>
                      {field.component === "gender" || field.component === "route" || field.component === "pickup" || field.component === "drop" ? (
                        <Combobox 
                          items={field.items!} 
                          value={field.value} 
                          onValueChange={field.onChange!}
                          placeholder={field.component === "route" && !selectedBranch ? "Select a parent/branch first" : `Search ${field.label.toLowerCase()}...`}
                          searchPlaceholder={`Search ${field.label.toLowerCase()}...`}
                          emptyMessage={field.component === "route" && !selectedBranch ? "Select a parent/branch first." : field.items!.length === 0 ? `No ${field.label.toLowerCase()} found.` : "No items match your search."}
                          width="w-full" 
                          disabled={field.disabled}
                          onSearchChange={(v) => setSearchStates(prev => ({ ...prev, [field.searchKey!]: v }))} 
                          searchValue={searchStates[field.searchKey as keyof typeof searchStates]} 
                        />
                      ) : field.component === "dob" ? (
                        <DatePicker 
                          date={field.value} 
                          onDateChange={field.onChange!} 
                          placeholder="Select date of birth"
                          disabled={false}
                        />
                      ) : (
                        <Input id={field.id} name={field.id} type={field.type} {...field.props} />
                      )}
                    </div>
                  ))}
                </div>
              ))}

              {children.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {children.map((child, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-medium">{child.childName}</div>
                              <div className="text-sm text-muted-foreground">
                                {child.className ? `Class ${child.className}` : "Class not specified"}
                                {child.section ? ` (${child.section})` : ""}
                                {child.age ? ` • Age ${child.age}` : ""}
                              </div>
                            </div>
                          </div>
                          <button type="button" onClick={() => handleRemoveChild(i)} className="text-destructive hover:text-destructive/80 p-1 rounded-sm">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={handleAddChild} variant="outline" className="flex items-center gap-2" disabled={!selectedParent}>
                  <Plus className="w-4 h-4" />Add This Child
                </Button>
              </div>

              <DialogFooter className="flex justify-between pt-4">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleFinalSubmit} disabled={children.length === 0 || addStudentMutation.isPending || !selectedParent} type="button" className="flex items-center gap-2">
                  {addStudentMutation.isPending ? "Submitting..." : `Submit ${children.length > 0 ? `(${children.length} ${children.length === 1 ? "Child" : "Children"})` : ""}`}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Active Filters:</span>
          {activeFilters.map((filter) => (
            <FilterBadge key={filter.key} label={filter.label} value={filter.value} onRemove={() => clearFilter(filter.key)} />
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-red-600 hover:text-red-800 hover:bg-red-50">
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
              <div className="grid gap-2">
                <Label>School *</Label>
                <Combobox 
                  items={schoolOptions} 
                  value={addParentSchool} 
                  onValueChange={(v) => { setAddParentSchool(v); setAddParentBranch(""); setSearchStates(prev => ({ ...prev, addParentBranch: "" })); }}
                  placeholder="Search school..." 
                  searchPlaceholder="Search schools..." 
                  emptyMessage="No school found."
                  width="w-full" 
                  onSearchChange={(v) => setSearchStates(prev => ({ ...prev, addParentSchool: v }))} 
                  searchValue={searchStates.addParentSchool} 
                />
              </div>
              <div className="grid gap-2">
                <Label>Branch *</Label>
                <Combobox 
                  items={addParentBranchOptions} 
                  value={addParentBranch} 
                  onValueChange={setAddParentBranch}
                  placeholder={!addParentSchool ? "Select school first" : "Search branch..."}
                  searchPlaceholder="Search branches..." 
                  emptyMessage={!addParentSchool ? "Please select a school first" : addParentBranchOptions.length === 0 ? "No branches found for this school" : "No branches match your search"}
                  width="w-full" 
                  disabled={!addParentSchool}
                  onSearchChange={(v) => setSearchStates(prev => ({ ...prev, addParentBranch: v }))} 
                  searchValue={searchStates.addParentBranch} 
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <input type="checkbox" id="isActive" name="isActive" className="h-5 w-5" defaultChecked />
              <Label htmlFor="isActive">Active Status</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button ref={addParentCloseRef} variant="outline">Cancel</Button>
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
            description={`This will permanently delete ${deleteTarget?.childName || "this student"} and all associated data.`}
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
            onClose={() => { setEditDialogOpen(false); setEditTarget(null); setEditSelectedSchool(""); setEditSelectedBranch(""); }}
            onSave={handleSave} 
            onFieldChange={handleEditFieldChange} 
            fields={EDIT_FIELDS.map(f => {
              if (f.key === "schoolId") return { ...f, options: schoolOptions };
              if (f.key === "branchId") return { 
                ...f, 
                options: editFilteredBranches.map(b => ({ label: b.branchName || `Branch ${b._id}`, value: b._id })), 
                disabled: !editSelectedSchool 
              };
              if (f.key === "routeObjId") return { 
                ...f, 
                options: editFilteredRoutes.map(r => ({ label: r.routeNumber || `Route ${r.routeName || r._id}`, value: r._id })), 
                disabled: !editSelectedBranch 
              };
              if (f.key === "pickupGeoId" || f.key === "dropGeoId") return { ...f, options: geofenceOptions };
              return f;
            })} 
            title="Edit Student" 
            description="Update the student information below." 
            loading={updateStudentMutation.isPending} 
          />
        )}

        <FloatingMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} />
      </main>
    </>
  );
}