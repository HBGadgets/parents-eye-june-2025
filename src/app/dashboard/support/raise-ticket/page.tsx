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
import SearchComponent from "@/components/ui/SearchOnlydata";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import {
  VisibilityState,
  type ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import { useExport } from "@/hooks/useExport";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --------------------------- INTERFACES ---------------------------
interface Ticket {
  _id: string;
  ticket_id: string;
  raised_by: {
    userId: string;
    userModel: string;
  };
  email: string;
  type: { _id: string; name: string };
  schoolId: { _id: string; schoolName: string };
  branchId: { _id: string; branchName: string };
  role: string;
  description: string;
  feedback?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  added_date: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketType {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// --------------------------- COMPONENT ---------------------------
export default function RaiseTicketMaster() {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Table states
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusValue, setStatusValue] = useState("");

  const [filteredData, setFilteredData] = useState<Ticket[]>([]);
  const [filterResults, setFilterResults] = useState<Ticket[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<
    "All" | "Open" | "In Progress" | "Resolved"
  >("All");

  // Form states
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");

  const { exportToPDF, exportToExcel } = useExport();
  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();

  // --------------------------- TICKET TYPES API ---------------------------
  const {
    data: ticketTypesData,
    isLoading: isLoadingTicketTypes,
    refetch: refetchTicketTypes,
  } = useQuery({
    queryKey: ["ticketTypes"],
    queryFn: async () => {
      try {
        const response = await api.get("/get-ticket-types");
        console.log("Ticket Types API Response:", response);
        // Based on your API response, it returns a direct array
        return Array.isArray(response)
          ? response
          : response.data || response.types || [];
      } catch (error) {
        console.error("Error fetching ticket types:", error);
        return [];
      }
    },
  });

  // --------------------------- FETCH TICKETS DATA ---------------------------
  const {
    data: ticketsData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["tickets", pagination, sorting, globalFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      const response = await api.get(`/get-tickets?${params}`);
      return response;
    },
  });

  // --------------------------- LOAD USER INFO ---------------------------
  const getUserInfo = () => {
    if (typeof window === "undefined") return null;
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        return {
          email: user.email || "user@example.com",
          schoolId: user.schoolId || "68788bcf7fe7ec5e0429bbe9",
          branchId: user.branchId || "6878ced3cf6cab94db74b243",
          role: user.role || "user",
        };
      }
      return {
        email: "user@example.com",
        schoolId: "68788bcf7fe7ec5e0429bbe9",
        branchId: "6878ced3cf6cab94db74b243",
        role: "user",
      };
    } catch (error) {
      console.error("Error reading user info:", error);
      return {
        email: "user@example.com",
        schoolId: "68788bcf7fe7ec5e0429bbe9",
        branchId: "6878ced3cf6cab94db74b243",
        role: "user",
      };
    }
  };

  // --------------------------- UPDATE DATA AFTER FETCH ---------------------------
  useEffect(() => {
    if (ticketsData?.tickets) {
      // Only reset data when not adding a new ticket (fresh fetch)
      setFilteredData((prev) => {
        // Avoid duplicates if tickets already appended
        const newTickets = ticketsData.tickets.filter(
          (t: any) => !prev.some((p) => p._id === t._id)
        );
        return [...prev, ...newTickets];
      });
      setFilterResults(ticketsData.tickets);
    }
  }, [ticketsData]);

  // --------------------------- ADD TICKET MUTATION ---------------------------
  const addTicketMutation = useMutation({
    mutationFn: async (newTicket: any) => {
      const res = await api.post("/raise-ticket", newTicket);
      return res.ticket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });

      // Find the selected ticket type name
      const selectedTicketType = Array.isArray(ticketTypesData)
        ? ticketTypesData.find((type: TicketType) => type._id === selectedType)
        : null;

      // Create the complete ticket object with proper type structure
      const completeTicket: Ticket = {
        ...data,
        type: selectedTicketType
          ? {
              _id: selectedTicketType._id,
              name: selectedTicketType.name,
            }
          : { _id: selectedType, name: "Unknown Type" },
      };

      // Add new ticket to the END of list immediately with proper type structure
      setFilteredData((prev) => [...prev, completeTicket]);
      setFilterResults((prev) => [...prev, completeTicket]);

      alert("Ticket raised successfully.");
    },
    onError: (err: any) => {
      console.error("Error:", err);
      alert("Failed to raise ticket. Please try again.");
    },
  });

  // --------------------------- FORM SUBMIT ---------------------------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedType) return alert("Please select a ticket type");
    if (!description.trim()) return alert("Please enter a description");

    const userInfo = getUserInfo();
    if (!userInfo)
      return alert("User information not found. Please login again.");

    const data = {
      type: selectedType,
      description: description.trim(),
      schoolId: userInfo.schoolId,
      branchId: userInfo.branchId,
      email: userInfo.email,
      status: "Open",
    };

    await addTicketMutation.mutateAsync(data);
    closeButtonRef.current?.click();
    resetForm();
  };

  const resetForm = () => {
    setSelectedType("");
    setDescription("");
  };

  const handleDialogClose = () => resetForm();

  // --------------------------- STATUS BUTTONS ---------------------------
  const renderStatusButton = (status: string) => {
    let colorClass = "bg-gray-300 text-gray-800";
    if (status === "Open") colorClass = "bg-blue-500 text-white";
    else if (status === "In Progress") colorClass = "bg-yellow-500 text-black";
    else if (status === "Resolved") colorClass = "bg-green-500 text-white";
    else if (status === "Closed") colorClass = "bg-gray-500 text-white";
    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
      >
        {status}
      </span>
    );
  };

  // Update Ticket Status Mutation
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ _id, status }: { _id: string; status: string }) => {
      const response = await api.put(`update-ticket/${_id}`, { status });
      return response;
    },
    onSuccess: (_, variables) => {
      const { _id, status } = variables;

      // Update local table data immediately
      setFilteredData((prev) =>
        prev.map((ticket) =>
          ticket._id === _id ? { ...ticket, status } : ticket
        )
      );

      setFilterResults((prev) =>
        prev.map((ticket) =>
          ticket._id === _id ? { ...ticket, status } : ticket
        )
      );

      queryClient.invalidateQueries({ queryKey: ["tickets"] });

      alert("✅ Ticket status updated successfully");
      setIsDialogOpen(false);
    },

    onError: (error) => {
      console.error("Error updating ticket:", error);
      alert("❌ Failed to update ticket status");
    },
  });

  // --------------------------- TABLE COLUMNS ---------------------------
  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        header: "Added Date",
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
      {
        accessorKey: "ticket_id",
        header: "Ticket ID",
      },
      {
        header: "Raised By",
        cell: ({ row }) => row.original.raised_by?.userModel || "N/A",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "N/A",
      },
      {
        header: "Type",
        cell: ({ row }) => row.original.type?.name || "N/A",
      },
      {
        header: "School",
        cell: ({ row }) => row.original.schoolId?.schoolName || "N/A",
      },
      {
        header: "Branch",
        cell: ({ row }) => row.original.branchId?.branchName || "N/A",
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => row.original.role || "N/A",
      },
      {
        accessorKey: "description",
        header: "Description",
        meta: { wrapConfig: { wrap: "wrap", maxWidth: "360px" } },
        cell: ({ row }) => row.original.description || "N/A",
      },
      {
        accessorKey: "feedback",
        header: "Feedback",
        cell: ({ row }) => row.original.feedback || "N/A",
      },
      {
        header: "Status",
        cell: ({ row }) => renderStatusButton(row.original.status),
      },
      {
        header: "Action",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-500"
            onClick={() => {
              setSelectedTicket(row.original);
              setStatusValue(row.original.status);
              setIsDialogOpen(true);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    []
  );

  // --------------------------- TABLE SETUP ---------------------------
  const { table, tableElement } = CustomTableServerSidePagination({
    data: filteredData || [],
    columns,
    pagination,
    totalCount: ticketsData?.totalRecords || 0,
    loading: isLoading || isFetching,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    columnVisibility,
    onColumnVisibilityChange: setColumnVisibility,
    emptyMessage: "No tickets found",
    pageSizeOptions: [5, 10, 20, 30, 50, 100, "All"],
    enableSorting: true,
    showSerialNumber: true,
    // Enable virtualization
    enableVirtualization: true,
    estimatedRowHeight: 50,
    overscan: 5,
    maxHeight: "600px",
  });

  // --------------------------- STATUS FILTER ---------------------------
  const handleStatusFilter = (
    status: "All" | "Open" | "In Progress" | "Resolved"
  ) => {
    setStatusFilter(status);
    if (status === "All") setFilteredData(filterResults);
    else setFilteredData(filterResults.filter((t) => t.status === status));
  };

  const getStatusFilterButtonStyle = (status: string) => {
    const isActive = statusFilter === status;
    const colors: Record<string, string> = {
      All: isActive ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-800",
      Open: isActive ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800",
      "In Progress": isActive
        ? "bg-yellow-500 text-black"
        : "bg-yellow-100 text-yellow-800",
      Resolved: isActive
        ? "bg-green-600 text-white"
        : "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-200 text-gray-800";
  };

  // Get selected ticket type name for display
  const getSelectedTypeName = () => {
    if (!selectedType || !Array.isArray(ticketTypesData)) return "";
    const selected = ticketTypesData.find(
      (type: TicketType) => type._id === selectedType
    );
    return selected ? selected.name : "";
  };

  // --------------------------- RENDER ---------------------------
  return (
    <main>
      <ResponseLoader
        isLoading={isLoading || isFetching || isLoadingTicketTypes}
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-2 md:space-y-0">
        <section className="flex flex-wrap gap-4 items-center">
          <SearchComponent
            data={filterResults}
            displayKey={[
              "ticket_id",
              "email",
              "type.name",
              "schoolId.schoolName",
              "branchId.branchName",
              "role",
              "status",
            ]}
            onResults={setFilteredData}
            className="w-[300px]"
          />
          <div>
            <DateRangeFilter
              onDateRangeChange={(s, e) => setDateRange({ start: s, end: e })}
              title="Search by Added Date"
            />
          </div>
          <ColumnVisibilitySelector
            columns={table.getAllColumns()}
            buttonVariant="outline"
          />
          <div className="flex space-x-2">
            {["All", "Open", "In Progress", "Resolved"].map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className={getStatusFilterButtonStyle(status)}
                onClick={() => handleStatusFilter(status as any)}
              >
                {status}
              </Button>
            ))}
          </div>
        </section>

        <section>
          <Dialog onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogTrigger asChild>
              <Button variant="default">Raise Ticket</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit} className="space-y-4">
                <DialogHeader>
                  <DialogTitle>Raise New Ticket</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="ticketType">Type *</Label>
                    <select
                      id="ticketType"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="border border-gray-300 rounded-md p-2 w-full"
                      required
                      disabled={isLoadingTicketTypes}
                    >
                      <option value="">Select ticket type</option>
                      {isLoadingTicketTypes ? (
                        <option value="" disabled>
                          Loading ticket types...
                        </option>
                      ) : (
                        Array.isArray(ticketTypesData) &&
                        ticketTypesData.map((type: TicketType) => (
                          <option key={type._id} value={type._id}>
                            {type.name}
                          </option>
                        ))
                      )}
                    </select>
                    {isLoadingTicketTypes && (
                      <p className="text-sm text-gray-500">
                        Loading ticket types...
                      </p>
                    )}
                    {!isLoadingTicketTypes &&
                      (!Array.isArray(ticketTypesData) ||
                        ticketTypesData.length === 0) && (
                        <p className="text-sm text-red-500">
                          No ticket types available. Please contact
                          administrator.
                        </p>
                      )}
                    {selectedType && (
                      <p className="text-sm text-green-600">
                        Selected: {getSelectedTypeName()}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your issue in detail"
                      rows={4}
                      required
                      className="border border-gray-300 rounded-md p-2 w-full"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button
                      ref={closeButtonRef}
                      variant="outline"
                      type="button"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={
                      addTicketMutation.isPending ||
                      isLoadingTicketTypes ||
                      !Array.isArray(ticketTypesData) ||
                      ticketTypesData.length === 0
                    }
                  >
                    {addTicketMutation.isPending
                      ? "Submitting..."
                      : "Submit Ticket"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      {/* ---------- EDIT STATUS DIALOG ---------- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ticket Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Status</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2 pt-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-500"
                onClick={() => {
                  if (selectedTicket && statusValue) {
                    updateTicketStatusMutation.mutate({
                      _id: selectedTicket._id,
                      status: statusValue,
                    });
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <section className="mb-4">{tableElement}</section>
      {/* <FloatingMenu /> */}
    </main>
  );
}
