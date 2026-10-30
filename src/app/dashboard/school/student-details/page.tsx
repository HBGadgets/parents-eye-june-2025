
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
import type { ColumnDef, SortingState, PaginationState } from "@/components/ui/customTable(serverSidePagination)";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { TravelTable } from "@/components/travel-summary/TravelTable";
import { useExport } from "@/hooks/useExport";
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { Combobox } from "@/components/ui/combobox";
import {
  X,
  Upload,
  XCircle,
  Clock,
  CheckCircle,
  FilterX,
  ChevronDown,
  Check,
  Car,
  User,
} from "lucide-react";
import { FaPlus, FaMinus } from "react-icons/fa";
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
  const userChangedPageSizeRef = useRef(false);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  // Auto-calculate optimal pageSize based on measured container height
  useEffect(() => {
    const calculateOptimalSize = () => {
      let availableHeight = 0;
      if (tableWrapperRef.current && tableWrapperRef.current.clientHeight > 150) {
        // Table header is ~40px, pagination footer is ~48px, border is ~2px
        availableHeight = tableWrapperRef.current.clientHeight - 90;
      } else {
        // Fallback using viewport height
        availableHeight = window.innerHeight - 270;
      }
      const targetRowHeight = 40;
      return Math.max(5, Math.round(availableHeight / targetRowHeight));
    };

    const updateOptimalPageSize = () => {
      if (userChangedPageSizeRef.current) return;
      const optimalSize = calculateOptimalSize();
      setPagination((prev: PaginationState) => {
        if (prev.pageSize !== optimalSize) {
          return { ...prev, pageSize: optimalSize };
        }
        return prev;
      });
    };

    updateOptimalPageSize();
    const rafId = requestAnimationFrame(updateOptimalPageSize);

    let resizeObserver: ResizeObserver | null = null;
    if (tableWrapperRef.current && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateOptimalPageSize();
      });
      resizeObserver.observe(tableWrapperRef.current);
    }

    window.addEventListener("resize", updateOptimalPageSize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", updateOptimalPageSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []);

  const handlePaginationChange = useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination((prev: PaginationState) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (next.pageSize !== prev.pageSize) {
          userChangedPageSizeRef.current = true;
        }
        return next;
      });
    },
    []
  );

  const pageSizeOptions = useMemo(() => {
    const defaultOptions = [5, 10, 15, 20, 30, 50, 100, 200, 300, 400, 500];
    if (!defaultOptions.includes(pagination.pageSize)) {
      return [...defaultOptions, pagination.pageSize]
        .sort((a, b) => a - b)
        .concat("All" as any);
    }
    return [...defaultOptions, "All"];
  }, [pagination.pageSize]);

  // ---------------- View Mode State (Student Wise vs Vehicle Wise) ----------------
  const [viewMode, setViewMode] = useState<"student" | "vehicle">("student");

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
    setPagination((p: PaginationState) => ({ ...p, pageIndex: 0 }));
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
      Array.isArray(schools)
        ? schools.map((s: any) => ({
            label: s.schoolName!,
            value: s._id,
          }))
        : [],
    [schools]
  );

  const filterBranchItems = useMemo(
    () =>
      Array.isArray(filterBranches)
        ? filterBranches.map((b: any) => ({
            label: b.branchName!,
            value: b._id,
          }))
        : [],
    [filterBranches]
  );

  const routeItems = useMemo(
    () =>
      Array.isArray(routes)
        ? routes.map((r: any) => ({
            label: r.routeNumber,
            value: r._id,
          }))
        : [],
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
        setPagination((p: PaginationState) => ({ ...p, pageIndex: 0 }));
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
        cell: ({ row }: { row: any }) => {
          const { statusOfRegister, _id } = row.original;

          const StatusSegmentedControl = () => {
            const [status, setStatus] = useState(statusOfRegister);

            const handleStatusChange = (newStatus: any) => {
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
      data: (students || []) as unknown as Record<string, unknown>[],
      columns,
      pagination,
      totalCount: total,
      loading: isLoading,
      onPaginationChange: handlePaginationChange,
      onSortingChange: setSorting,
      sorting,
      emptyMessage: "No students found",
      pageSizeOptions,
      showSerialNumber: true,
      enableSorting: true,
      enableMultiSelect: true,
      enableVirtualization: false,
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

  // =========================================================================
  // VEHICLE-WISE STUDENTS IMPLEMENTATION
  // =========================================================================
  const { exportToPDF, exportToExcel } = useExport();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [vehiclePagination, setVehiclePagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [vehicleSorting, setVehicleSorting] = useState<SortingState>([]);

  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  }, []);

  // Reset vehicle pagination on filter changes
  useEffect(() => {
    if (viewMode === "vehicle") {
      setVehiclePagination((p: PaginationState) => ({ ...p, pageIndex: 0 }));
    }
  }, [debouncedSearch, filterSchoolId, filterBranchId, filterRouteId, viewMode]);

  // ---------------- Vehicle Wise API Query ----------------
  const {
    data: vehicleResponse,
    isLoading: isVehicleLoading,
    isFetching: isVehicleFetching,
  } = useQuery({
    queryKey: [
      "vehicle-wise-students",
      vehiclePagination,
      vehicleSorting,
      debouncedSearch,
      filterSchoolId,
      filterBranchId,
      filterRouteId,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (vehiclePagination.pageIndex + 1).toString(),
        limit: vehiclePagination.pageSize.toString(),
      });

      if (debouncedSearch?.trim()) {
        params.append("search", debouncedSearch.trim());
      }
      if (filterSchoolId) {
        params.append("schoolId", filterSchoolId);
      }
      if (filterBranchId) {
        params.append("branchId", filterBranchId);
      }
      if (filterRouteId) {
        params.append("routeObjId", filterRouteId);
      }
      if (vehicleSorting.length > 0) {
        params.append("sortBy", vehicleSorting[0].id);
        params.append("sortOrder", vehicleSorting[0].desc ? "desc" : "asc");
      }

      const response: any = await api.get(
        `/report/vehicle-wise-students?${params.toString()}`
      );

      let rawVehicles: any[] = [];
      if (response?.data) {
        if (Array.isArray(response.data)) {
          rawVehicles = response.data;
        } else if (typeof response.data === "object" && response.data !== null) {
          rawVehicles = Object.values(response.data);
        }
      } else if (Array.isArray(response)) {
        rawVehicles = response;
      }

      const validVehicles = rawVehicles.filter(
        (v) =>
          v &&
          typeof v === "object" &&
          (v.vehicleName ||
            v.deviceName ||
            v.deviceId ||
            v.uniqueId ||
            v.route ||
            Array.isArray(v.students))
      );

      const parsedVehicles = validVehicles.map((vehicle: any, index: number) => {
        const vName =
          vehicle.vehicleName?.trim() ||
          vehicle.deviceName?.trim() ||
          vehicle.name?.trim() ||
          "-";

        const rNumber =
          vehicle.route?.routeNumber ||
          vehicle.route?.routeName ||
          vehicle.routeNumber ||
          "-";

        let dName = "-";
        if (vehicle.driver) {
          if (typeof vehicle.driver === "object") {
            dName = vehicle.driver.driverName || vehicle.driver.name || "-";
          } else if (typeof vehicle.driver === "string") {
            dName = vehicle.driver;
          }
        }

        const rawStudentsList: any[] = Array.isArray(vehicle.students)
          ? vehicle.students
          : vehicle.students && typeof vehicle.students === "object"
          ? Object.values(vehicle.students)
          : [];

        const vSchool =
          vehicle.school?.schoolName ||
          vehicle.schoolName ||
          rawStudentsList[0]?.school?.schoolName ||
          "-";

        const vBranch =
          vehicle.branch?.branchName ||
          vehicle.branchName ||
          rawStudentsList[0]?.branch?.branchName ||
          "-";

        const students = rawStudentsList.map((student: any, sIdx: number) => {
          const studentName =
            student.childName ||
            student.studentName ||
            student.name ||
            student.parent?.parentName ||
            "-";

          const className = student.className
            ? `${student.className}${student.section ? ` - ${student.section}` : ""}`
            : student.section || "-";

          const rollNumber = student.rollNumber || "-";
          const gender = student.gender || "-";
          const parentName = student.parent?.parentName || "-";
          const contact =
            student.parent?.mobileNo ||
            student.mobileNo ||
            student.contact ||
            "-";

          const pickupAddress =
            (typeof student.pickupGeofence === "object"
              ? student.pickupGeofence?.name ||
                student.pickupGeofence?.address
              : student.pickupGeofence) ||
            "-";

          const dropAddress =
            (typeof student.dropGeofence === "object"
              ? student.dropGeofence?.name ||
                student.dropGeofence?.address
              : student.dropGeofence) ||
            "-";

          return {
            _id: student._id || `${vehicle.deviceId || vName}-${sIdx}`,
            studentName,
            className,
            rollNumber,
            gender,
            parentName,
            contact,
            pickupTime: student.pickupTime || "-",
            dropTime: student.dropTime || "-",
            pickupAddress,
            dropAddress,
            statusOfRegister: student.statusOfRegister || "registered",
          };
        });

        const totalStudents = vehicle.totalStudents ?? students.length;
        const vehicleId = vehicle.deviceId || vehicle._id || `${vName}-${index}`;

        return {
          id: `vehicle-${vehicleId}`,
          sn: index + 1 + vehiclePagination.pageIndex * vehiclePagination.pageSize,
          deviceId: vehicle.deviceId,
          vehicleName: vName,
          deviceName: vehicle.deviceName,
          uniqueId: vehicle.uniqueId,
          routeNumber: rNumber,
          driverName: dName,
          totalStudents,
          schoolName: vSchool,
          branchName: vBranch,
          students,
        };
      });

      const total =
        response?.total ??
        response?.totalCount ??
        response?.data?.total ??
        parsedVehicles.length;

      const totalPages =
        response?.totalPages ??
        response?.data?.totalPages ??
        (Math.ceil(total / vehiclePagination.pageSize) || 1);

      return {
        vehicles: parsedVehicles,
        total,
        totalPages,
      };
    },
    enabled: viewMode === "vehicle",
    placeholderData: keepPreviousData,
  });

  // ---------------- Nested Student Detail Columns in Vehicle Mode ----------------
  const vehicleNestedStudentColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "studentName",
        header: "Student Name",
        cell: ({ row }: any) => (
          <span className="font-semibold text-gray-900 whitespace-nowrap">
            {row.original.studentName}
          </span>
        ),
      },
      {
        accessorKey: "className",
        header: "Class & Sec",
        cell: ({ row }: any) => (
          <span className="whitespace-nowrap">{row.original.className || "-"}</span>
        ),
      },
      {
        accessorKey: "rollNumber",
        header: "Roll No",
        cell: ({ row }: any) => row.original.rollNumber || "-",
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ row }: any) => (
          <span className="capitalize">{row.original.gender || "-"}</span>
        ),
      },
      {
        accessorKey: "parentName",
        header: "Parent Name",
        cell: ({ row }: any) => (
          <span className="whitespace-nowrap">{row.original.parentName || "-"}</span>
        ),
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }: any) => (
          <span className="whitespace-nowrap">{row.original.contact || "-"}</span>
        ),
      },
      {
        accessorKey: "pickupAddress",
        header: "Pickup Location",
        cell: ({ row }: any) => (
          <span
            className="text-xs truncate max-w-[150px] inline-block"
            title={row.original.pickupAddress}
          >
            {row.original.pickupAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "pickupTime",
        header: "Pickup Time",
        cell: ({ row }: any) => (
          <span className="text-xs whitespace-nowrap font-medium text-gray-700">
            {row.original.pickupTime || "-"}
          </span>
        ),
      },
      {
        accessorKey: "dropAddress",
        header: "Drop Location",
        cell: ({ row }: any) => (
          <span
            className="text-xs truncate max-w-[150px] inline-block"
            title={row.original.dropAddress}
          >
            {row.original.dropAddress || "-"}
          </span>
        ),
      },
      {
        accessorKey: "dropTime",
        header: "Drop Time",
        cell: ({ row }: any) => (
          <span className="text-xs whitespace-nowrap font-medium text-gray-700">
            {row.original.dropTime || "-"}
          </span>
        ),
      },
      {
        accessorKey: "statusOfRegister",
        header: "Status",
        cell: ({ row }: any) => {
          const status = row.original.statusOfRegister || "registered";
          const color =
            status === "registered"
              ? "bg-green-100 text-green-700 border-green-200"
              : status === "rejected"
              ? "bg-red-100 text-red-700 border-red-200"
              : "bg-yellow-100 text-yellow-700 border-yellow-200";
          return (
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${color}`}
            >
              {status}
            </span>
          );
        },
      },
    ],
    []
  );

  // ---------------- Master Vehicle Columns ----------------
  const vehicleColumns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "sn",
        header: "SN",
        size: 50,
        cell: ({ row }: any) => {
          if (row.original.isDetailTable || row.original.isEmpty) return null;
          return row.original.sn;
        },
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "vehicleNumber",
        accessorKey: "vehicleName",
        header: "Vehicle Number",
        size: 220,
        cell: ({ row }: any) => {
          if (row.original.isDetailTable && row.original.detailData) {
            return (
              <div className="col-span-full w-full">
                <div className="w-full bg-gray-50 rounded-lg p-4 my-2 border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      Students ({row.original.detailData.length})
                    </span>
                  </div>
                  <TravelTable
                    columns={vehicleNestedStudentColumns}
                    data={row.original.detailData}
                    totalCount={row.original.detailData.length}
                  />
                </div>
              </div>
            );
          }

          if (row.original.isEmpty) {
            return (
              <div className="col-span-full w-full">
                <div className="w-full bg-gray-50 rounded-lg p-4 my-2 border border-gray-200 text-center text-sm text-gray-500">
                  No students assigned to this vehicle
                </div>
              </div>
            );
          }

          const isExpanded = expandedRows.has(row.original.id);
          const studentCount =
            row.original.students?.length ?? row.original.totalStudents ?? 0;

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRowExpansion(row.original.id);
                }}
                className={`p-1 rounded transition-colors ${
                  studentCount === 0
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:text-black hover:bg-gray-100 cursor-pointer"
                }`}
                title={isExpanded ? "Collapse students" : "Expand students"}
              >
                {isExpanded ? (
                  <FaMinus className="h-3 w-3" />
                ) : (
                  <FaPlus className="h-3 w-3" />
                )}
              </button>
              <span className="font-semibold text-gray-900">
                {row.original.vehicleName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "routeNumber",
        header: "Route",
        cell: ({ row }: any) =>
          row.original.isDetailTable || row.original.isEmpty
            ? null
            : row.original.routeNumber || "-",
      },
      ...(role === "superAdmin"
        ? [
            {
              accessorKey: "schoolName",
              header: "School",
              cell: ({ row }: any) =>
                row.original.isDetailTable || row.original.isEmpty
                  ? null
                  : row.original.schoolName || "-",
            },
          ]
        : []),
      {
        accessorKey: "branchName",
        header: "Branch",
        cell: ({ row }: any) =>
          row.original.isDetailTable || row.original.isEmpty
            ? null
            : row.original.branchName || "-",
      },
      {
        accessorKey: "totalStudents",
        header: "Total Students",
        cell: ({ row }: any) => {
          if (row.original.isDetailTable || row.original.isEmpty) return null;
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {row.original.totalStudents ?? 0}
            </span>
          );
        },
      },
    ],
    [expandedRows, toggleRowExpansion, role, vehicleNestedStudentColumns]
  );

  // ---------------- Flattened Vehicle Expanded Data ----------------
  const vehicleExpandedDataArray = useMemo(() => {
    const list = vehicleResponse?.vehicles || [];
    const result: any[] = [];
    list.forEach((vehicleRow: any) => {
      result.push(vehicleRow);

      if (expandedRows.has(vehicleRow.id)) {
        if (vehicleRow.students && vehicleRow.students.length > 0) {
          result.push({
            ...vehicleRow,
            id: `${vehicleRow.id}-details`,
            isDetailTable: true,
            detailData: vehicleRow.students,
          });
        } else {
          result.push({
            ...vehicleRow,
            id: `${vehicleRow.id}-empty`,
            isEmpty: true,
          });
        }
      }
    });
    return result;
  }, [vehicleResponse?.vehicles, expandedRows]);

  // ---------------- Vehicle Table Setup ----------------
  const { table: vehicleTable, tableElement: vehicleTableElement } =
    CustomTableServerSidePagination({
      data: vehicleExpandedDataArray,
      columns: vehicleColumns,
      pagination: vehiclePagination,
      totalCount: vehicleResponse?.total || 0,
      loading: isVehicleLoading || isVehicleFetching,
      onPaginationChange: setVehiclePagination,
      onSortingChange: setVehicleSorting,
      sorting: vehicleSorting,
      emptyMessage: "No vehicles found",
      pageSizeOptions: [5, 10, 15, 20, 30, 50, 100, "All"],
      showSerialNumber: false,
      enableSorting: true,
      enableMultiSelect: false,
      enableVirtualization: false,
    });

  // ---------------- Vehicle Export Handlers ----------------
  const handleVehicleExcelExport = () => {
    const vList = vehicleResponse?.vehicles || [];
    const exportCols = [
      { key: "sn", header: "S.No." },
      { key: "vehicleName", header: "Vehicle Number" },
      { key: "routeNumber", header: "Route" },
      ...(role === "superAdmin" ? [{ key: "schoolName", header: "School" }] : []),
      { key: "branchName", header: "Branch" },
      { key: "totalStudents", header: "Total Students" },
    ];
    const nestedExportCols = [
      { key: "studentName", header: "Student Name" },
      { key: "className", header: "Class & Sec" },
      { key: "rollNumber", header: "Roll No." },
      { key: "gender", header: "Gender" },
      { key: "parentName", header: "Parent Name" },
      { key: "contact", header: "Contact" },
      { key: "pickupAddress", header: "Pickup Location" },
      { key: "pickupTime", header: "Pickup Time" },
      { key: "dropAddress", header: "Drop Location" },
      { key: "dropTime", header: "Drop Time" },
      { key: "statusOfRegister", header: "Status" },
    ];

    exportToExcel(vList, exportCols, {
      filename: "vehicle_wise_students",
      title: "Vehicle Wise Students Report",
      nestedTable: {
        dataKey: "students",
        columns: nestedExportCols,
        title: "Students",
      },
    });
  };

  const handleVehiclePDFExport = () => {
    const vList = vehicleResponse?.vehicles || [];
    const exportCols = [
      { key: "sn", header: "S.No." },
      { key: "vehicleName", header: "Vehicle Number" },
      { key: "routeNumber", header: "Route" },
      ...(role === "superAdmin" ? [{ key: "schoolName", header: "School" }] : []),
      { key: "branchName", header: "Branch" },
      { key: "totalStudents", header: "Total Students" },
    ];
    const nestedExportCols = [
      { key: "studentName", header: "Student Name" },
      { key: "className", header: "Class & Sec" },
      { key: "rollNumber", header: "Roll No." },
      { key: "gender", header: "Gender" },
      { key: "parentName", header: "Parent Name" },
      { key: "contact", header: "Contact" },
      { key: "pickupAddress", header: "Pickup Location" },
      { key: "pickupTime", header: "Pickup Time" },
      { key: "dropAddress", header: "Drop Location" },
      { key: "dropTime", header: "Drop Time" },
      { key: "statusOfRegister", header: "Status" },
    ];

    exportToPDF(vList, exportCols, {
      filename: "vehicle_wise_students",
      title: "Vehicle Wise Students Report",
      nestedTable: {
        dataKey: "students",
        columns: nestedExportCols,
        title: "Students",
      },
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 mb-3">
          {/* Dropdown Menu on Click */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-primary transition-colors cursor-pointer group focus:outline-none"
                title="Click to switch view mode"
              >
                <span>
                  {viewMode === "vehicle" ? "Vehicle Wise Students" : "Students"}
                </span>
                <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-primary transition-transform duration-200" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem
                className={`cursor-pointer flex items-center justify-between py-2 ${
                  viewMode === "student" ? "font-semibold bg-gray-100" : ""
                }`}
                onClick={() => setViewMode("student")}
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span>Student Wise</span>
                </div>
                {viewMode === "student" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`cursor-pointer flex items-center justify-between py-2 ${
                  viewMode === "vehicle" ? "font-semibold bg-gray-100" : ""
                }`}
                onClick={() => setViewMode("vehicle")}
              >
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-gray-600" />
                  <span>Vehicle Wise</span>
                </div>
                {viewMode === "vehicle" && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
            disabled={!selectedCount || isDeleteLoading || viewMode === "vehicle"}
            onClick={handleBulkDelete}
            variant={selectedCount ? "destructive" : "outline"}
            size="sm"
            className={`transition shrink-0 ${!selectedCount || isDeleteLoading || viewMode === "vehicle"
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
                  onClick={
                    viewMode === "vehicle"
                      ? handleVehicleExcelExport
                      : handleExcelExport
                  }
                >
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={
                    viewMode === "vehicle"
                      ? handleVehiclePDFExport
                      : handlePDFExport
                  }
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
            placeholder={
              viewMode === "vehicle"
                ? "Search vehicle or student..."
                : "Search by student name..."
            }
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
          columns={
            viewMode === "vehicle"
              ? vehicleTable.getAllColumns()
              : table.getAllColumns()
          }
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

          {role === "superAdmin" && (
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
          )}
        </div>
      </div>

      {/* RESULTS COUNT */}
      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground mb-2">
          {viewMode === "vehicle"
            ? `${vehicleResponse?.total || 0} vehicle${
                (vehicleResponse?.total || 0) !== 1 ? "s" : ""
              } found`
            : `${total} student${total !== 1 ? "s" : ""} found`}
          {searchInput && ` matching "${searchInput}"`}
        </div>
      )}

      {/* TABLE */}
      <div ref={tableWrapperRef} className="flex-1 min-h-0 flex flex-col">
        {viewMode === "vehicle" ? vehicleTableElement : tableElement}
      </div>

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
