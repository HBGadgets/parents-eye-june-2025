"use client";

import AddStudentForm from "@/components/add-student/add-student";
import { getStudentColumns } from "@/components/columns/columns";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import {
  useBranchDropdown,
  useSchoolDropdown,
  useRouteDropdown,
} from "@/hooks/useDropdown";
import { useStudent } from "@/hooks/useStudent";
import { Student } from "@/interface/modal";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { Combobox } from "@/components/ui/combobox";
import { X, Upload, XCircle, Clock, CheckCircle, FilterX } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ExcelUploader } from "@/components/excel-uploader/ExcelUploader";
import { excelFileUploadForStudent } from "@/services/fileUploadService";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type DecodedToken = {
  role: string;
  schoolId?: string;
  id?: string;
  branchId?: string;
};

type Filters = {
  search?: string;
  schoolId?: string;
  branchId?: string;
  routeObjId?: string;
};

export default function StudentDetails() {
  const requiredHeaders = [
    "parentName",
    "username",
    "email",
    "password",
    "mobileNo",
    "childName",
    "className",
    "section",
    "rollNumber",
    "DOB",
    "age",
    "gender",
  ];
  const childCsvContent =
    "parentName,username,email,password,mobileNo,childName,className,section,rollNumber,DOB,age,gender\n" +
    "Ramesh Kumar,ramesh123,ramesh@example.com,pass123,9876543210,Aarav Kumar,1,A,12,2018-05-10,6,male\n";
  // ---------------- Pagination & Sorting ----------------
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ---------------- Search State ----------------
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // ---------------- Modal/Form State ----------------
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // ---------------- Excel Upload State ----------------
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // ---------------- Filter State (TABLE ONLY) ----------------
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();
  const [filterRouteId, setFilterRouteId] = useState<string>();
  const [filterStatusOfRegistration, setFilterStatusOfRegistration] =
    useState<string>();

  // ---------------- Form State (FORM ONLY) ----------------
  const [formSchoolId, setFormSchoolId] = useState<string | undefined>(
    undefined
  );
  const [formBranchId, setFormBranchId] = useState<string | undefined>(
    undefined
  );
  const [formParentId, setFormParentId] = useState<string | undefined>(
    undefined
  );

  // ---------------- Auth ----------------
  const [decodedToken, setDecodedToken] = useState<DecodedToken>({ role: "" });
  const role = decodedToken.role || "";

  // ---------------- Decode Token ----------------
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setDecodedToken(decoded);
    } catch (err) {
      console.error("Token decode failed", err);
    }
  }, []);

  // ---------------- Role-based Defaults ----------------
  const tokenSchoolId = useMemo(
    () => (role === "school" ? decodedToken.id : decodedToken.schoolId),
    [role, decodedToken.id, decodedToken.schoolId]
  );

  const tokenBranchId = useMemo(
    () => (role === "branch" ? decodedToken.id : undefined),
    [role, decodedToken.id]
  );

  const tokenBranchGroupSchoolId = useMemo(
    () => (role === "branchGroup" ? decodedToken.schoolId : undefined),
    [role, decodedToken.schoolId]
  );

  // ---------------- Apply Role Filters ONCE ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) setFilterSchoolId(tokenSchoolId);
    if (role === "branch" && tokenBranchId) setFilterBranchId(tokenBranchId);
    if (role === "branchGroup" && tokenBranchGroupSchoolId) {
      setFilterSchoolId(tokenBranchGroupSchoolId);
    }
  }, [role, tokenSchoolId, tokenBranchId, tokenBranchGroupSchoolId]);

  // ---------------- Reset Branch & Route Filter When School Changes ----------------
  useEffect(() => {
    if (!filterSchoolId && role === "superAdmin") {
      setFilterBranchId(undefined);
      setFilterRouteId(undefined);
    }
  }, [filterSchoolId, role]);

  // ---------------- Reset Route Filter When Branch Changes ----------------
  useEffect(() => {
    if (!filterBranchId) {
      setFilterRouteId(undefined);
    }
  }, [filterBranchId]);

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
      routeObjId: filterRouteId,
      statusOfRegister: filterStatusOfRegistration,
    }),
    [
      debouncedSearch,
      filterSchoolId,
      filterBranchId,
      filterRouteId,
      filterStatusOfRegistration,
    ]
  );

  // ---------------- Reset Pagination When Filters Change ----------------
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId, filters.routeObjId]);

  // ---------------- Dropdown Data ----------------
  const { data: schools = [] } = useSchoolDropdown(role === "superAdmin");
  const { data: branches = [] } = useBranchDropdown(formSchoolId);
  const { data: filterBranches = [] } = useBranchDropdown(filterSchoolId);
  const { data: routes = [] } = useRouteDropdown(filterBranchId);

  // ---------------- All Branches for Upload (no filter) ----------------
  const { data: allBranches = [] } = useBranchDropdown();

  // ---------------- Dropdown Items ----------------
  const schoolItems = useMemo(
    () =>
      schools.map((s) => ({
        label: s.schoolName!,
        value: s._id,
      })),
    [schools]
  );

  const filterBranchItems = useMemo(
    () =>
      filterBranches.map((b) => ({
        label: b.branchName!,
        value: b._id,
      })),
    [filterBranches]
  );

  const routeItems = useMemo(
    () =>
      routes.map((r: any) => ({
        label: r.routeNumber,
        value: r._id,
      })),
    [routes]
  );

  const statusOfRegister = [
    { label: "Registered", value: "registered" },
    { label: "Rejected", value: "rejected" },
    { label: "Pending", value: "pending" },
  ];

  // ---------------- API ----------------
  const {
    students,
    total,
    isLoading,
    deleteStudent,
    updateStudentAsync,
    createStudent,
    exportExcel,
    exportPdf,
    approveStudent,
    isPdfExporting,
    isExcelExporting,
    isDeleteLoading,
    isApproveLoading,
  } = useStudent(pagination, sorting, filters);

  // ---------------- Clear Filters ----------------
  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    if (role === "superAdmin") {
      setFilterSchoolId(undefined);
    }
    if (role === "superAdmin" || role === "school" || role === "branchGroup") {
      setFilterBranchId(undefined);
    }
    setFilterRouteId(undefined);
  }, [role]);

  // ---------------- Check Active Filters ----------------
  const hasActiveFilters = useMemo(() => {
    return (
      searchInput !== "" ||
      (role === "superAdmin" && filterSchoolId !== undefined) ||
      ((role === "superAdmin" || role === "school" || role === "branchGroup") &&
        filterBranchId !== undefined) ||
      filterRouteId !== undefined
    );
  }, [searchInput, filterSchoolId, filterBranchId, filterRouteId, role]);

  // ---------------- Handlers ----------------
  const closeModal = useCallback(() => {
    setShowForm(false);
    setEditStudent(null);
    setFormSchoolId(undefined);
    setFormBranchId(undefined);
    setFormParentId(undefined);
  }, []);

  const handleEdit = useCallback((row: Student) => {
    setEditStudent(row);
    setFormSchoolId(row.schoolId?._id);
    setFormBranchId(row.branchId?._id);
    setFormParentId(row.parentId?._id);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (row: Student) => {
      if (confirm("Delete this student?")) {
        deleteStudent([row._id]);
      }
    },
    [deleteStudent]
  );

  // ---------------- Excel Upload Handler ----------------
  const handleExcelUpload = useCallback(
    async (file: File, schoolId: string, branchId: string) => {
      try {
        const response = await excelFileUploadForStudent(
          file,
          schoolId,
          branchId
        );

        toast.success("Upload successful", {
          description: `${response.count || response.data?.count || 0
            } students imported successfully`,
        });

        // Close dialog and refresh data
        setShowUploadDialog(false);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          "Failed to upload file. Please try again.";

        toast.error("Upload failed", {
          description: errorMessage,
        });
        throw error;
      }
    },
    []
  );

  // -------------- Excel Export Handler ----------------
  const handleExcelExport = () => {
    exportExcel({
      search: filters.search,
      branchId: filters.branchId,
      schoolId: filters.schoolId,
      routeObjId: filters.routeObjId,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
    });
  };

  // ---------------- PDF Export Handler ----------------
  const handlePDFExport = () => {
    exportPdf({
      search: filters.search,
      branchId: filters.branchId,
      schoolId: filters.schoolId,
      sortBy: sorting[0]?.id,
      sortOrder: sorting[0]?.desc ? "desc" : "asc",
    });
  };

  // ---------------- Form Handlers ----------------

  const handleSchoolChange = useCallback((id?: string) => {
    setFormSchoolId(id);
  }, []);

  const handleBranchChange = useCallback((id?: string) => {
    setFormBranchId(id);
  }, []);

  const handleParentChange = useCallback((id?: string) => {
    setFormParentId(id);
  }, []);

  // ---------------- Table Columns ----------------
  const columns = useMemo(() => {
    const cols = [...getStudentColumns(handleEdit, handleDelete)];

    if (role === "superAdmin") {
      cols.splice(cols.length - 1, 0, {
        header: "Registration Status",
        cell: ({ row }) => {
          const { statusOfRegister, _id } = row.original;

          const StatusSegmentedControl = () => {
            const [status, setStatus] = useState(statusOfRegister);

            const handleStatusChange = (newStatus) => {
              setStatus(newStatus);
              approveStudent({
                id: _id,
                statusOfRegister: newStatus,
              });
            };

            const statuses = [
              {
                value: "registered",
                label: "Registered",
                color: "bg-green-100 text-green-700 border-green-300",
              },
              {
                value: "rejected",
                label: "Rejected",
                color: "bg-red-100 text-red-700 border-red-300",
              },
            ];

            return (
              <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
                {statuses.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => handleStatusChange(value)}
                    disabled={isApproveLoading}
                    className={`
                  px-3 py-1 text-xs font-medium rounded transition-all duration-200
                  ${status === value
                        ? color
                        : "bg-transparent text-gray-600 hover:bg-gray-100"
                      }
                  ${isApproveLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                      }
                `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            );
          };

          return <StatusSegmentedControl />;
        },
      });
    }
    return cols;
  }, [handleEdit, handleDelete, role, approveStudent, isApproveLoading]);

  // ---------------- Table ----------------
  const { table, tableElement, selectedRows } = CustomTableServerSidePagination(
    {
      data: students || [],
      columns,
      pagination,
      totalCount: total,
      loading: isLoading,
      onPaginationChange: setPagination,
      onSortingChange: setSorting,
      sorting,
      emptyMessage: "No students found",
      pageSizeOptions: [5, 10, 15, 20, 30, "All"],
      showSerialNumber: true,
      enableSorting: true,
      enableMultiSelect: true,
    }
  );

  // ---------------- Bulk Delete ----------------
  const selectedCount = selectedRows.length;

  const handleBulkDelete = useCallback(() => {
    if (!selectedCount) return;

    if (
      !confirm(
        `Delete ${selectedCount} student${selectedCount > 1 ? "s" : ""}?`
      )
    )
      return;

    deleteStudent(selectedRows);
    table?.resetRowSelection?.();
  }, [deleteStudent, selectedRows, table, selectedCount]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold mb-3">Students</h2>
        <div className="flex gap-3">
          {/* CLEAR FILTERS BUTTON */}
          <Button
            variant="outline"
            size="default"
            className={`cursor-pointer flex items-center gap-2 ${!hasActiveFilters ? "opacity-50 cursor-not-allowed" : ""
              }`}
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            <FilterX className="h-4 w-4" />
            Clear Filters
          </Button>
          <Button
            disabled={!selectedCount || isDeleteLoading}
            onClick={handleBulkDelete}
            variant={selectedCount ? "destructive" : "outline"}
            size="sm"
            className={`transition shrink-0 ${!selectedCount || isDeleteLoading
              ? "cursor-not-allowed"
              : "cursor-pointer"
              }`}
          >
            {isDeleteLoading ? "Deleting..." : `Delete (${selectedCount})`}
          </Button>

          {/* EXPORT BUTTON */}
          <div className="mr-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="cursor-pointer"
                  disabled={isExcelExporting || isPdfExporting}
                >
                  {isExcelExporting || isPdfExporting
                    ? "Exporting..."
                    : "Export"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleExcelExport}
                >
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handlePDFExport}
                >
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR - Now with wrapping */}
      <div className="flex flex-wrap items-center gap-3 my-3">
        {/* ROW 1: Search Bar */}
        <div className="flex gap-2 items-center">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by student name..."
            width="w-[220px]"
          />

          {/* Loading Indicator */}
          {isLoading && debouncedSearch && (
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Searching...
            </div>
          )}
        </div>

        <ColumnVisibilitySelector
          columns={table.getAllColumns()}
          buttonVariant="outline"
          buttonSize="default"
          className="cursor-pointer w-[140px]"
        />

        {/* ROW 2: Filters - will wrap to next line if needed */}
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-0">
          {/* SCHOOL FILTER */}
          {role === "superAdmin" && (
            <Combobox
              items={schoolItems}
              value={filterSchoolId}
              onValueChange={(val) => {
                setFilterSchoolId(val || undefined);
                setFilterBranchId(undefined);
                setFilterRouteId(undefined);
              }}
              placeholder="Filter School"
              searchPlaceholder="Search School..."
              className="cursor-pointer"
              width="w-[140px]"
              emptyMessage="No schools found"
            />
          )}

          {/* BRANCH FILTER */}
          {(role === "superAdmin" ||
            role === "school" ||
            role === "branchGroup") && (
              <Combobox
                items={filterBranchItems}
                value={filterBranchId}
                onValueChange={(val) => {
                  setFilterBranchId(val || undefined);
                  setFilterRouteId(undefined);
                }}
                placeholder="Filter Branch"
                searchPlaceholder="Search Branch..."
                className="cursor-pointer"
                width="w-[130px]"
                emptyMessage="No branches found"
                disabled={role === "superAdmin" && !filterSchoolId}
              />
            )}

          {/* ROUTE FILTER */}
          <Combobox
            items={routeItems}
            value={filterRouteId}
            onValueChange={(val) => setFilterRouteId(val || undefined)}
            placeholder="Filter Route"
            searchPlaceholder="Search Route..."
            className="cursor-pointer"
            width="w-[130px]"
            emptyMessage="No routes found"
            disabled={!filterBranchId}
          />

          {/* STATUS OF REGISTRATION FILTER */}
          <Combobox
            items={statusOfRegister}
            value={filterStatusOfRegistration}
            onValueChange={(val) =>
              setFilterStatusOfRegistration(val || undefined)
            }
            placeholder="Filter Status"
            searchPlaceholder="Search Status..."
            className="cursor-pointer"
            width="w-[120px]"
            emptyMessage="No status found"
          />
        </div>

        {/* ROW 3: Action Buttons - will wrap to next line if needed */}
        <div className="flex gap-3 items-center ml-auto">
          <Button
            onClick={() => setShowUploadDialog(true)}
            size="sm"
            variant="outline"
            className="cursor-pointer shrink-0 whitespace-nowrap gap-2"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>

          <Button
            onClick={() => {
              setEditStudent(null);
              setFormSchoolId(undefined);
              setFormBranchId(undefined);
              setFormParentId(undefined);
              setShowForm(true);
            }}
            size="sm"
            className="cursor-pointer shrink-0 whitespace-nowrap"
          >
            Add Student
          </Button>
        </div>
      </div>

      {/* RESULTS COUNT */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground mb-2">
          {total} student{total !== 1 ? "s" : ""} found
          {searchInput && ` matching "${searchInput}"`}
        </div>
      )}

      {/* TABLE */}
      <div className="flex-1 min-h-0 pb-3">{tableElement}</div>

      {/* ADD/EDIT STUDENT MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <AddStudentForm
            initialData={editStudent}
            onClose={closeModal}
            onSubmit={async (data) => {
              if (editStudent) {
                await updateStudentAsync({ id: editStudent._id, payload: data });
                closeModal();
              } else {
                createStudent(data);
              }
            }}
            decodedToken={decodedToken}
            schools={schools}
            branches={branches}
            selectedSchoolId={formSchoolId}
            selectedBranchId={formBranchId}
            selectedParentId={formParentId}
            onSchoolChange={handleSchoolChange}
            onBranchChange={handleBranchChange}
            onParentChange={handleParentChange}
          />
        </div>
      )}

      {/* EXCEL UPLOAD DIALOG */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <ExcelUploader
            schools={schools}
            branches={allBranches}
            onFileUpload={handleExcelUpload}
            role={role}
            tokenBranchGroupSchoolId={tokenBranchGroupSchoolId}
            tokenBranchId={tokenBranchId}
            tokenSchoolId={tokenSchoolId}
            csvContent={childCsvContent}
            requiredHeaders={requiredHeaders}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
