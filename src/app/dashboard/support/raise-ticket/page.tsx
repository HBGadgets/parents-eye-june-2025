"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DynamicEditDialog, FieldConfig } from "@/components/ui/EditModal";
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { SearchableSelect } from "@/components/custom-select";
import {
  VisibilityState,
  type ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import { Alert } from "@/components/Alert";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";

// --------------------------- INTERFACES ---------------------------
interface Ticket {
  _id: string;
  ticketId: string;
  raisedBy: string;
  email: string;
  type: string;
  company: string;
  branch: string;
  role: string;
  description: string;
  feedback?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  schoolId?: {
    _id: string;
    schoolName: string;
  };
  branchId?: {
    _id: string;
    branchName: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface selectOption {
  label: string;
  value: string;
}

// --------------------------- COMPONENT ---------------------------
export default function RaiseTicketMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Table states
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const [filteredData, setFilteredData] = useState<Ticket[]>([]);
  const [filterResults, setFilterResults] = useState<Ticket[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [school, setSchool] = useState<string | undefined>(undefined);
  const [branch, setBranch] = useState<string | undefined>(undefined);

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  const { exportToPDF, exportToExcel } = useExport();

  // --------------------------- DATA FETCH ---------------------------
  const { data: ticketsData, isLoading, isFetching } = useQuery({
    queryKey: ["tickets", pagination, sorting, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      const response = await api.get(`/tickets?${params}`);
      return response;
    },
  });

  useEffect(() => {
    if (ticketsData?.data) {
      setFilteredData(ticketsData.data);
      setFilterResults(ticketsData.data);
    }
  }, [ticketsData?.data]);

  // --------------------------- DROPDOWNS ---------------------------
  const schoolOptions: selectOption[] = schoolData
    ? schoolData.map((s) => ({ label: s.schoolName, value: s._id }))
    : [];

  const filteredBranchOptions = useMemo(() => {
    if (!school || !branchData) return [];
    return branchData
      .filter((b) => b.schoolId?._id === school)
      .map((b) => ({ label: b.branchName, value: b._id }));
  }, [school, branchData]);

  const ticketTypeOptions: selectOption[] = [
    { label: "Technical Issue", value: "Technical Issue" },
    { label: "Feature Request", value: "Feature Request" },
    { label: "Bug Report", value: "Bug Report" },
    { label: "General Inquiry", value: "General Inquiry" },
    { label: "Account Issue", value: "Account Issue" },
    { label: "Other", value: "Other" },
  ];

  const roleOptions: selectOption[] = [
    { label: "Admin", value: "Admin" },
    { label: "Teacher", value: "Teacher" },
    { label: "Parent", value: "Parent" },
    { label: "Student", value: "Student" },
    { label: "Staff", value: "Staff" },
  ];

  const statusOptions: selectOption[] = [
    { label: "Open", value: "Open" },
    { label: "In Progress", value: "In Progress" },
    { label: "Resolved", value: "Resolved" },
    { label: "Closed", value: "Closed" },
  ];

  // --------------------------- MUTATION ---------------------------
  const addTicketMutation = useMutation({
    mutationFn: async (newTicket: any) => {
      const res = await api.post("/ticket", newTicket);
      return res.ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      alert("Ticket raised successfully.");
    },
    onError: (err) => {
      alert("Failed to raise ticket.\nerror: " + err);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!school) return alert("Please select a school");
    if (!branch) return alert("Please select a branch");

    const data = {
      ticketId: `TKT-${Date.now()}`,
      raisedBy: formData.get("raisedBy") as string,
      email: formData.get("email") as string,
      type: formData.get("type") as string,
      company: schoolOptions.find((s) => s.value === school)?.label || "",
      branch: filteredBranchOptions.find((b) => b.value === branch)?.label || "",
      role: formData.get("role") as string,
      description: formData.get("description") as string,
      schoolId: school,
      branchId: branch,
      status: "Open" as const,
    };

    try {
      await addTicketMutation.mutateAsync(data);
      closeButtonRef.current?.click();
      form.reset();
      setSchool(undefined);
      setBranch(undefined);
    } catch {}
  };

  // --------------------------- TABLE COLUMNS ---------------------------
  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      { accessorKey: "ticketId", header: "Ticket ID" },
      { accessorKey: "raisedBy", header: "Raised By" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "type", header: "Type" },
      { accessorKey: "company", header: "Company" },
      { accessorKey: "branch", header: "Branch" },
      { accessorKey: "role", header: "Role" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "createdAt", header: "Created At" },
    ],
    []
  );

  // --------------------------- EDIT MODAL ---------------------------
  const editFields: FieldConfig[] = [
    { name: "status", label: "Status", type: "select", options: statusOptions },
    { name: "feedback", label: "Feedback", type: "text" },
  ];

  // --------------------------- TABLE SETUP ---------------------------
  const { table, tableElement } = CustomTableServerSidePagination({
    data: filteredData || [],
    columns,
    pagination,
    totalCount: ticketsData?.total || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No tickets found",
    pageSizeOptions: [5, 10, 20, 30, 50],
    enableSorting: true,
    showSerialNumber: true,
  });

  // --------------------------- RENDER ---------------------------
  return (
    <main>
      <ResponseLoader isLoading={isLoading || isFetching} />

      <header className="flex items-center justify-between mb-4">
        <section className="flex space-x-4">
          <SearchComponent
            data={filterResults}
            displayKey={[
              "ticketId",
              "raisedBy",
              "email",
              "type",
              "company",
              "branch",
              "role",
              "status",
            ]}
            onResults={setFilteredData}
            className="w-[300px] mb-4"
          />
          <DateRangeFilter
            onDateRangeChange={(s, e) => setDateRange({ start: s, end: e })}
            title="Search by Added Date"
          />
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
            buttonSize="default"
          />
        </section>

        <section>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">Raise Ticket</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Raise New Ticket</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="raisedBy">Raised By</Label>
                    <Input id="raisedBy" name="raisedBy" placeholder="Your name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="Email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label>School</Label>
                    <SearchableSelect
                      options={schoolOptions}
                      value={school}
                      onValueChange={setSchool}
                      placeholder="Select school"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Branch</Label>
                    <SearchableSelect
                      options={filteredBranchOptions}
                      value={branch}
                      onValueChange={setBranch}
                      placeholder="Select branch"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Type</Label>
                    <SearchableSelect
                      options={ticketTypeOptions}
                      placeholder="Select ticket type"
                      name="type"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <SearchableSelect
                      options={roleOptions}
                      placeholder="Select your role"
                      name="role"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>Description</Label>
                    <textarea
                      name="description"
                      placeholder="Describe your issue"
                      rows={4}
                      required
                      className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button ref={closeButtonRef} variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={addTicketMutation.isPending}>
                    {addTicketMutation.isPending ? "Submitting..." : "Submit Ticket"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      <section className="mb-4">{tableElement}</section>

      <DynamicEditDialog
        open={editDialogOpen}
        setOpen={setEditDialogOpen}
        initialData={null}
        endpoint="/ticket"
        idField="_id"
        fields={editFields}
      />

      <FloatingMenu />
    </main>
  );
}
