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
import { useRouteData } from "@/hooks/useRouteData";
import { useGeofences } from "@/hooks/useGeofence";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, User, Users, Plus, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

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

// Child form data interface
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

// Safe accessor functions
const getSchoolId = (student: Student): string => {
  if (!student.schoolId) return "";
  return typeof student.schoolId === 'object' ? student.schoolId?._id || "" : student.schoolId || "";
};

const getBranchId = (student: Student): string => {
  if (!student.branchId) return "";
  return typeof student.branchId === 'object' ? student.branchId?._id || "" : student.branchId || "";
};

const getRouteId = (student: Student): string => {
  if (student.routeObjId) {
    return typeof student.routeObjId === 'object' ? student.routeObjId?._id || "" : student.routeObjId || "";
  }
  if (student.routeId) {
    return typeof student.routeId === 'object' ? student.routeId?._id || "" : student.routeId || "";
  }
  return "";
};

const getGeofenceId = (geoField: any): string => {
  if (!geoField) return "";
  return typeof geoField === 'object' ? geoField?._id || "" : geoField || "";
};

// Step Indicator Component
const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center justify-center mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <React.Fragment key={index}>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index + 1 === currentStep
                ? "bg-primary border-primary text-primary-foreground"
                : index + 1 < currentStep
                ? "bg-green-500 border-green-500 text-white"
                : "border-muted-foreground/30 text-muted-foreground/50"
            }`}
          >
            {index + 1 < currentStep ? "✓" : index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={`w-12 h-1 ${
                index + 1 < currentStep ? "bg-green-500" : "bg-muted-foreground/30"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function StudentDetails() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: false }]);
  const [studentName, setStudentName] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [debouncedStudentName, setDebouncedStudentName] = useState(studentName);
  
  // Two-step form state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [parentData, setParentData] = useState({
    parentName: "",
    mobileNo: "",
    username: "",
    email: "",
    password: "",
    schoolId: "",
    branchId: "",
  });
  const [children, setChildren] = useState<ChildFormData[]>([]);
  
  // Add form state for cascading dropdowns
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");
  
  // Edit form state for cascading dropdowns
  const [editSelectedSchool, setEditSelectedSchool] = useState("");
  const [editSelectedBranch, setEditSelectedBranch] = useState("");
  
  // Search states for combobox
  const [schoolSearch, setSchoolSearch] = useState("");
  const [branchSearch, setBranchSearch] = useState("");
  const [routeSearch, setRouteSearch] = useState("");
  
  const { exportToPDF, exportToExcel } = useExport();

  // Fetch schools, branches, routes
  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => api.get<School[]>("/school"),
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branch"),
  });

  const { data: routesData, isLoading: routesLoading } = useRouteData();
  const routes: Route[] = Array.isArray(routesData) ? routesData : routesData?.data || [];

  // Fetch geofences
  const {
    data: geofencesData,
    isLoading: geofencesLoading,
  } = useGeofences({ pagination, sorting });

  const geofences: Geofence[] = Array.isArray(geofencesData)
    ? geofencesData
    : Array.isArray(geofencesData?.data)
    ? geofencesData.data
    : [];

  // Prepare data for combobox
  const schoolOptions = useMemo(() => {
    return schools.map(school => ({
      label: school.schoolName,
      value: school._id,
    }));
  }, [schools]);

  const branchOptions = useMemo(() => {
    if (!selectedSchool) return [];
    return branches
      .filter(branch => {
        const branchSchoolId = branch.schoolId 
          ? (typeof branch.schoolId === 'object' ? branch.schoolId?._id : branch.schoolId)
          : null;
        return branchSchoolId === selectedSchool;
      })
      .map(branch => ({
        label: branch.branchName,
        value: branch._id,
      }));
  }, [branches, selectedSchool]);

  const routeOptions = useMemo(() => {
    if (!selectedBranch) return [];
    return routes
      .filter(route => {
        const routeBranchId = route.branchId 
          ? (typeof route.branchId === 'object' ? route.branchId?._id : route.branchId)
          : null;
        return routeBranchId === selectedBranch;
      })
      .map(route => ({
        label: route.routeNumber || `Route ${route.routeName || route._id}`,
        value: route._id,
      }));
  }, [routes, selectedBranch]);

  const geofenceOptions = useMemo(() => {
    return geofences.map(geo => ({
      label: geo.geofenceName,
      value: geo._id,
    }));
  }, [geofences]);

  // Filter branches for edit dialog 
  const editFilteredBranches = useMemo(() => {
    if (!editSelectedSchool) {
      return branches;
    }
    
    const filtered = branches.filter(branch => {
      if (!branch.schoolId) return false;
      
      const branchSchoolId = typeof branch.schoolId === 'object' 
        ? branch.schoolId?._id 
        : branch.schoolId;
      
      return branchSchoolId === editSelectedSchool;
    });
    
    return filtered;
  }, [editSelectedSchool, branches]);

  // Filter routes for edit dialog
  const editFilteredRoutes = useMemo(() => {
    if (!editSelectedBranch) return routes;
    return routes.filter(route => {
      const routeBranchId = route.branchId 
        ? (typeof route.branchId === 'object' ? route.branchId?._id : route.branchId)
        : null;
      return routeBranchId === editSelectedBranch;
    });
  }, [editSelectedBranch, routes]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStudentName(studentName), 500);
    return () => clearTimeout(handler);
  }, [studentName]);

  const { data: studentsData, isLoading, isFetching } = useStudents({
    pagination,
    sorting,
    childName: debouncedStudentName,
  });

  // Set edit form initial values when edit target changes
  useEffect(() => {
    if (editTarget) {
      const schoolId = getSchoolId(editTarget);
      const branchId = getBranchId(editTarget);
      
      setEditSelectedSchool(schoolId);
      setEditSelectedBranch(branchId);
      
      setTimeout(() => {
        console.log("Edit form state after set:", { 
          editSelectedSchool: schoolId, 
          editSelectedBranch: branchId 
        });
      }, 0);
    } else {
      setEditSelectedSchool("");
      setEditSelectedBranch(""); // Fixed: using correct setter function
    }
  }, [editTarget]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!addDialogOpen) {
      setCurrentStep(1);
      setParentData({
        parentName: "",
        mobileNo: "",
        username: "",
        email: "",
        password: "",
        schoolId: "",
        branchId: "",
      });
      setChildren([]);
      setSelectedSchool("");
      setSelectedBranch("");
      setSelectedRoute("");
      setSchoolSearch("");
      setBranchSearch("");
      setRouteSearch("");
    }
  }, [addDialogOpen]);

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => api.post("/child", newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
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
      setDeleteTarget(null);
      alert("Student deleted successfully.");
    },
    onError: (err: any) => alert(`Failed to delete student.\nError: ${err.message}`),
  });

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

  // Handle Step 1: Parent Details
  const handleParentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;

    // Validate required selections
    if (!selectedSchool) {
      alert("Please select a school.");
      return;
    }
    if (!selectedBranch) {
      alert("Please select a branch.");
      return;
    }

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

  // Handle adding a child
  const handleAddChild = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as any;

    // Validate required selections
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

  // Handle removing a child
  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  // Final submission
  const handleFinalSubmit = async () => {
    if (children.length === 0) {
      alert("Please add at least one child before submitting.");
      return;
    }

    const data = {
      parent: parentData,
      children: children,
    };

    try {
      await addStudentMutation.mutateAsync(data);
    } catch (err) {
      console.error("SUBMISSION FAILED:", err);
    }
  };

  // Table columns with safe accessors
  const columns: ColumnDef<Student>[] = [
    { 
      id: "childName", 
      header: "Student Name", 
      accessorFn: (row) => row.childName ?? "N/A" 
    },
    { 
      id: "age", 
      header: "Age", 
      accessorFn: (row) => row.age ?? "N/A" 
    },
    { 
      id: "className", 
      header: "Class", 
      accessorFn: (row) => row.className ?? "N/A" 
    },
    { 
      id: "section", 
      header: "Section", 
      accessorFn: (row) => row.section ?? "N/A" 
    },
    { 
      id: "schoolName", 
      header: "School", 
      accessorFn: (row) => row.schoolId && typeof row.schoolId === 'object' 
        ? row.schoolId.schoolName ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "branchName", 
      header: "Branch", 
      accessorFn: (row) => row.branchId && typeof row.branchId === 'object' 
        ? row.branchId.branchName ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "routeNumber", 
      header: "Route Number", 
      accessorFn: (row) => {
        if (row.routeObjId && typeof row.routeObjId === 'object') {
          return row.routeObjId.routeNumber || "N/A";
        }
        if (row.routeId && typeof row.routeId === 'object') {
          return row.routeId.routeNumber || "N/A";
        }
        return "N/A";
      }
    },
    { 
      id: "parentName", 
      header: "Parent Name", 
      accessorFn: (row) => row.parentId && typeof row.parentId === 'object' 
        ? row.parentId.parentName ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "mobileNo", 
      header: "Contact no", 
      accessorFn: (row) => row.parentId && typeof row.parentId === 'object' 
        ? row.parentId.mobileNo ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "pickupLocation", 
      header: "Pickup Location", 
      accessorFn: (row) => row.pickupGeoId && typeof row.pickupGeoId === 'object' 
        ? row.pickupGeoId.geofenceName ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "dropLocation", 
      header: "Drop Location", 
      accessorFn: (row) => row.dropGeoId && typeof row.dropGeoId === 'object' 
        ? row.dropGeoId.geofenceName ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "username", 
      header: "Username", 
      accessorFn: (row) => row.parentId && typeof row.parentId === 'object' 
        ? row.parentId.username ?? "N/A" 
        : "N/A" 
    },
    { 
      id: "password", 
      header: "Password", 
      accessorFn: (row) => row.parentId && typeof row.parentId === 'object' 
        ? row.parentId.password ?? "N/A" 
        : "N/A" 
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

  // Prepare data for edit modal with cascading dropdown support
  const editData = editTarget
    ? {
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
      }
    : null;

  // Custom field change handler for edit dialog
  const handleEditFieldChange = (key: string, value: any) => {
    if (key === "schoolId") {
      setEditSelectedSchool(value);
      setEditSelectedBranch("");
    } else if (key === "branchId") {
      setEditSelectedBranch(value);
    }
  };

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
          <ColumnVisibilitySelector columns={table?.getAllColumns() || []} buttonVariant="outline" />
        </section>

        {/* Add Student Dialog - Two Step Process */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Add New Student
              </DialogTitle>
            </DialogHeader>

            {/* Step Indicator */}
            <StepIndicator currentStep={currentStep} totalSteps={2} />

            {/* Step 1: Parent Details */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1 text-lg">
                    <User className="w-5 h-5" />
                    Parent Information
                  </CardTitle>
                  <CardDescription>
                    Enter the parent's details to create a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleParentSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[ 
                        { id: "parentName", label: "Parent Name", type: "text" },
                        { id: "mobileNo", label: "Mobile No", type: "tel", pattern: "[0-9]{10}", maxLength: 10 },
                        { id: "username", label: "Username", type: "text" },
                        { id: "email", label: "Email", type: "email" },
                        { id: "password", label: "Password", type: "text" },
                      ].map(({ id, label, type, ...props }) => (
                        <div key={id} className="grid gap-2">
                          <Label htmlFor={id}>{label} *</Label>
                          <Input id={id} name={id} type={type} required {...props} />
                        </div>
                      ))}

                      {/* School - Using Combobox */}
                      <div className="grid gap-2">
                        <Label htmlFor="schoolId">School *</Label>
                        <Combobox
                          items={schoolOptions}
                          value={selectedSchool}
                          onValueChange={(value) => {
                            setSelectedSchool(value);
                            setSelectedBranch("");
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

                      {/* Branch - Using Combobox */}
                      <div className="grid gap-2">
                        <Label htmlFor="branchId">Branch *</Label>
                        <Combobox
                          items={branchOptions}
                          value={selectedBranch}
                          onValueChange={setSelectedBranch}
                          placeholder="Search branch..."
                          searchPlaceholder="Search branches..."
                          emptyMessage={
                            !selectedSchool
                              ? "Select a school first."
                              : "No branch found for this school."
                          }
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

            {/* Step 2: Add Children */}
            {currentStep === 2 && (
              <div className="space-y-6">
                {/* Parent Summary Card */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <span>Parent Summary</span>
                      <Badge variant="secondary" className="ml-2">
                        {parentData.parentName}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
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

                {/* List of added children */}
                {children.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Added Children ({children.length})
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
                                  {child.className ? `Class ${child.className}` : 'Class not specified'} 
                                  {child.section ? ` (${child.section})` : ''} 
                                  {child.age ? ` • Age ${child.age}` : ''}
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

                {/* Add child form */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Plus className="w-5 h-5" />
                      Add Child/Sibling
                    </CardTitle>
                    <CardDescription>
                      Fill in the child's details. Only Student Name, Route, and Locations are required.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddChild} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Required fields */}
                        {[ 
                          { id: "childName", label: "Student Name", type: "text", required: true },
                        ].map(({ id, label, type, required, ...props }) => (
                          <div key={id} className="grid gap-2">
                            <Label htmlFor={id}>{label} {required && '*'}</Label>
                            <Input id={id} name={id} type={type} required={required} {...props} />
                          </div>
                        ))}

                        {/* Optional fields */}
                        {[ 
                          { id: "age", label: "Age", type: "number", min: "3", max: "18" },
                          { id: "className", label: "Class", type: "text" },
                          { id: "section", label: "Section", type: "text" },
                          { id: "DOB", label: "Date of Birth", type: "date" },
                        ].map(({ id, label, type, ...props }) => (
                          <div key={id} className="grid gap-2">
                            <Label htmlFor={id}>{label}</Label>
                            <Input id={id} name={id} type={type} {...props} />
                          </div>
                        ))}

                        {/* Gender - Optional */}
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

                        {/* Required fields */}
                        {/* Route - Using Combobox */}
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
                                : "No routes found for this branch."
                            }
                            width="w-full"
                            disabled={!selectedBranch}
                            onSearchChange={setRouteSearch}
                            searchValue={routeSearch}
                          />
                        </div>

                        {/* Pickup Location */}
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
                            {geofences.map((geo) => (
                              <option key={geo._id} value={geo._id}>{geo.geofenceName}</option>
                            ))}
                          </select>
                        </div>

                        {/* Drop Location */}
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
                            {geofences.map((geo) => (
                              <option key={geo._id} value={geo._id}>{geo.geofenceName}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button type="submit" variant="outline" className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add This Child
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Footer buttons */}
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
                      {addStudentMutation.isPending ? (
                        "Submitting..."
                      ) : (
                        <>
                          Submit {children.length > 0 && `(${children.length} ${children.length === 1 ? 'Child' : 'Children'})`}
                        </>
                      )}
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
              description={`This will permanently delete ${deleteTarget?.childName || 'this student'} and all associated data.`}
              actionButton={(target) => deleteStudentMutation.mutate(target._id)}
              target={deleteTarget}
              setTarget={setDeleteTarget}
              butttonText="Delete"
            />
          )}

          {/* Edit Dialog with cascading dropdowns */}
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
                if (f.key === "schoolId") {
                  return { 
                    ...f, 
                    options: schools.map(s => ({ label: s.schoolName, value: s._id })) 
                  };
                }
                if (f.key === "branchId") {
                  const branchOptions = editFilteredBranches.length > 0 
                    ? editFilteredBranches 
                    : branches;
                  
                  return { 
                    ...f, 
                    options: branchOptions.map(b => ({ 
                      label: b.branchName || `Branch ${b._id}`, 
                      value: b._id 
                    })),
                    disabled: false
                  };
                }
                if (f.key === "routeObjId") {
                  return { 
                    ...f, 
                    options: editFilteredRoutes.map(r => ({ 
                      label: r.routeNumber || `Route ${r.routeName || r._id}`, 
                      value: r._id 
                    })),
                    disabled: !editSelectedBranch
                  };
                }
                if (f.key === "pickupGeoId" || f.key === "dropGeoId") {
                  return { 
                    ...f, 
                    options: geofences.map(g => ({ label: g.geofenceName, value: g._id })) 
                  };
                }
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