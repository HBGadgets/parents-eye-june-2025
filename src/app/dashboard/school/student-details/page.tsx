"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { CustomTable, CellContent } from "@/components/ui/CustomTable";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import type { ColumnDef } from "@tanstack/react-table";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Student } from "@/interface/modal";
import { DatePicker } from "@/components/ui/datePicker";
import { SearchableSelect } from "@/components/custom-select";

export default function StudentDetails() {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filteredData, setFilteredData] = useState<Student[]>([]);
  const [filterResults, setFilterResults] = useState<Student[]>([]);
  const [selectedUser, setSelectedUser] = useState<Student | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();
  const [gender, setGender] = useState<string | undefined>(undefined);
  const [pickupPoint, setPickupPoint] = useState<string | undefined>(undefined);
  const [busNumber, setBusNumber] = useState<string | undefined>(undefined);
  const [school, setSchool] = useState<string | undefined>(undefined);
  const [branch, setBranch] = useState<string | undefined>(undefined);

  // Fetch students data
  const {
    data: students,
    isLoading,
    isError,
    error,
  } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const res = await api.get<{ children: Student[] }>("/child");
      return res.children;
    },
  });

  useEffect(() => {
    if (students && students.length > 0) {
      setFilteredData(students);
      setFilterResults(students); // For search base
    }
  }, [students]);

  // Mutation to add a new student
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: any) => {
      return await api.post("/child", newStudent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      // Reset form state if needed
      setGender(undefined);
      setDob(undefined);
      setPickupPoint(undefined);
      setBusNumber(undefined);
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to add student.");
    },
  });

  // Mutation to delete a student
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      return await api.delete(`/child/${studentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to delete student.");
    },
  });

  // Mutation to add a new student
  const updateStudentMutation = useMutation({
    mutationFn: async (updatedStudent: Student) => {
      return await api.put(`/child/${updatedStudent._id}`, updatedStudent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to update student.");
    },
  });

  // Dynamic field configuration for the edit dialog
  const editFieldConfigs: FieldConfig[] = [
    {
      key: "childName",
      label: "Student Name",
      type: "text",
      placeholder: "Enter student name",
      required: true,
    },
    {
      key: "className",
      label: "Class",
      type: "text",
      placeholder: "Enter class name",
    },
    {
      key: "deviceId.routeNo",
      label: "Route No",
      type: "text",
      placeholder: "Enter route number",
    },
    {
      key: "section",
      label: "Section",
      type: "text",
      placeholder: "Enter section",
    },
    {
      key: "schoolId.schoolName",
      label: "School",
      type: "text",
      placeholder: "Enter School Name",
    },
    {
      key: "branchId.branchName",
      label: "Branch",
      type: "text",
      placeholder: "Enter Branch Name",
    },
    { key: "DOB", label: "Date of Birth", type: "date" },
    { key: "age", label: "Age", type: "number", placeholder: "Enter age" },
    {
      key: "parentId.parentName",
      label: "Parent Name",
      type: "text",
      placeholder: "Enter parent name",
    },
    {
      key: "parentId.contactNo",
      label: "Contact No",
      type: "text",
      placeholder: "Enter contact number",
    },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [
        { label: "Male", value: "male" },
        { label: "Female", value: "female" },
      ],
    },
    {
      key: "deviceId.name",
      label: "Bus No.",
      type: "text",
      placeholder: "Enter bus number",
    },
    {
      key: "geofenceId.name",
      label: "Pickup Point",
      type: "text",
      placeholder: "Enter pickup point",
    },
    {
      key: "createdAt",
      label: "Registration Date",
      type: "text",
      disabled: true,
    },
    {
      key: "parentId.userName",
      label: "Username",
      type: "text",
      placeholder: "Enter username",
    },
    {
      key: "parentId.password",
      label: "Password",
      type: "text",
      placeholder: "Enter password",
    },
  ];

  // Define the columns for the table
  const columns: ColumnDef<Student, CellContent>[] = [
    {
      header: "Student Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.childName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 200, maxWidth: 300 },
    },
    {
      header: "Class",
      accessorFn: (row) => ({
        type: "text",
        value: row.className ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Route No",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.routeNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Section",
      accessorFn: (row) => ({
        type: "text",
        value: row.section ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "School",
      accessorFn: (row) => ({
        type: "text",
        value: row.schoolId?.schoolName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Branch",
      accessorFn: (row) => ({
        type: "text",
        value: row.branchId?.branchName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "DOB",
      accessorFn: (row) => ({
        type: "text",
        value: row.DOB
          ? new Date(row.DOB).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Age",
      accessorFn: (row) => ({
        type: "text",
        value: row.age?.toString() ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 100, maxWidth: 300 },
    },
    {
      header: "Parent Name",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.parentName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Contact No",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.contactNo ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Gender",
      accessorFn: (row) => ({
        type: "text",
        value: row.gender ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Bus No.",
      accessorFn: (row) => ({
        type: "text",
        value: row.deviceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Pickup Point",
      accessorFn: (row) => ({
        type: "text",
        value: row.geofenceId?.name ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 180, maxWidth: 300 },
    },
    {
      header: "Registration Date",
      accessorFn: (row) => ({
        type: "text",
        value: row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 220, maxWidth: 300 },
    },
    {
      header: "UserName",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.userName ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Password",
      accessorFn: (row) => ({
        type: "text",
        value: row.parentId?.password ?? "",
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1, minWidth: 150, maxWidth: 300 },
    },
    {
      header: "Action",
      accessorFn: (row) => ({
        type: "group",
        items: [
          {
            type: "button",
            label: "Edit",
            onClick: () => handleEdit(row),
          },
          {
            type: "button",
            label: "Delete",
            onClick: () => setSelectedStudent(row),
            disabled: deleteStudentMutation.isPending,
          },
        ],
      }),
      cell: (info) => info.getValue(),
      meta: { flex: 1.5, minWidth: 150, maxWidth: 200 },
      enableSorting: false,
    },
  ];

  // Handle edit action
  const handleEdit = useCallback((user: Student) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }, []);

  const handleSave = (updatedData: Partial<Student>) => {
    if (!selectedUser) return;

    const updatedStudent: Student = {
      ...selectedUser,
      ...updatedData,
      // nested updates if needed:
      deviceId: {
        ...selectedUser.deviceId,
        ...(updatedData.deviceId ?? {}),
      },
      geofenceId: {
        ...selectedUser.geofenceId,
        ...(updatedData.geofenceId ?? {}),
      },
      parentId: {
        ...selectedUser.parentId,
        ...(updatedData.parentId ?? {}),
      },
      schoolId: {
        ...selectedUser.schoolId,
        ...(updatedData.schoolId ?? {}),
      },
      branchId: {
        ...selectedUser.branchId,
        ...(updatedData.branchId ?? {}),
      },
    };

    // Optimistic update or API call
    updateStudentMutation.mutate(updatedStudent);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    // payload
    const newStudent = {
      childName: data.childName,
      className: data.className,
      section: data.section,
      gender: gender,
      DOB: dob?.toISOString().split("T")[0], // format: YYYY-MM-DD
      age: Number(data.age),
      geofenceId: pickupPoint, // must be the ID, not name
      deviceId: busNumber, // must be the ID
      deviceName: busNumber, // also include the name if required
      parentId: data.parentId, // from select (if available) or input
      parentName: data.parent,
      email: data.email,
      schoolMobile: data.mobileNo,
      username: data.username,
      password: data.password,
      schoolId: data.schoolId, // should be ID
      branchId: data.branchId, // should be ID
      // statusOfRegister: "registered",
    };

    addStudentMutation.mutate(newStudent);
  };

  const handleSearchResults = useCallback((results: Student[]) => {
    setFilteredData(results);
  }, []);

  const genderOptions = [
    { label: "male", value: "male" },
    { label: "female", value: "female" },
  ];

  const pickupPointOptions = students
    ? Array.from(
        new Set(students.map((s) => s.geofenceId?.name).filter(Boolean))
      ).map((name) => ({ label: name, value: name }))
    : [];

  const busNumberOptions = students
    ? Array.from(
        new Set(students.map((s) => s.deviceId?.name).filter(Boolean))
      ).map((name) => ({ label: name, value: name }))
    : [];

  const schoolOptions = students
    ? Array.from(
        new Set(students.map((s) => s.schoolId?.schoolName).filter(Boolean))
      ).map((name) => ({ label: name, value: name }))
    : [];

  const branchOptions = students
    ? Array.from(
        new Set(students.map((s) => s.branchId?.branchName).filter(Boolean))
      ).map((name) => ({ label: name, value: name }))
    : [];

  if (isLoading) return <p className="p-4">Loading student details...</p>;
  if (isError)
    return (
      <p className="p-4 text-red-600">
        {(error as Error).message || "Failed to load student details."}
      </p>
    );

  return (
    <main>
      <section>
        <div className="flex items-center justify-between mb-4">
          {/* Search component */}
          <SearchComponent
            data={filterResults}
            displayKey={[
              "childName",
              "className",
              "section",
              "gender",
              "schoolId.schoolName",
              "branchId.branchName",
              "parentId.parentName",
              "parentId.contactNo",
              "deviceId.routeNo",
              "geofenceId.name",
            ]}
            onResults={handleSearchResults}
            className="w-[300px] mb-4"
          />

          {/* Add student button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Add student</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Add Student</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Student Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="childName">Student Name</Label>
                    <Input
                      id="childName"
                      name="childName"
                      placeholder="Enter student name"
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <SearchableSelect
                      value={gender}
                      onChange={setGender}
                      options={genderOptions}
                      placeholder="Select gender"
                      allowClear={true}
                      className=""
                    />
                  </div>

                  {/* School */}
                  <div className="grid gap-2">
                    <Label htmlFor="schoolId">School</Label>
                    <SearchableSelect
                      value={school}
                      onChange={setSchool}
                      options={schoolOptions}
                      placeholder="Select school"
                      allowClear={true}
                      className=""
                    />
                  </div>

                  {/* Branch */}
                  <div className="grid gap-2">
                    <Label htmlFor="branchId">Branch</Label>
                    <SearchableSelect
                      value={branch}
                      onChange={setBranch}
                      options={branchOptions}
                      placeholder="Select branch"
                      allowClear={true}
                      className=""
                    />
                  </div>

                  {/* Class */}
                  <div className="grid gap-2">
                    <Label htmlFor="className">Class</Label>
                    <Input
                      id="className"
                      name="className"
                      placeholder="Enter class name"
                    />
                  </div>

                  {/* Section */}
                  <div className="grid gap-2">
                    <Label htmlFor="section">Section</Label>
                    <Input
                      id="section"
                      name="section"
                      placeholder="Enter section"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="grid gap-2">
                    <DatePicker
                      label="Date of Birth"
                      open={open}
                      setOpen={setOpen}
                      date={dob}
                      setDate={setDob}
                      className="w-full"
                    />
                  </div>

                  {/* Age */}
                  <div className="grid gap-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min={0}
                      placeholder="Enter age"
                    />
                  </div>

                  {/* Pickup Point */}
                  <div className="grid gap-2">
                    <Label htmlFor="geofenceId">Pickup Point</Label>
                    <SearchableSelect
                      value={pickupPoint}
                      onChange={setPickupPoint}
                      options={pickupPointOptions}
                      placeholder="Select pickup point"
                      allowClear={true}
                      className=""
                    />
                  </div>

                  {/* Bus Number */}
                  <div className="grid gap-2">
                    <Label htmlFor="deviceId">Bus Number</Label>
                    <SearchableSelect
                      value={busNumber}
                      onChange={setBusNumber}
                      options={busNumberOptions}
                      placeholder="Select bus number"
                      allowClear={true}
                      className=""
                    />
                  </div>

                  {/* Parent Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="parent">Parent Name</Label>
                    <Input
                      id="parent"
                      name="parent"
                      placeholder="Enter parent name"
                    />
                  </div>

                  {/* Email */}
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Mobile No */}
                  <div className="grid gap-2">
                    <Label htmlFor="mobileNo">Mobile No</Label>
                    <Input
                      id="mobileNo"
                      name="mobileNo"
                      type="tel"
                      placeholder="Enter mobile number"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>

                  {/* Username and Password */}
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      placeholder="Enter username"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="text"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save changes</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </section>
      <section>
        {/* Table component */}
        <CustomTable
          data={filteredData || []}
          columns={columns}
          pageSizeArray={[10, 20, 50]}
          showFilters={true}
          tableClass="bg-white rounded shadow"
        />
      </section>
      {/* Delete student modal */}
      {selectedStudent && (
        <AlertDialog
          open={!!selectedStudent}
          onOpenChange={() => setSelectedStudent(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone and will permanently delete the
                student record along with all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteStudentMutation.mutate(selectedStudent._id);
                  setSelectedStudent(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Edit Dialog */}
      {selectedUser && (
        <DynamicEditDialog
          data={selectedUser}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleSave}
          fields={editFieldConfigs}
          title="Edit Student"
          description="Update the student information below. Fields marked with * are required."
          avatarConfig={{
            imageKey: "image",
            nameKeys: ["childName"],
          }}
        />
      )}
    </main>
  );
}
