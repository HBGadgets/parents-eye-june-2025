"use client";

import * as React from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/interface/modal";
import { useRouteDropdown, useParentDropdown } from "@/hooks/useDropdown";
import { Combobox } from "@/components/ui/combobox";
import { useParent } from "@/hooks/useParents";
import AddParentForm from "@/components/parent/AddParentForm";
import { StudentCard } from "./StudentCard";

// ---------- TYPES ----------

interface GeofenceSearchState {
  pickup: string;
  drop: string;
}

interface StudentFormData {
  id: string;
  childName: string;
  rollNumber: string;
  className: string;
  section: string;
  DOB: Date | undefined;
  age: number | "";
  gender: "male" | "female" | "";
  routeObjId: string;
  pickupGeoId: string;
  dropGeoId: string;
  pickupGeoName?: string;
  dropGeoName?: string;
  routeName?: string;
}

interface Props {
  onSubmit: (data: {
    parentId: string;
    children: {
      childName: string;
      rollNumber: string;
      className: string;
      section: string;
      DOB: string;
      age: number;
      gender: string;
      routeObjId: string;
      pickupGeoId: string;
      dropGeoId: string;
    }[];
  }) => void;

  onClose: () => void;
  initialData?: Student | null;

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
}

// ---------- HELPERS ----------

const createEmptyStudent = (): StudentFormData => ({
  id: crypto.randomUUID(),
  childName: "",
  rollNumber: "",
  className: "",
  section: "",
  DOB: undefined,
  age: "",
  gender: "",
  routeObjId: "",
  pickupGeoId: "",
  dropGeoId: "",
  pickupGeoName: "",
  dropGeoName: "",
  routeName: "",
});

const calculateAge = (dob: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age;
};

const formatDateForSubmission = (date: Date): string => {
  const year = date.toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
  });
  const month = date.toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    month: "2-digit",
  });
  const day = date.toLocaleString("en-CA", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
  });

  return `${year}-${month}-${day}`;
};

export default function AddStudentForm({
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
}: Props) {
  // State
  const [students, setStudents] = React.useState<StudentFormData[]>([
    createEmptyStudent(),
  ]);
  const [parentId, setParentId] = React.useState("");
  const [parentName, setParentName] = React.useState("");
  const [showAddParent, setShowAddParent] = React.useState(false);
  const [parentSearch, setParentSearch] = React.useState("");
  const [parentOpen, setParentOpen] = React.useState(false);
  const [routeOpenStates, setRouteOpenStates] = React.useState<
    Record<string, boolean>
  >({});
  const [geofenceSearches, setGeofenceSearches] = React.useState<
    Record<string, GeofenceSearchState>
  >({});

  const isEditMode = !!initialData;
  const hasInitialized = React.useRef(false);

  // DROPDOWNS
  const anyRouteOpen = Object.values(routeOpenStates).some((isOpen) => isOpen);
  const { data: routes = [], isLoading: isLoadingRoutes } = useRouteDropdown(
    selectedBranchId,
    anyRouteOpen
  );

  const {
    data: parentPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: parentsLoading,
  } = useParentDropdown(selectedBranchId, parentSearch, parentOpen);

  const parentHook = useParent({ pageIndex: 0, pageSize: 10 }, [], {
    search: "",
    schoolId: selectedSchoolId,
    branchId: selectedBranchId,
  });

  const parents = React.useMemo(
    () => parentPages?.pages.flatMap((p: any) => p.data || []) ?? [],
    [parentPages]
  );

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedTokenRole === "school" || decodedTokenRole === "branchGroup"
      ? decodedToken?.id
      : decodedToken?.schoolId;
  const tokenBranchId =
    decodedTokenRole === "branch" ? decodedToken?.id : decodedToken?.branchId;

  // ✅ FIX: Sync both geofenceSearch AND routeOpenStates in the SAME useEffect
  React.useEffect(() => {
    setGeofenceSearches((prev) => {
      const next: Record<string, GeofenceSearchState> = {};
      students.forEach((student) => {
        next[student.id] = prev[student.id] ?? { pickup: "", drop: "" };
      });
      return next;
    });

    // ✅ MOVED INSIDE useEffect
    setRouteOpenStates((prev) => {
      const next: Record<string, boolean> = {};
      students.forEach((student) => {
        next[student.id] = prev[student.id] ?? false;
      });
      return next;
    });
  }, [students]);

  React.useEffect(() => {
    if (isEditMode || hasInitialized.current) return;

    if (
      (decodedTokenRole === "school" || decodedTokenRole === "branchGroup") &&
      tokenSchoolId
    ) {
      onSchoolChange?.(tokenSchoolId);
    }
    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }

    hasInitialized.current = true;
  }, [
    decodedTokenRole,
    tokenSchoolId,
    tokenBranchId,
    isEditMode,
    onSchoolChange,
    onBranchChange,
  ]);

  // PREFILL EDIT DATA
  React.useEffect(() => {
    if (!initialData) return;

    const raw: any = initialData;
    const dobDate = raw.DOB ? new Date(raw.DOB) : undefined;

    const extractedParentName = raw?.parentId?.parentName || "";
    const routeNumber = raw?.routeObjId?.routeNumber || "";
    const pickupGeofenceName = raw?.pickupGeoId?.geofenceName || "";
    const dropGeofenceName = raw?.dropGeoId?.geofenceName || "";

    const studentId = crypto.randomUUID();

    setStudents([
      {
        id: studentId,
        childName: initialData.childName,
        rollNumber: raw.rollNumber || "",
        className: initialData.className,
        section: initialData.section,
        DOB: dobDate,
        age: initialData.age,
        gender: raw.gender || "",
        routeObjId: raw?.routeObjId?._id || raw?.routeId?._id || "",
        pickupGeoId: raw?.pickupGeoId?._id || "",
        dropGeoId: raw?.dropGeoId?._id || "",
        pickupGeoName: pickupGeofenceName,
        dropGeoName: dropGeofenceName,
        routeName: routeNumber,
      },
    ]);

    if (raw?.parentId?._id) {
      setParentId(raw.parentId._id);
      setParentName(extractedParentName);
    }

    setParentSearch("");
    setGeofenceSearches({
      [studentId]: {
        pickup: "",
        drop: "",
      },
    });
  }, [initialData]);

  // RESET ON SCHOOL CHANGE
  const prevSchoolId = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (isEditMode) return;

    if (prevSchoolId.current && prevSchoolId.current !== selectedSchoolId) {
      onBranchChange?.(undefined);
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          routeObjId: "",
          pickupGeoId: "",
          dropGeoId: "",
          routeName: "",
          pickupGeoName: "",
          dropGeoName: "",
        }))
      );
      setParentId("");
      setParentName("");
      setParentSearch("");
    }

    prevSchoolId.current = selectedSchoolId;
  }, [selectedSchoolId, isEditMode, onBranchChange]);

  // RESET ON BRANCH CHANGE
  const prevBranchId = React.useRef<string | undefined>();
  React.useEffect(() => {
    if (isEditMode) return;

    if (prevBranchId.current && prevBranchId.current !== selectedBranchId) {
      setStudents((prev) =>
        prev.map((student) => ({
          ...student,
          routeObjId: "",
          pickupGeoId: "",
          dropGeoId: "",
          routeName: "",
          pickupGeoName: "",
          dropGeoName: "",
        }))
      );
      setParentId("");
      setParentName("");
      setParentSearch("");
    }

    prevBranchId.current = selectedBranchId;
  }, [selectedBranchId, isEditMode]);

  // HANDLERS

  const handleAddSibling = React.useCallback(() => {
    setStudents((prev) => [...prev, createEmptyStudent()]);
  }, []);

  const handleRemoveSibling = React.useCallback((id: string) => {
    setStudents((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((student) => student.id !== id);
    });

    setGeofenceSearches((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    setRouteOpenStates((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleStudentChange = React.useCallback(
    (id: string, field: keyof StudentFormData, value: any) => {
      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== id) return student;

          if (field === "routeObjId") {
            return {
              ...student,
              routeObjId: value,
              pickupGeoId: "",
              dropGeoId: "",
              pickupGeoName: "",
              dropGeoName: "",
            };
          }

          return { ...student, [field]: value };
        })
      );
    },
    []
  );

  const handleDOBChange = React.useCallback(
    (id: string, date: Date | undefined) => {
      if (!date) {
        handleStudentChange(id, "DOB", undefined);
        handleStudentChange(id, "age", "");
        return;
      }

      const age = calculateAge(date);
      setStudents((prev) =>
        prev.map((student) =>
          student.id === id ? { ...student, DOB: date, age } : student
        )
      );
    },
    [handleStudentChange]
  );

  const handleGeofenceSearchChange = React.useCallback(
    (studentId: string, type: "pickup" | "drop", value: string) => {
      setGeofenceSearches((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] ?? { pickup: "", drop: "" }),
          [type]: value,
        },
      }));
    },
    []
  );

  const handleRouteOpenChange = React.useCallback(
    (studentId: string, open: boolean) => {
      setRouteOpenStates((prev) => ({
        ...prev,
        [studentId]: open,
      }));
    },
    []
  );

  const handleParentChange = React.useCallback(
    (val?: string) => {
      if (!val) {
        setParentId("");
        setParentName("");
        return;
      }

      const parent = parentItems.find((item) => item.value === val);
      setParentId(val);
      setParentName(parent?.label || "");
    },
    [parents]
  );

  const handleParentOpenChange = React.useCallback((open: boolean) => {
    setParentOpen(open);
    if (open) {
      setParentSearch("");
    }
  }, []);

  const handleSave = React.useCallback(() => {
    // --- 1️⃣ Validate each student ---
    for (const student of students) {
      const requiredFields = [
        "childName",
        "routeObjId"
      ];

      for (const field of requiredFields) {
        if (!student[field]) {
          alert("Mandatory fields are required");
          return;
        }
      }
    }

    // --- 2️⃣ Role-based validation ---
    let errorMessage = "";

    switch (decodedTokenRole) {
      case "superAdmin":
        if (!selectedSchoolId || !selectedBranchId || !parentId)
          errorMessage = "School, Branch, and Parent are required.";
        break;

      case "school":
      case "branchGroup":
        if (!selectedBranchId || !parentId)
          errorMessage = "Branch and Parent are required.";
        break;

      case "branch":
        if (!parentId) errorMessage = "Parent is required.";
        break;

      default:
        errorMessage = "Invalid role.";
    }

    if (errorMessage) {
      alert(errorMessage);
      return;
    }

    // --- 3️⃣ Utility: remove empty / undefined fields from object ---
    const cleanObject = (obj) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([, value]) => value !== "" && value !== null && value !== undefined
        )
      );

    // --- 4️⃣ Build child payload formatter ---
    const formatChild = (student: Student) => {
      const hasDOB = Boolean(student.DOB);

      const formatted = {
        childName: student.childName,
        rollNumber: student.rollNumber,
        className: student.className,
        section: student.section,
        gender: student.gender,
        routeObjId: student.routeObjId,
        pickupGeoId: student.pickupGeoId,
        dropGeoId: student.dropGeoId,
      };

      if (hasDOB) {
        formatted.DOB = formatDateForSubmission(student.DOB).split("T")[0];

        if (student.age) {
          formatted.age = Number(student.age);
        }
      }

      return cleanObject(formatted);
    };

    let submissionData;

    if (isEditMode) {
      const student = students[0];

      submissionData = cleanObject({
        parentId,
        ...formatChild(student),
      });
    } else {
      submissionData = cleanObject({
        parentId,
        children: students.map(formatChild),
      });
    }

    // --- 6️⃣ Submit final cleaned payload ---
    onSubmit(submissionData);
  }, [
    students,
    parentId,
    selectedSchoolId,
    selectedBranchId,
    decodedTokenRole,
    isEditMode,
    onSubmit,
  ]);

  // ITEMS

  const schoolItems = React.useMemo(
    () =>
      schools.map((s) => ({
        value: s._id,
        label: s.schoolName,
      })),
    [schools]
  );

  const branchItems = React.useMemo(
    () =>
      branches.map((b) => ({
        value: b._id,
        label: b.branchName,
      })),
    [branches]
  );

  const parentItems = React.useMemo(() => {
    const items = parents.map((p: any) => ({
      value: p._id,
      label: p.parentName,
    }));

    if (
      parentId &&
      parentName &&
      !items.some((item) => item.value === parentId)
    ) {
      items.unshift({
        value: parentId,
        label: parentName,
      });
    }

    return items;
  }, [parents, parentId, parentName]);

  const handleSchoolChange = React.useCallback(
    (val?: string) => {
      onSchoolChange?.(val);
    },
    [onSchoolChange]
  );

  const branchSelected = !!selectedBranchId;

  // ---------- UI ----------

  return (
    <>
      <Card className="w-full max-w-[900px] shadow-xl mx-auto max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{initialData ? "Edit Student" : "Add Student"}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SCHOOL / BRANCH / PARENT */}
          <div className="space-y-4 pb-4 border-b">
            {/* SCHOOL */}
            {decodedTokenRole === "superAdmin" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">School *</label>
                <Combobox
                  items={schoolItems}
                  value={selectedSchoolId}
                  onValueChange={handleSchoolChange}
                  placeholder="Select School"
                  searchPlaceholder="Search school..."
                  emptyMessage="No schools found"
                  width="w-full"
                />
              </div>
            )}

            {/* BRANCH */}
            {(decodedTokenRole === "superAdmin" ||
              decodedTokenRole === "school" ||
              decodedTokenRole === "branchGroup") && (
                <div className="space-y-1">
                  <label className="text-sm font-medium">Branch *</label>
                  <Combobox
                    items={branchItems}
                    value={selectedBranchId}
                    onValueChange={onBranchChange}
                    placeholder={
                      selectedSchoolId ? "Select Branch" : "Select school first"
                    }
                    searchPlaceholder="Search branch..."
                    emptyMessage="No branches found"
                    width="w-full"
                    disabled={!selectedSchoolId}
                  />
                </div>
              )}

            {/* PARENT */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Parent *</label>
              <div className="flex gap-2 items-center">
                <Combobox
                  items={parentItems}
                  value={parentId}
                  onValueChange={handleParentChange}
                  placeholder={
                    branchSelected ? "Select Parent" : "Select branch first"
                  }
                  searchPlaceholder="Search parent..."
                  emptyMessage={
                    parentsLoading ? "Loading parents..." : "No parents found"
                  }
                  width="w-[95%]"
                  disabled={!branchSelected}
                  onReachEnd={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                      fetchNextPage();
                    }
                  }}
                  isLoadingMore={isFetchingNextPage}
                  searchValue={parentSearch}
                  onSearchChange={setParentSearch}
                  open={parentOpen}
                  onOpenChange={handleParentOpenChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={!branchSelected}
                  onClick={() => setShowAddParent(true)}
                  title="Add Parent"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* STUDENTS / SIBLINGS */}
          <div className="space-y-4">
            {students.map((student, index) => (
              <StudentCard
                key={student.id}
                student={student}
                index={index}
                routes={routes}
                routeOpen={routeOpenStates[student.id] || false}
                onRouteOpenChange={(open) =>
                  handleRouteOpenChange(student.id, open)
                }
                isLoadingRoutes={isLoadingRoutes}
                branchSelected={!!selectedBranchId}
                geofenceSearch={
                  geofenceSearches[student.id] || { pickup: "", drop: "" }
                }
                onStudentChange={handleStudentChange}
                onDOBChange={handleDOBChange}
                onGeofenceSearchChange={handleGeofenceSearchChange}
                onRemoveSibling={handleRemoveSibling}
                canRemove={students.length > 1 && !isEditMode}
              />
            ))}

            {!isEditMode && (
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSibling}
                className="w-full"
                disabled={!branchSelected}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Sibling
              </Button>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t cursor-pointer">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="w-full sm:w-auto cursor-pointer"
            >
              {initialData
                ? "Update Student"
                : students.length > 1
                  ? `Create ${students.length} Students`
                  : "Create Student"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAddParent && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <AddParentForm
            onClose={() => setShowAddParent(false)}
            onSubmit={async (data) => {
              const res = await parentHook.createParentAsync(data);
              if (res?._id) {
                setParentId(res._id);
                setParentName(data.parentName || "");
              }
              setShowAddParent(false);
            }}
            schools={schools}
            branches={branches}
            selectedSchoolId={selectedSchoolId}
            selectedBranchId={selectedBranchId}
            onSchoolChange={onSchoolChange}
            onBranchChange={onBranchChange}
            decodedToken={decodedToken}
          />
        </div>
      )}
    </>
  );
}
