"use client";

import { getCustomNotificationColumns } from "@/components/columns/columns";
import { useDebounce } from "@/hooks/useDebounce";
import { useCustomNotification } from "@/hooks/useCustomNotification";
import { useBranchDropdown, useSchoolDropdown } from "@/hooks/useDropdown";
import { SortingState, PaginationState } from "@tanstack/react-table";
import { jwtDecode } from "jwt-decode";
import Cookies from "js-cookie";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { SearchBar } from "@/components/search-bar/SearchBarPagination";
import { Button } from "@/components/ui/button";
import { FilterX, Send } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AddCustomNotificationForm from "@/components/custom-notification/AddCustomNotificationForm";

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
};

export default function CustomNotificationPage() {
  const [showForm, setShowForm] = useState(false);

  // ---------------- Pagination & Sorting ----------------
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  // ---------------- Search State ----------------
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 500);

  // ---------------- Filter State ----------------
  const [filterSchoolId, setFilterSchoolId] = useState<string>();
  const [filterBranchId, setFilterBranchId] = useState<string>();

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  // ---------------- Lazy Loading States ----------------
  const [shouldFetchSchools, setShouldFetchSchools] = useState(false);
  const [shouldFetchBranches, setShouldFetchBranches] = useState(false);

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

  // ---------------- Apply Role Filters & Auto-fetch ----------------
  useEffect(() => {
    if (role === "school" && tokenSchoolId) {
      setFilterSchoolId(tokenSchoolId);
      setShouldFetchBranches(true);
    }
    if (role === "branch" && tokenBranchId) {
      setFilterBranchId(tokenBranchId);
    }
    if (role === "branchGroup") {
      setShouldFetchBranches(true);
    }
  }, [role, tokenSchoolId, tokenBranchId]);

  // ---------------- Lazy Dropdown Queries ----------------
  const { data: schools = [], isLoading: schoolsLoading } =
    useSchoolDropdown(shouldFetchSchools);

  const { data: branches = [], isLoading: branchesLoading } = useBranchDropdown(
    filterSchoolId,
    shouldFetchBranches,
    role === "branchGroup"
  );

  const schoolItems = useMemo(
    () => (schools as any[]).map((s) => ({ label: s.schoolName!, value: s._id })),
    [schools]
  );

  const branchItems = useMemo(
    () => (branches as any[]).map((b) => ({ label: b.branchName!, value: b._id })),
    [branches]
  );

  // ---------------- API Filters ----------------
  const filters: Filters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      schoolId: filterSchoolId,
      branchId: filterBranchId,
    }),
    [debouncedSearch, filterSchoolId, filterBranchId]
  );

  const {
    messages,
    total,
    isLoading: isMessagesLoading,
    sendCustomMessage,
    isSending,
  } = useCustomNotification(pagination, sorting, filters);

  const handleFormSubmit = useCallback(
    async (formData: FormData) => {
      sendCustomMessage(formData);
      setShowForm(false);
    },
    [sendCustomMessage]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    if (role === "superAdmin") {
      setFilterSchoolId(undefined);
      setShouldFetchBranches(false);
    }
    if (role === "superAdmin" || role === "school" || role === "branchGroup") {
      setFilterBranchId(undefined);
    }
  }, [role]);

  const hasActiveFilters = useMemo(() => {
    return (
      searchInput !== "" ||
      (role === "superAdmin" && filterSchoolId !== undefined) ||
      ((role === "superAdmin" || role === "school" || role === "branchGroup") &&
        filterBranchId !== undefined)
    );
  }, [searchInput, filterSchoolId, filterBranchId, role]);

  // ---------------- Table columns ----------------
  const columns = useMemo(() => getCustomNotificationColumns(), []);

  // ---------------- Table ----------------
  const { tableElement } = CustomTableServerSidePagination({
    data: messages || [],
    columns,
    pagination,
    totalCount: total,
    loading: isMessagesLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No notifications found",
    manualPagination: true,
    showSerialNumber: true,
    enableSorting: true,
  });

  return (
    <div className="flex flex-col h-full p-4">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>
           <h2 className="text-2xl font-bold">Custom Notifications</h2>
           <p className="text-sm text-muted-foreground">Manage and track custom messages sent to routes</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          disabled={!hasActiveFilters}
          className="cursor-pointer flex items-center gap-2"
        >
          <FilterX className="h-4 w-4" />
          Clear Filters
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search notifications..."
            width="w-[280px]"
          />

          {/* School Filter */}
          {role === "superAdmin" && (
            <Combobox
              items={schoolItems}
              value={filterSchoolId}
              onValueChange={(val) => {
                setFilterSchoolId(val);
                if (val) setShouldFetchBranches(true);
              }}
              placeholder="Select School"
              open={schoolOpen}
              onOpenChange={(op) => {
                setSchoolOpen(op);
                if (op) setShouldFetchSchools(true);
              }}
              width="w-[180px]"
            />
          )}

          {/* Branch Filter */}
          {(role === "superAdmin" || role === "school" || role === "branchGroup") && (
            <Combobox
              items={branchItems}
              value={filterBranchId}
              onValueChange={setFilterBranchId}
              placeholder="Select Branch"
              disabled={role === "superAdmin" && !filterSchoolId}
              open={branchOpen}
              onOpenChange={(op) => {
                setBranchOpen(op);
                if (op && role !== "school") setShouldFetchBranches(true);
              }}
              width="w-[180px]"
            />
          )}
        </div>

        <Button onClick={() => setShowForm(true)} className="cursor-pointer gap-2">
          <Send className="h-4 w-4" />
          Send Notification
        </Button>
      </div>

      {/* TABLE */}
      <div className="flex-1 min-h-0 bg-white overflow-hidden">
        {tableElement}
      </div>

      {/* DIALOG FORM */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="p-0 max-w-[600px] w-full">
            <AddCustomNotificationForm
              onSubmit={handleFormSubmit}
              onClose={() => setShowForm(false)}
              isSending={isSending}
              decodedToken={decodedToken}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}