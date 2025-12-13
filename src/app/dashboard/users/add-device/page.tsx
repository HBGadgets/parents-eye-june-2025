"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDeviceColumns } from "@/components/columns/columns";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { useAddDeviceNew } from "@/hooks/device/useAddDevice(new)";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { Combobox } from "@/components/ui/combobox";
import { Upload, X } from "lucide-react";
import {
  useBranchDropdown,
  useSchoolDropdown,
  useRouteDropdown,
} from "@/hooks/useDropdown";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { AddDeviceForm } from "@/components/Device/add-device-form";
import { deleteDeviceOld } from "@/hooks/device/useAddDevice(old)";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExcelUploader } from "@/components/excel-uploader/ExcelUploader";
import { toast } from "sonner";
import { excelFileUploadForDevice } from "@/services/fileUploadService";
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

const DevicesPage = () => {
  const requiredHeaders = [
    "name",
    "uniqueId",
    "sim",
    "speed",
    "average",
    "model",
    "category",
  ];
  const childCsvContent =
    "name,uniqueId,sim,speed,average,model,category\n" +
    "MH00B0000,1234567890123,12345678901,80,12,AIS-140,School Bus\n";
  // ---------------- Dialog State ----------------
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<any>(null);

  // ---------------- Pagination & Sorting ----------------
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ---------------- Search State ----------------
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // ---------------- Excel Upload State ----------------
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // ---------------- All Branches for Upload (no filter) ----------------
  const { data: allBranches = [] } = useBranchDropdown();

  // ---------------- Filter State ----------------
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();
  const [filterRouteId, setFilterRouteId] = useState<string>();

  // ---------------- Lazy Loading States ----------------
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);
  const [shouldFetchRoutes, setShouldFetchRoutes] = useState(false);

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

  // ---------------- Apply Role Filters & Auto-fetch ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
      setShouldFetchRoutes(true);
    }
    // 🔥 FIX: Enable branch fetching for branchGroup role
    if (role === "branchGroup") {
      setShouldFetchBranches(true);
    }
  }, [role, tokenSchoolId, tokenBranchId]);

  // ---------------- Reset Dependent Filters ----------------
  useEffect(() => {
    if (!filterSchoolId && role === "superAdmin") {
      setFilterBranchId(undefined);
      setFilterRouteId(undefined);
      setShouldFetchBranches(false);
    }
  }, [filterSchoolId, role]);

  useEffect(() => {
    if (!filterBranchId) {
      setFilterRouteId(undefined);
      setShouldFetchRoutes(false);
    }
  }, [filterBranchId]);

  // ---------------- Lazy Dropdown Queries ----------------
  const { data: schools = [], isLoading: schoolsLoading } =
    useSchoolDropdown(shouldFetchSchools);

  const { data: branches = [], isLoading: branchesLoading } = useBranchDropdown(
    filterSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  const { data: routes = [], isLoading: routesLoading } = useRouteDropdown(
    filterBranchId,
    shouldFetchRoutes
  );

  // ---------------- Dropdown Items ----------------
  const schoolItems = useMemo(
    () =>
      schools.map((s) => ({
        label: s.schoolName!,
        value: s._id,
      })),
    [schools]
  );

  const branchItems = useMemo(
    () =>
      branches.map((b) => ({
        label: b.branchName!,
        value: b._id,
      })),
    [branches]
  );

  const routeItems = useMemo(
    () =>
      routes.map((r: any) => ({
        label: r.routeNumber,
        value: r._id,
      })),
    [routes]
  );

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
      routeObjId: filterRouteId,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId, filterRouteId]
  );

  // ---------------- Reset Pagination When Filters Change ----------------
  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [filters.search, filters.schoolId, filters.branchId, filters.routeObjId]);

  // ---------------- API Call ----------------
  const {
    devices,
    total,
    isLoading,
    deleteDevice,
    exportExcel,
    exportPdf,
    isPdfExporting,
    isExcelExporting,
  } = useAddDeviceNew(pagination, sorting, filters);

  // ---------------- Handlers ----------------
  const handleEdit = useCallback((row: any) => {
    console.log("Edit device:", row);
    setEditDevice(row);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (row: any) => {
      try {
        if (!confirm("Delete this device?")) return;
        console.log("row.deviceId: ", row);

        await deleteDeviceOld(row.deviceId);

        deleteDevice(row._id);
      } catch (err: any) {
        console.error("Delete error:", err.message);
        alert(err.message);
      }
    },
    [deleteDevice]
  );

  // ---------------- Excel Upload Handler ----------------
  const handleExcelUpload = useCallback(
    async (file: File, schoolId: string, branchId: string) => {
      try {
        const response = await excelFileUploadForDevice(
          file,
          schoolId,
          branchId
        );

        toast.success("Upload successful", {
          description: `${
            response.count || response.data?.count || 0
          } devices imported`,
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

  const handleAddDevice = useCallback(() => {
    setEditDevice(null);
    setIsDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Reset edit device after dialog closes
      setTimeout(() => setEditDevice(null), 200);
    }
  }, []);

  // ---------------- Clear Filters ----------------
  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    if (role === "superAdmin") {
      setFilterSchoolId(undefined);
      setShouldFetchBranches(false);
    }
    if (role === "superAdmin" || role === "school" || role === "branchGroup") {
      setFilterBranchId(undefined);
      setShouldFetchRoutes(false);
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

  // ---------------- Table Columns ----------------
  const columns = useMemo(() => {
    const base = getDeviceColumns(handleEdit, handleDelete);

    if (role === "superAdmin") {
      base.push({
        header: "Action",
        cell: ({ row }) => {
          const data = row.original;
          return (
            <div className="flex justify-center gap-2">
              <button
                className="bg-yellow-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(data);
                }}
              >
                Edit
              </button>

              <button
                className="bg-red-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(data);
                }}
              >
                Delete
              </button>
            </div>
          );
        },
        enableSorting: false,
      });
    }

    return base;
  }, [handleEdit, handleDelete, role]);

  // ---------------- Table ----------------
  const { table, tableElement } = CustomTableServerSidePagination({
    data: devices || [],
    columns,
    pagination,
    totalCount: total,
    loading: isLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No devices found",
    pageSizeOptions: [5, 10, 15, 20, 30, 50, 100, 200, 300, 400, 500],
    showSerialNumber: true,
    enableSorting: true,
    enableMultiSelect: false,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold mb-3">Devices</h2>
        <div className="mr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="cursor-pointer"
                disabled={isExcelExporting || isPdfExporting}
              >
                {isExcelExporting || isPdfExporting ? "Exporting..." : "Export"}
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

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-wrap items-center gap-3 my-3">
        {/* Search Bar */}
        <div className="flex gap-2 items-center">
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search devices..."
            width="w-[280px]"
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
          className="cursor-pointer"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center flex-1 min-w-0">
          {/* SCHOOL FILTER (SuperAdmin only) */}
          {role === "superAdmin" && (
            <Combobox
              items={schoolItems}
              value={filterSchoolId}
              onValueChange={(val) => {
                setFilterSchoolId(val || undefined);
                setFilterBranchId(undefined);
                setFilterRouteId(undefined);
                if (val) {
                  setShouldFetchBranches(true);
                }
              }}
              onOpenChange={(open) => {
                if (open && !shouldFetchSchools) {
                  setShouldFetchSchools(true);
                }
              }}
              placeholder="Filter School"
              searchPlaceholder="Search School..."
              className="cursor-pointer"
              width="w-[150px]"
              emptyMessage={schoolsLoading ? "Loading..." : "No schools found"}
            />
          )}

          {/* BRANCH FILTER */}
          {(role === "superAdmin" ||
            role === "school" ||
            role === "branchGroup") && (
            <Combobox
              items={branchItems}
              value={filterBranchId}
              onValueChange={(val) => {
                setFilterBranchId(val || undefined);
                setFilterRouteId(undefined);
                if (val) {
                  setShouldFetchRoutes(true);
                }
              }}
              onOpenChange={(open) => {
                if (open && !shouldFetchBranches && filterSchoolId) {
                  setShouldFetchBranches(true);
                }
              }}
              placeholder="Filter Branch"
              searchPlaceholder="Search Branch..."
              className="cursor-pointer"
              width="w-[150px]"
              emptyMessage={
                branchesLoading ? "Loading..." : "No branches found"
              }
              disabled={role === "superAdmin" && !filterSchoolId}
            />
          )}

          {/* ROUTE FILTER */}
          <Combobox
            items={routeItems}
            value={filterRouteId}
            onValueChange={(val) => setFilterRouteId(val || undefined)}
            onOpenChange={(open) => {
              if (open && !shouldFetchRoutes && filterBranchId) {
                setShouldFetchRoutes(true);
              }
            }}
            placeholder="Filter Route"
            searchPlaceholder="Search Route..."
            className="cursor-pointer"
            width="w-[150px]"
            emptyMessage={routesLoading ? "Loading..." : "No routes found"}
            disabled={!filterBranchId}
          />

          {/* CLEAR FILTERS BUTTON */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="gap-2 shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" color="red" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        {role === "superAdmin" && (
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
              onClick={handleAddDevice}
              size="sm"
              className="cursor-pointer shrink-0 whitespace-nowrap"
            >
              Add Device
            </Button>
          </div>
        )}
      </div>

      {/* RESULTS COUNT */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground mb-2">
          {total} device{total !== 1 ? "s" : ""} found
          {searchInput && ` matching "${searchInput}"`}
        </div>
      )}

      {/* TABLE */}
      <div className="flex-1 min-h-0 pb-3">{tableElement}</div>

      {/* ADD/EDIT DEVICE DIALOG */}
      <AddDeviceForm
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        editData={editDevice}
        pagination={pagination}
        sorting={sorting}
        filters={filters}
      />
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
};

export default DevicesPage;
