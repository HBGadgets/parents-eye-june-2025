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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, User, Users, Plus, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

// Constants
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

// Interfaces
interface ChildFormData {
  childName: string;
  className?: string;
  section?: string;
  DOB?: string;
  age?: number;
  gender?: string;
  routeId: string;
  pickupGeoId: string;
  dropGeoId: string;
}

// Helper functions
const getSchoolId = (student: Student): string => 
  !student.schoolId ? "" : typeof student.schoolId === "object" ? student.schoolId?._id || "" : student.schoolId || "";

const getBranchId = (student: Student): string => 
  !student.branchId ? "" : typeof student.branchId === "object" ? student.branchId?._id || "" : student.branchId || "";

const getRouteId = (student: Student): string => {
  if (student.routeObjId) {
    return typeof student.routeObjId === "object" ? student.routeObjId?._id || "" : student.routeObjId || "";
  }
  if (student.routeId) {
    return typeof student.routeId === "object" ? student.routeId?._id || "" : student.routeId || "";
  }
  return "";
};

const getGeofenceId = (geoField: any): string => 
  !geoField ? "" : typeof geoField === "object" ? geoField?._id || "" : geoField || "";

// Step Indicator Component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center mb-6">
    {Array.from({ length: totalSteps }).map((_, index) => (
      <React.Fragment key={index}>
        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
          index + 1 === currentStep ? "bg-primary border-primary text-primary-foreground" :
          index + 1 < currentStep ? "bg-green-500 border-green-500 text-white" :
          "border-muted-foreground/30 text-muted-foreground/50"
        }`}>
          {index + 1 < currentStep ? "✓" : index + 1}
        </div>
        {index < totalSteps - 1 && (
          <div className={`w-12 h-1 ${index + 1 < currentStep ? "bg-green-500" : "bg-muted-foreground/30"}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

export default function StudentDetails() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // State management
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: false }]);
  const [studentName, setStudentName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [debouncedStudentName, setDebouncedStudentName] = useState(studentName);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Form states
  const [parentData, setParentData] = useState({
    parentName: "", mobileNo: "", username: "", email: "", password: "", schoolId: "", branchId: ""
  });
  const [children, setChildren] = useState<ChildFormData[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  const [editSelectedSchool, setEditSelectedSchool] = useState("");
  const [editSelectedBranch, setEditSelectedBranch] = useState("");
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  // Data fetching
  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["schools"], 
    queryFn: () => api.get<School[]>("/school")
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["branches"], 
    queryFn: () => api.get<Branch[]>("/branch")
  });

  // Route data fetching - FIXED: Using standard useQuery without custom hook
  const { data: routesData, isLoading: routesLoading } = useQuery({
    queryKey: ["routes"],
    queryFn: () => api.get<Route[]>("/route"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: geofencesData, isLoading: geofencesLoading } = useGeofences({ pagination, sorting });
  
  // FIXED: Proper route data handling
  const routes: Route[] = Array.isArray(routesData) ? routesData : 
                         Array.isArray(routesData?.data) ? routesData.data : 
                         Array.isArray(routesData?.routes) ? routesData.routes : [];

  const geofences: Geofence[] = Array.isArray(geofencesData) ? geofencesData : 
    Array.isArray(geofencesData?.data) ? geofencesData.data : [];

  // Memoized options
  const schoolOptions = useMemo(() => 
    schools.map(school => ({ label: school.schoolName, value: school._id })), [schools]);

  const branchOptions = useMemo(() => {
    if (!selectedSchool) return [];
    return branches
      .filter(branch => {
        const branchSchoolId = branch.schoolId ? 
          (typeof branch.schoolId === "object" ? branch.schoolId?._id : branch.schoolId) : null;
        return branchSchoolId === selectedSchool;
      })
      .map(branch => ({ label: branch.branchName, value: branch._id }));
  }, [branches, selectedSchool]);

  // FIXED: Route options filtering
  const routeOptions = useMemo(() => {
    console.log("Route Options Debug:", {
      selectedBranch,
      routesCount: routes.length,
      routes: routes.map(r => ({ 
        id: r._id, 
        branchId: r.branchId, 
        routeNumber: r.routeNumber,
        branchIdType: typeof r.branchId,
        branchIdValue: typeof r.branchId === "object" ? r.branchId?._id : r.branchId
      }))
    });

    if (!selectedBranch) return [];
    
    const filteredRoutes = routes.filter(route => {
      if (!route.branchId) return false;
      
      const routeBranchId = typeof route.branchId === "object" ? 
        route.branchId?._id : 
        route.branchId;
      
      return routeBranchId === selectedBranch;
    });

    console.log("Filtered Routes:", filteredRoutes);

    return filteredRoutes.map(route => ({ 
      label: route.routeNumber || `Route ${route.routeName || route._id}`, 
      value: route._id 
    }));
  }, [routes, selectedBranch]);

  const geofenceOptions = useMemo(() => 
    geofences.map(geo => ({ label: geo.geofenceName, value: geo._id })), [geofences]);

  // Edit filtered data
  const editFilteredBranches = useMemo(() => {
    if (!editSelectedSchool) return branches;
    return branches.filter(branch => {
      const branchSchoolId = branch.schoolId ? 
        (typeof branch.schoolId === "object" ? branch.schoolId?._id : branch.schoolId) : null;
      return branchSchoolId === editSelectedSchool;
    });
  }, [editSelectedSchool, branches]);

  const editFilteredRoutes = useMemo(() => {
    if (!editSelectedBranch) return routes;
    return routes.filter(route => {
      const routeBranchId = route.branchId ? 
        (typeof route.branchId === "object" ? route.branchId?._id : route.branchId) : null;
      return routeBranchId === editSelectedBranch;
    });
  }, [editSelectedBranch, routes]);

  // Effects
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStudentName(studentName), 500);
    return () => clearTimeout(handler);
  }, [studentName]);

  useEffect(() => {
    if (editTarget) {
      const schoolId = getSchoolId(editTarget);
      const branchId = getBranchId(editTarget);
      setEditSelectedSchool(schoolId);
      setEditSelectedBranch(branchId);
    } else {
      setEditSelectedSchool("");
      setEditSelectedBranch("");
    }
  }, [editTarget]);

  useEffect(() => {
    if (!addDialogOpen) {
      setCurrentStep(1);
      setParentData({ parentName: "", mobileNo: "", username: "", email: "", password: "", schoolId: "", branchId: "" });
      setChildren([]);
      setSelectedSchool("");
      setSelectedBranch("");
      setSelectedRoute("");
      setSchoolSearch("");
      setBranchSearch("");
      setRouteSearch("");
    }
  }, [addDialogOpen]);

  // Student data fetching
  const { data: studentsData, isLoading, isFetching } = useStudents({
    pagination, sorting, childName: debouncedStudentName
  });

  // Mutations
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
    mutationFn: ({ studentId, data }: { studentId: string; data: Partial<Student> }) => 
      api.put(`/child/${studentId}`, data),
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

  // Event handlers
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
      if (newValue !== undefined && newValue !== oldValue) {
        changedFields[key as keyof Student] = newValue;
      }
    }

    if (Object.keys(changedFields).length === 0) return;
    updateStudentMutation.mutate({ studentId: editTarget._id, data: changedFields });
  };

  const handleParentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;

    if (!selectedSchool) { alert("Please select a school."); return; }
    if (!selectedBranch) { alert("Please select a branch."); return; }

    setParentData({
      parentName: form.parentName.value.trim(),
      mobileNo: form.mobileNo.value.trim(),
      username: form.username.value.trim(),
      email: form.email.value.trim(),
      password: form.password.value,
      schoolId: selectedSchool,
      branchId: selectedBranch,
    });
    setCurrentStep(2);
  };

  const handleAddChild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;

    if (!selectedRoute) { 
      alert("Please select a route."); 
      return; 
    }

    const newChild: ChildFormData = {
      childName: form.childName.value.trim(),
      className: form.className?.value?.trim() || "",
      section: form.section?.value?.trim() || "",
      DOB: form.DOB?.value || "",
      age: form.age?.value ? parseInt(form.age.value) : undefined,
      gender: form.gender?.value || "",
      routeId: selectedRoute,
      pickupGeoId: form.pickupGeoId.value,
      dropGeoId: form.dropGeoId.value,
    };

    setChildren([...children, newChild]);
    
    // Reset form but keep the route selection
    form.childName.value = "";
    form.className.value = "";
    form.section.value = "";
    form.DOB.value = "";
    form.age.value = "";
    form.gender.value = "";
    form.pickupGeoId.value = "";
    form.dropGeoId.value = "";

    alert(`Child "${newChild.childName}" added! You can add more siblings or submit.`);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    if (children.length === 0) {
      alert("Please add at least one child before submitting.");
      return;
    }
    
    // Validate all children have required fields
    for (const child of children) {
      if (!child.childName || !child.routeId || !child.pickupGeoId || !child.dropGeoId) {
        alert("Please ensure all children have Student Name, Route, Pickup Location, and Drop Location filled.");
        return;
      }
    }

    const data = { 
      parent: parentData, 
      children: children 
    };

    try { 
      await addStudentMutation.mutateAsync(data); 
    } catch (err) { 
      console.error("SUBMISSION FAILED:", err); 
    }
  };

  const handleEditFieldChange = (key: string, value: any) => {
    if (key === "schoolId") { 
      setEditSelectedSchool(value); 
      setEditSelectedBranch(""); 
    } else if (key === "branchId") { 
      setEditSelectedBranch(value); 
    }
  };

  // Table configuration
  const columns: ColumnDef<Student>[] = [
    { id: "childName", header: "Student Name", accessorFn: (row) => row.childName ?? "N/A" },
    { id: "age", header: "Age", accessorFn: (row) => row.age ?? "N/A" },
    { id: "className", header: "Class", accessorFn: (row) => row.className ?? "N/A" },
    { id: "section", header: "Section", accessorFn: (row) => row.section ?? "N/A" },
    { 
      id: "schoolName", header: "School", 
      accessorFn: (row) => row.schoolId && typeof row.schoolId === "object" ? row.schoolId.schoolName ?? "N/A" : "N/A" 
    },
    { 
      id: "branchName", header: "Branch", 
      accessorFn: (row) => row.branchId && typeof row.branchId === "object" ? row.branchId.branchName ?? "N/A" : "N/A" 
    },
    {
      id: "routeNumber", header: "Route Number",
      accessorFn: (row) => {
        if (row.routeObjId && typeof row.routeObjId === "object") return row.routeObjId.routeNumber || "N/A";
        if (row.routeId && typeof row.routeId === "object") return row.routeId.routeNumber || "N/A";
        return "N/A";
      }
    },
    { 
      id: "parentName", header: "Parent Name", 
      accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.parentName ?? "N/A" : "N/A" 
    },
    { 
      id: "mobileNo", header: "Contact no", 
      accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.mobileNo ?? "N/A" : "N/A" 
    },
    { 
      id: "pickupLocation", header: "Pickup Location", 
      accessorFn: (row) => row.pickupGeoId && typeof row.pickupGeoId === "object" ? row.pickupGeoId.geofenceName ?? "N/A" : "N/A" 
    },
    { 
      id: "dropLocation", header: "Drop Location", 
      accessorFn: (row) => row.dropGeoId && typeof row.dropGeoId === "object" ? row.dropGeoId.geofenceName ?? "N/A" : "N/A" 
    },
    { 
      id: "username", header: "Username", 
      accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.username ?? "N/A" : "N/A" 
    },
    { 
      id: "password", header: "Password", 
      accessorFn: (row) => row.parentId && typeof row.parentId === "object" ? row.parentId.password ?? "N/A" : "N/A" 
    },
    {
      id: "action", header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-1 px-3 rounded-md"
            onClick={() => { setEditTarget(row.original); setEditDialogOpen(true); }}
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
  ];

  const { table, tableElement } = CustomTableServerSidePagination({
    data: studentsData?.children || [], 
    columns, 
    pagination, 
    totalCount: studentsData?.total || 0,
    loading: isLoading || isFetching, 
    onPaginationChange: setPagination, 
    onSortingChange: setSorting,
    sorting, 
    columnVisibility, 
    onColumnVisibilityChange: setColumnVisibility, 
    emptyMessage: "No students found",
    pageSizeOptions: [5, 10, 20, 30, 50], 
    enableSorting: true, 
    showSerialNumber: true,
  });

  const editData = editTarget ? {
    _id: editTarget._id, 
    childName: editTarget.childName || "", 
    age: editTarget.age || "",
    className: editTarget.className || "", 
    section: editTarget.section || "", 
    schoolId: getSchoolId(editTarget),
    branchId: getBranchId(editTarget), 
    routeObjId: getRouteId(editTarget), 
    pickupGeoId: getGeofenceId(editTarget.pickupGeoId), 
    dropGeoId: getGeofenceId(editTarget.dropGeoId),
  } : null;

  // Form field configurations
  const parentFormFields = [
    { id: "parentName", label: "Parent Name", type: "text" },
    { id: "mobileNo", label: "Mobile No", type: "tel", pattern: "[0-9]{10}", maxLength: 10 },
    { id: "username", label: "Username", type: "text" },
    { id: "email", label: "Email", type: "email" },
    { id: "password", label: "Password", type: "text" },
  ];

  const childFormFields = [
    { id: "childName", label: "Student Name", type: "text", required: true },
    { id: "age", label: "Age", type: "number", min: "3", max: "18" },
    { id: "className", label: "Class", type: "text" },
    { id: "section", label: "Section", type: "text" },
    { id: "DOB", label: "Date of Birth", type: "date" },
  ];

  return (
    <>
      <header className="flex items-center gap-4 mb-4 justify-between">
        <section className="flex space-x-4">
          <div className="h-9">
            <SearchBar 
              value={studentName} 
              onChange={setStudentName} 
              placeholder="Search by student name..." 
              width="w-[300px]" 
            />
          </div>
          <ColumnVisibilitySelector 
            columns={table?.getAllColumns() || []} 
            buttonVariant="outline" 
          />
        </section>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Add New Student
              </DialogTitle>
            </DialogHeader>

            <StepIndicator currentStep={currentStep} totalSteps={2} />

            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1 text-lg">
                    <User className="w-5 h-5" />Parent Information
                  </CardTitle>
                  <CardDescription>Enter the parent's details to create a new account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleParentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {parentFormFields.map(({ id, label, type, ...props }) => (
                        <div key={id} className="grid gap-2">
                          <Label htmlFor={id}>{label} *</Label>
                          <Input id={id} name={id} type={type} required {...props} />
                        </div>
                      ))}
                      <div className="grid gap-2">
                        <Label htmlFor="schoolId">School *</Label>
                        <Combobox 
                          items={schoolOptions} 
                          value={selectedSchool} 
                          onValueChange={(value) => {
                            setSelectedSchool(value); 
                            setSelectedBranch(""); 
                            setSelectedRoute("");
                            setBranchSearch("");
                          }} 
                          placeholder="Search school..." 
                          searchPlaceholder="Search schools..." 
                          emptyMessage="No school found."
                          width="w-full" 
                          onSearchChange={setSchoolSearch} 
                          searchValue={schoolSearch} 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="branchId">Branch *</Label>
                        <Combobox 
                          items={branchOptions} 
                          value={selectedBranch} 
                          onValueChange={(value) => {
                            setSelectedBranch(value);
                            setSelectedRoute("");
                          }}
                          placeholder="Search branch..." 
                          searchPlaceholder="Search branches..." 
                          emptyMessage={!selectedSchool ? "Select a school first." : "No branch found for this school."}
                          width="w-full" 
                          disabled={!selectedSchool} 
                          onSearchChange={setBranchSearch} 
                          searchValue={branchSearch} 
                        />
                      </div>
                    </div>
                    <DialogFooter className="pt-4">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" className="flex items-center gap-2">
                        Continue to Children
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </DialogFooter>
                  </form>
                </CardContent>
              </Card>
            )}

            {currentStep === 2 && (
              <div className="space-y-2">
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>Parent Details</span>
                      <Badge variant="secondary" className="ml-2">{parentData.parentName}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-sm">
                      <div>
                        <span className="text-muted-foreground">Mobile:</span>
                        <div className="font-medium">{parentData.mobileNo}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <div className="font-medium">{parentData.email}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Username:</span>
                        <div className="font-medium">{parentData.username}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {children.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />Added Children ({children.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {children.map((child, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                                {index + 1}
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
                            <button 
                              type="button" 
                              onClick={() => handleRemoveChild(index)} 
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

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plus className="w-5 h-5" />Add Child/Sibling
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddChild} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {childFormFields.map(({ id, label, type, required, ...props }) => (
                          <div key={id} className="grid gap-2">
                            <Label htmlFor={id}>{label} {required && "*"}</Label>
                            <Input id={id} name={id} type={type} required={required} {...props} />
                          </div>
                        ))}
                        <div className="grid gap-2">
                          <Label htmlFor="gender">Gender</Label>
                          <select 
                            id="gender" 
                            name="gender" 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">Select Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="routeId">Route *</Label>
                          <Combobox 
                            items={routeOptions} 
                            value={selectedRoute} 
                            onValueChange={setSelectedRoute}
                            placeholder="Search route..." 
                            searchPlaceholder="Search routes..."
                            emptyMessage={
                              !selectedBranch 
                                ? "Select a branch first." 
                                : routeOptions.length === 0 
                                ? "No routes found for this branch." 
                                : "No routes match your search."
                            }
                            width="w-full" 
                            disabled={!selectedBranch || routesLoading}
                            onSearchChange={setRouteSearch} 
                            searchValue={routeSearch} 
                          />
                          {routesLoading && (
                            <p className="text-sm text-muted-foreground">Loading routes...</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="pickupGeoId">Pickup Location *</Label>
                          <select 
                            id="pickupGeoId" 
                            name="pickupGeoId" 
                            required 
                            disabled={geofencesLoading}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">Select Pickup Location</option>
                            {geofences.map(geo => (
                              <option key={geo._id} value={geo._id}>{geo.geofenceName}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dropGeoId">Drop Location *</Label>
                          <select 
                            id="dropGeoId" 
                            name="dropGeoId" 
                            required 
                            disabled={geofencesLoading}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          >
                            <option value="">Select Drop Location</option>
                            {geofences.map(geo => (
                              <option key={geo._id} value={geo._id}>{geo.geofenceName}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" variant="outline" className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />Add This Child
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <DialogFooter className="flex justify-between pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)} 
                    type="button" 
                    className="flex items-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Parent Details
                  </Button>
                  <div className="flex gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      onClick={handleFinalSubmit} 
                      disabled={children.length === 0 || addStudentMutation.isPending} 
                      type="button" 
                      className="flex items-center gap-2"
                    >
                      {addStudentMutation.isPending ? "Submitting..." : `Submit ${children.length > 0 ? `(${children.length} ${children.length === 1 ? "Child" : "Children"})` : ""}`}
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </header>

      <main>
        <section>{tableElement}</section>
        <section>
          {deleteTarget && (
            <Alert<Student> 
              title="Are you absolutely sure?" 
              description={`This will permanently delete ${deleteTarget?.childName || "this student"} and all associated data.`}
              actionButton={(target) => deleteStudentMutation.mutate(target._id)} 
              target={deleteTarget} 
              setTarget={setDeleteTarget} 
              butttonText="Delete" 
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
              fields={EDIT_FIELDS.map(f => {
                if (f.key === "schoolId") return { ...f, options: schoolOptions };
                if (f.key === "branchId") return { 
                  ...f, 
                  options: editFilteredBranches.map(b => ({ 
                    label: b.branchName || `Branch ${b._id}`, 
                    value: b._id 
                  })), 
                  disabled: false 
                };
                if (f.key === "routeObjId") return { 
                  ...f, 
                  options: editFilteredRoutes.map(r => ({ 
                    label: r.routeNumber || `Route ${r.routeName || r._id}`, 
                    value: r._id 
                  })), 
                  disabled: !editSelectedBranch 
                };
                if (f.key === "pickupGeoId" || f.key === "dropGeoId") return { 
                  ...f, 
                  options: geofenceOptions 
                };
                return f;
              })} 
              title="Edit Student" 
              description="Update the student information below." 
              loading={updateStudentMutation.isPending} 
            />
          )}
        </section>

        <FloatingMenu
          onExportPdf={() => exportToPDF(studentsData?.children || [], EXPORT_COLUMNS, {
            title: "All Students Data", 
            companyName: "Parents Eye", 
            metadata: { Total: `${studentsData?.children?.length || 0} students` },
          })}
          onExportExcel={() => exportToExcel(studentsData?.children || [], EXPORT_COLUMNS, {
            title: "All Students Data", 
            companyName: "Parents Eye", 
            metadata: { Total: `${studentsData?.children?.length || 0} students` },
          })}
        />
      </main>
    </>
  );
}