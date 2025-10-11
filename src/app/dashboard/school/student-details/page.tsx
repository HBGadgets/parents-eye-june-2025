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
import { useInfiniteRouteData } from "@/hooks/useInfiniteRouteData";
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

// Safe accessor functions
const getSchoolId = (student: Student): string => {
  if (!student.schoolId) return "";
  return typeof student.schoolId === "object"
    ? student.schoolId?._id || ""
    : student.schoolId || "";
};

const getBranchId = (student: Student): string => {
  if (!student.branchId) return "";
  return typeof student.branchId === "object"
    ? student.branchId?._id || ""
    : student.branchId || "";
};

const getRouteId = (student: Student): string => {
  if (student.routeObjId) {
    return typeof student.routeObjId === "object"
      ? student.routeObjId?._id || ""
      : student.routeObjId || "";
  }
  if (student.routeId) {
    return typeof student.routeId === "object"
      ? student.routeId?._id || ""
      : student.routeId || "";
  }
  return "";
};

const getGeofenceId = (geoField: any): string => {
  if (!geoField) return "";
  return typeof geoField === "object" ? geoField?._id || "" : geoField || "";
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

  // Add form state for cascading dropdowns
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");

  // Edit form state for cascading dropdowns
  const [editSelectedSchool, setEditSelectedSchool] = useState("");
  const [editSelectedBranch, setEditSelectedBranch] = useState("");

  const { exportToPDF, exportToExcel } = useExport();

  // Fetch schools, branches, routes
  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["schools"],
    queryFn: () => api.get<School[]>("/school"),
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<
    Branch[]
  >({
    queryKey: ["branches"],
    queryFn: () => api.get<Branch[]>("/branch"),
  });

  const { data: routesData, isLoading: routesLoading } = useInfiniteRouteData();
  const routes: Route[] = Array.isArray(routesData)
    ? routesData
    : routesData?.data || [];

  // Fetch geofences
  const { data: geofencesData, isLoading: geofencesLoading } = useGeofences({
    pagination,
    sorting,
  });

  const geofences: Geofence[] = Array.isArray(geofencesData)
    ? geofencesData
    : Array.isArray(geofencesData?.data)
    ? geofencesData.data
    : [];

  // Filter branches based on selected school (Add form)
  const filteredBranches = useMemo(() => {
    if (!selectedSchool) return [];
    return branches.filter((branch) => {
      // Safe branch schoolId access
      const branchSchoolId = branch.schoolId
        ? typeof branch.schoolId === "object"
          ? branch.schoolId?._id
          : branch.schoolId
        : null;
      return branchSchoolId === selectedSchool;
    });
  }, [selectedSchool, branches]);

  // Filter routes based on selected branch (Add form)
  const filteredRoutes = useMemo(() => {
    if (!selectedBranch) return [];
    return routes.filter((route) => {
      const routeBranchId = route.branchId
        ? typeof route.branchId === "object"
          ? route.branchId?._id
          : route.branchId
        : null;
      return routeBranchId === selectedBranch;
    });
  }, [selectedBranch, routes]);

  // Filter branches for edit dialog
  const editFilteredBranches = useMemo(() => {
    if (!editSelectedSchool) return branches;
    return branches.filter((branch) => {
      const branchSchoolId = branch.schoolId
        ? typeof branch.schoolId === "object"
          ? branch.schoolId?._id
          : branch.schoolId
        : null;
      return branchSchoolId === editSelectedSchool;
    });
  }, [editSelectedSchool, branches]);

  // Filter routes for edit dialog
  const editFilteredRoutes = useMemo(() => {
    if (!editSelectedBranch) return routes;
    return routes.filter((route) => {
      const routeBranchId = route.branchId
        ? typeof route.branchId === "object"
          ? route.branchId?._id
          : route.branchId
        : null;
      return routeBranchId === editSelectedBranch;
    });
  }, [editSelectedBranch, routes]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedStudentName(studentName), 500);
    return () => clearTimeout(handler);
  }, [studentName]);

  const {
    data: studentsData,
    isLoading,
    isFetching,
  } = useStudents({
    pagination,
    sorting,
    childName: debouncedStudentName,
  });

  // Set edit form initial values when edit target changes
  useEffect(() => {
    if (editTarget) {
      setEditSelectedSchool(getSchoolId(editTarget));
      setEditSelectedBranch(getBranchId(editTarget));
    }
  }, [editTarget]);

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => api.post("/child", newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      closeButtonRef.current?.click();
      // Reset form state
      setSelectedSchool("");
      setSelectedBranch("");
      alert("Student added successfully.");
    },
    onError: (err: any) =>
      alert(`Failed to add student.\nError: ${err.message}`),
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
      setDeleteTarget(null);
      alert("Student deleted successfully.");
    },
    onError: (err: any) =>
      alert(`Failed to delete student.\nError: ${err.message}`),
  });

  const handleSave = (updatedData: Partial<Student>) => {
    if (!editTarget) return;
    const changedFields: Partial<Record<keyof Student, unknown>> = {};

    // Map routeObjId to routeId for the API
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
    updateStudentMutation.mutate({
      studentId: editTarget._id,
      data: changedFields,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as typeof e.currentTarget & {
      parentName: { value: string };
      mobileNo: { value: string };
      username: { value: string };
      email: { value: string };
      password: { value: string };
      schoolId: { value: string };
      branchId: { value: string };
      routeId: { value: string };
      pickupGeoId: { value: string };
      dropGeoId: { value: string };
      childName: { value: string };
      className: { value: string };
      section: { value: string };
      DOB: { value: string };
      age: { value: string };
      gender: { value: string };
    };

    const data = {
      parent: {
        parentName: form.parentName.value.trim(),
        username: form.username.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
        mobileNo: form.mobileNo.value.trim(),
        schoolId: form.schoolId.value,
        branchId: form.branchId.value,
      },
      children: [
        {
          childName: form.childName.value.trim(),
          className: form.className.value.trim(),
          section: form.section.value.trim(),
          DOB: form.DOB.value,
          age: parseInt(form.age.value),
          gender: form.gender.value,
          routeId: form.routeId.value,
          pickupGeoId: form.pickupGeoId.value,
          dropGeoId: form.dropGeoId.value,
        },
      ],
    };

    try {
      await addStudentMutation.mutateAsync(data);
      form.reset();
      setSelectedSchool("");
      setSelectedBranch("");
    } catch (err) {
      console.error("SUBMISSION FAILED:", err);
    }
  };

  // Table columns with safe accessors
  const columns: ColumnDef<Student>[] = [
    {
      id: "childName",
      header: "Student Name",
      accessorFn: (row) => row.childName ?? "N/A",
    },
    {
      id: "age",
      header: "Age",
      accessorFn: (row) => row.age ?? "N/A",
    },
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
      accessorFn: (row) =>
        row.schoolId && typeof row.schoolId === "object"
          ? row.schoolId.schoolName ?? "N/A"
          : "N/A",
    },
    {
      id: "branchName",
      header: "Branch",
      accessorFn: (row) =>
        row.branchId && typeof row.branchId === "object"
          ? row.branchId.branchName ?? "N/A"
          : "N/A",
    },
    {
      id: "routeNumber",
      header: "Route Number",
      accessorFn: (row) => {
        if (row.routeObjId && typeof row.routeObjId === "object") {
          return row.routeObjId.routeNumber || "N/A";
        }
        if (row.routeId && typeof row.routeId === "object") {
          return row.routeId.routeNumber || "N/A";
        }
        return "N/A";
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
      accessorFn: (row) =>
        row.pickupGeoId && typeof row.pickupGeoId === "object"
          ? row.pickupGeoId.geofenceName ?? "N/A"
          : "N/A",
    },
    {
      id: "dropLocation",
      header: "Drop Location",
      accessorFn: (row) =>
        row.dropGeoId && typeof row.dropGeoId === "object"
          ? row.dropGeoId.geofenceName ?? "N/A"
          : "N/A",
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
      setEditSelectedBranch(""); // Reset branch when school changes
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
          <ColumnVisibilitySelector
            columns={table?.getAllColumns() || []}
            buttonVariant="outline"
          />
        </section>

        {/* Add Student Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default">Add Student</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Add Student</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parent Fields */}
                {[
                  { id: "parentName", label: "Parent Name *", type: "text" },
                  {
                    id: "mobileNo",
                    label: "Mobile No *",
                    type: "tel",
                    pattern: "[0-9]{10}",
                    maxLength: 10,
                  },
                  { id: "username", label: "Username *", type: "text" },
                  { id: "email", label: "Email *", type: "email" },
                  { id: "password", label: "Password *", type: "text" },
                ].map(({ id, label, type, ...props }) => (
                  <div key={id} className="grid gap-2">
                    <Label htmlFor={id}>{label}</Label>
                    <Input id={id} name={id} type={type} required {...props} />
                  </div>
                ))}

                {/* School - with onChange handler */}
                <div className="grid gap-2">
                  <Label htmlFor="schoolId">School *</Label>
                  <select
                    id="schoolId"
                    name="schoolId"
                    required
                    disabled={schoolsLoading}
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setSelectedBranch(""); // Reset branch when school changes
                    }}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school._id} value={school._id}>
                        {school.schoolName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Branch - filtered by school */}
                <div className="grid gap-2">
                  <Label htmlFor="branchId">Branch *</Label>
                  <select
                    id="branchId"
                    name="branchId"
                    required
                    disabled={branchesLoading || !selectedSchool}
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {!selectedSchool
                        ? "Select School First"
                        : "Select Branch"}
                    </option>
                    {filteredBranches.map((branch) => (
                      <option key={branch._id} value={branch._id}>
                        {branch.branchName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Route - filtered by branch */}
                <div className="grid gap-2">
                  <Label htmlFor="routeId">Route *</Label>
                  <select
                    id="routeId"
                    name="routeId"
                    required
                    disabled={routesLoading || !selectedBranch}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">
                      {!selectedBranch ? "Select Branch First" : "Select Route"}
                    </option>
                    {filteredRoutes.map((route) => (
                      <option key={route._id} value={route._id}>
                        {route.routeNumber ||
                          `Route ${route.routeName || route._id}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pickup Location */}
                <div className="grid gap-2">
                  <Label htmlFor="pickupGeoId">Pickup Location *</Label>
                  <select
                    id="pickupGeoId"
                    name="pickupGeoId"
                    required
                    disabled={geofencesLoading}
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Select Pickup Location</option>
                    {geofences.map((geo) => (
                      <option key={geo._id} value={geo._id}>
                        {geo.geofenceName}
                      </option>
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
                    className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Select Drop Location</option>
                    {geofences.map((geo) => (
                      <option key={geo._id} value={geo._id}>
                        {geo.geofenceName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Child Fields */}
                {[
                  { id: "childName", label: "Student Name *", type: "text" },
                  {
                    id: "age",
                    label: "Age *",
                    type: "number",
                    min: "3",
                    max: "18",
                  },
                  { id: "className", label: "Class *", type: "text" },
                  { id: "section", label: "Section *", type: "text" },
                  { id: "DOB", label: "Date of Birth *", type: "date" },
                  {
                    id: "gender",
                    label: "Gender *",
                    type: "select",
                    options: [
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ],
                  },
                ].map(({ id, label, type, options, ...props }) => (
                  <div key={id} className="grid gap-2">
                    <Label htmlFor={id}>{label}</Label>
                    {type === "select" ? (
                      <select
                        id={id}
                        name={id}
                        required
                        className="flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                      >
                        <option value="">
                          Select {label.replace(" *", "")}
                        </option>
                        {options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={id}
                        name={id}
                        type={type}
                        required
                        {...props}
                      />
                    )}
                  </div>
                ))}
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button ref={closeButtonRef} variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={
                    addStudentMutation.isPending ||
                    schoolsLoading ||
                    branchesLoading ||
                    routesLoading ||
                    geofencesLoading
                  }
                >
                  {addStudentMutation.isPending ? "Saving..." : "Save Student"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <main>
        <section>{tableElement}</section>

        <section>
          {deleteTarget && (
            <Alert<Student>
              title="Are you absolutely sure?"
              description={`This will permanently delete ${
                deleteTarget?.childName || "this student"
              } and all associated data.`}
              actionButton={(target) =>
                deleteStudentMutation.mutate(target._id)
              }
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
                    options: schools.map((s) => ({
                      label: s.schoolName,
                      value: s._id,
                    })),
                  };
                }
                if (f.key === "branchId") {
                  return {
                    ...f,
                    options: editFilteredBranches.map((b) => ({
                      label: b.branchName,
                      value: b._id,
                    })),
                    disabled: !editSelectedSchool,
                  };
                }
                if (f.key === "routeObjId") {
                  return {
                    ...f,
                    options: editFilteredRoutes.map((r) => ({
                      label: r.routeNumber || `Route ${r.routeName || r._id}`,
                      value: r._id,
                    })),
                    disabled: !editSelectedBranch,
                  };
                }
                if (f.key === "pickupGeoId" || f.key === "dropGeoId") {
                  return {
                    ...f,
                    options: geofences.map((g) => ({
                      label: g.geofenceName,
                      value: g._id,
                    })),
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
          onExportPdf={() =>
            exportToPDF(studentsData?.children || [], EXPORT_COLUMNS, {
              title: "All Students Data",
              companyName: "Parents Eye",
              metadata: {
                Total: `${studentsData?.children?.length || 0} students`,
              },
            })
          }
          onExportExcel={() =>
            exportToExcel(studentsData?.children || [], EXPORT_COLUMNS, {
              title: "All Students Data",
              companyName: "Parents Eye",
              metadata: {
                Total: `${studentsData?.children?.length || 0} students`,
              },
            })
          }
        />
      </main>
    </>
  );
}
