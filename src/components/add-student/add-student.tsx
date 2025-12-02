"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/interface/modal";
import { useRouteDropdown, useParentDropdown } from "@/hooks/useDropdown";
import { Combobox } from "@/components/ui/combobox";

interface Props {
  onSubmit: (data: {
    childName: string;
    age: number;
    className: string;
    section: string;
    schoolId: string;
    branchId: string;
    routeId: string;
    parentId: string;
  }) => void;

  onClose: () => void;
  initialData?: Student | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;
  selectedParentId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;
  onParentChange?: (id?: string) => void;

  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
}

export default function AddStudentForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  selectedSchoolId,
  selectedBranchId,
  selectedParentId,
  onSchoolChange,
  onBranchChange,
  onParentChange,
  decodedToken,
}: Props) {
  // ---------------- FORM STATE ----------------
  const [childName, setChildName] = React.useState("");
  const [age, setAge] = React.useState<number | "">("");
  const [className, setClassName] = React.useState("");
  const [section, setSection] = React.useState("");
  const [routeId, setRouteId] = React.useState("");
  const [parentId, setParentId] = React.useState("");

  // For parent search
  const [parentSearch, setParentSearch] = React.useState("");

  // ---------------- DROPDOWNS ----------------
  const { data: routes = [] } = useRouteDropdown(selectedBranchId);

  const {
    data: parentPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: parentsLoading,
  } = useParentDropdown(selectedBranchId, parentSearch);

  const parents = React.useMemo(
    () => parentPages?.pages.flatMap((p) => p.data || []) ?? [],
    [parentPages]
  );

  const decodedTokenRole = decodedToken?.role;

  // ---------------- ROLE BASED DEFAULT ----------------
  const tokenSchoolId =
    decodedTokenRole === "school" ? decodedToken?.id : decodedToken?.schoolId;

  const tokenBranchId =
    decodedTokenRole === "branch" ? decodedToken?.id : decodedToken?.branchId;

  // ---------------- AUTO APPLY ROLE (ONE TIME) ----------------
  React.useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      onSchoolChange?.(tokenSchoolId);
    }
    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }
  }, []);

  // ---------------- PREFILL EDIT DATA ----------------
  React.useEffect(() => {
    if (!initialData) return;

    setChildName(initialData.childName);
    setAge(initialData.age);
    setClassName(initialData.className);
    setSection(initialData.section);

    onSchoolChange?.(initialData.schoolId?._id);
    onBranchChange?.(initialData.branchId?._id);
    onParentChange?.(initialData.parentId?._id);

    // Parent prefill
    if ((initialData as any)?.parentId?._id) {
      setParentId((initialData as any).parentId._id);
    }
    if (initialData) {
      setParentSearch("");
    }

    // Route prefill (supports routeObjId or routeId)
    const existingRouteId =
      (initialData as any)?.routeObjId?._id ||
      (initialData as any)?.routeId?._id ||
      "";

    setRouteId(existingRouteId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  React.useEffect(() => {
    if (!initialData?.parentId?._id) return;
    if (!hasNextPage) return;

    const exists = parents.some((p) => p._id === initialData.parentId._id);

    if (!exists && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [parents, hasNextPage, isFetchingNextPage, initialData]);

  // ---------------- RESET WHEN BRANCH CHANGES (CREATE MODE) ----------------
  React.useEffect(() => {
    if (!initialData) {
      setRouteId("");
      setParentId("");
      setParentSearch("");
    }
  }, [selectedBranchId, initialData]);

  React.useEffect(() => {
    if (!initialData?.parentId?._id) return;
    if (!parents.length) return;

    const alreadySet = parentId === initialData.parentId._id;
    if (alreadySet) return;

    const match = parents.find((p) => p._id === initialData.parentId._id);

    if (match) {
      setParentId(match._id);
    }
  }, [parents, initialData, parentId]);

  React.useEffect(() => {
    setRouteId("");
    setParentId("");
    setParentSearch("");
  }, [selectedBranchId]);

  // ---------------- SUBMIT ----------------
  const handleSave = () => {
    if (
      !childName ||
      !age ||
      !className ||
      !section ||
      !selectedSchoolId ||
      !selectedBranchId ||
      !routeId ||
      !parentId
    ) {
      alert("All fields are required");
      return;
    }

    onSubmit({
      childName,
      age: Number(age),
      className,
      section,
      schoolId: selectedSchoolId,
      branchId: selectedBranchId,
      routeId,
      parentId,
    });
  };

  // ---------------- COMBOBOX ITEMS ----------------
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

  const routeItems = React.useMemo(
    () =>
      routes.map((r: any) => ({
        value: r._id,
        label: r.routeNumber,
      })),
    [routes]
  );

  const parentItems = React.useMemo(
    () =>
      parents.map((p: any) => ({
        value: p._id,
        label: p.parentName,
      })),
    [parents]
  );

  // ---------------- UI ----------------
  return (
    <Card className="w-[430px] shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Student" : "Add Student"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* NAME */}
        <Input
          placeholder="Student Name"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
        />

        {/* AGE */}
        <Input
          type="number"
          placeholder="Age"
          value={age}
          onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
        />

        {/* CLASS */}
        <Input
          placeholder="Class"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
        />

        {/* SECTION */}
        <Input
          placeholder="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        />

        {/* SCHOOL (Combobox if superAdmin) */}
        {decodedTokenRole === "superAdmin" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">School *</label>
            <Combobox
              items={schoolItems}
              value={selectedSchoolId}
              onValueChange={onSchoolChange}
              placeholder="Select School"
              searchPlaceholder="Search school..."
              emptyMessage="No schools found"
              width="w-full"
            />
          </div>
        )}

        {/* BRANCH */}
        {decodedTokenRole !== "branch" && (
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

        {/* ROUTE */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Route *</label>
          <Combobox
            items={routeItems}
            value={routeId}
            onValueChange={setRouteId}
            placeholder={
              selectedBranchId ? "Select Route" : "Select branch first"
            }
            searchPlaceholder="Search route..."
            emptyMessage="No routes found"
            width="w-full"
            disabled={!selectedBranchId}
          />
        </div>

        {/* PARENT */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Parent *</label>
          <Combobox
            items={parentItems}
            value={parentId}
            onValueChange={setParentId}
            placeholder={
              selectedBranchId ? "Select Parent" : "Select branch first"
            }
            searchPlaceholder="Search parent..."
            emptyMessage={
              parentsLoading ? "Loading parents..." : "No parents found"
            }
            width="w-full"
            disabled={!selectedBranchId}
            onReachEnd={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            isLoadingMore={isFetchingNextPage}
            searchValue={parentSearch}
            onSearchChange={(val) => {
              setParentSearch(val);
            }}
          />
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initialData ? "Update Student" : "Create Student"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
