"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchComponent from "@/components/ui/SearchOnlydata";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { FloatingMenu } from "@/components/floatingMenu";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { api } from "@/services/apiService";
import ResponseLoader from "@/components/ResponseLoader";
import { ColumnVisibilitySelector } from "@/components/column-visibility-selector";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";

interface Ticket {
  _id: string;
  ticket_id: string;
  raised_by: { userId: string; userModel: string };
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

export default function RaiseTicketMaster() {
  const queryClient = useQueryClient();
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [filteredData, setFilteredData] = useState<Ticket[]>([]);
  const [filterResults, setFilterResults] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "In Progress" | "Resolved">("All");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("");
  
  // Ticket Types Management States
  const [isTicketTypesDialogOpen, setIsTicketTypesDialogOpen] = useState(false);
  const [newTicketType, setNewTicketType] = useState("");

  // --------------------------- TICKET TYPES API ---------------------------

  // Fetch Ticket Types
  const { data: ticketTypesData, isLoading: isLoadingTicketTypes, refetch: refetchTicketTypes } = useQuery({
    queryKey: ["ticketTypes"],
    queryFn: async () => {
      try {
        const response = await api.get("/get-ticket-types");
        console.log("Ticket Types API Response:", response);
        // Based on your response, it returns a direct array
        return Array.isArray(response) ? response : response.data || response.types || [];
      } catch (error) {
        console.error("Error fetching ticket types:", error);
        return [];
      }
    },
  });

  // Add Ticket Type Mutation
  const addTicketTypeMutation = useMutation({
    mutationFn: async (ticketTypeName: string) => {
      const response = await api.post("/add-ticket-type", { name: ticketTypeName });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketTypes"] });
      setNewTicketType("");
      alert("✅ Ticket type added successfully");
    },
    onError: (error: any) => {
      console.error("Error adding ticket type:", error);
      alert(error.response?.data?.message || "❌ Failed to add ticket type");
    },
  });

  // Delete Ticket Type Mutation
  const deleteTicketTypeMutation = useMutation({
    mutationFn: async (ticketTypeId: string) => {
      const response = await api.delete(`/delete-ticket-type/${ticketTypeId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketTypes"] });
      alert("✅ Ticket type deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting ticket type:", error);
      alert(error.response?.data?.message || "❌ Failed to delete ticket type");
    },
  });

  // Update Ticket Type Mutation
  const updateTicketTypeMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await api.put(`/update-ticket-type/${id}`, { name });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticketTypes"] });
      alert("✅ Ticket type updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating ticket type:", error);
      alert(error.response?.data?.message || "❌ Failed to update ticket type");
    },
  });

  // --------------------------- TICKETS API ---------------------------

  // Fetch tickets
  const { data: ticketsData, isLoading, isFetching } = useQuery({
    queryKey: ["tickets", pagination, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      const response = await api.get(`/get-tickets?${params}`);
      return response;
    },
  });

  useEffect(() => {
    if (ticketsData?.tickets) {
      setFilteredData(ticketsData.tickets);
      setFilterResults(ticketsData.tickets);
    }
  }, [ticketsData]);

  // Update Ticket Status Mutation
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ _id, status }: { _id: string; status: string }) => {
      const response = await api.put(`update-ticket/${_id}`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      alert("✅ Ticket status updated successfully");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating ticket:", error);
      alert("❌ Failed to update ticket status");
    },
  });

  // --------------------------- HANDLERS ---------------------------

  // Handle Add Ticket Type
  const handleAddTicketType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketType.trim()) {
      alert("Please enter a ticket type name");
      return;
    }
    addTicketTypeMutation.mutate(newTicketType.trim());
  };

  // Handle Edit Ticket Type
  const handleEditTicketType = (ticketType: TicketType) => {
    const newName = prompt("Enter new name for ticket type:", ticketType.name);
    if (newName && newName.trim() && newName !== ticketType.name) {
      updateTicketTypeMutation.mutate({
        id: ticketType._id,
        name: newName.trim()
      });
    }
  };

  // Handle Delete Ticket Type
  const handleDeleteTicketType = (ticketType: TicketType) => {
    if (confirm(`Are you sure you want to delete "${ticketType.name}"?`)) {
      deleteTicketTypeMutation.mutate(ticketType._id);
    }
  };

  // Status badge colors
  const renderStatusButton = (status: string) => {
    let colorClass = "bg-gray-300 text-gray-800";
    if (status === "Open") colorClass = "bg-blue-500 text-white";
    else if (status === "In Progress") colorClass = "bg-yellow-500 text-black";
    else if (status === "Resolved") colorClass = "bg-green-500 text-white";
    else if (status === "Closed") colorClass = "bg-gray-500 text-white";
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>{status}</span>;
  };

  // Table columns for Tickets
  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      header: "Added Date",
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    { accessorKey: "ticket_id", header: "Ticket ID" },
    { 
      header: "Raised By", 
      cell: ({ row }) => row.original.raised_by?.userModel || "N/A"
    },
    { 
      accessorKey: "email", 
      header: "Email",
      cell: ({ row }) => row.original.email || "N/A"
    },
    { 
      header: "Type", 
      cell: ({ row }) => row.original.type?.name || "N/A"
    },
    { 
      header: "School", 
      cell: ({ row }) => row.original.schoolId?.schoolName || "N/A"
    },
    { 
      header: "Branch", 
      cell: ({ row }) => row.original.branchId?.branchName || "N/A"
    },
    { 
      accessorKey: "role", 
      header: "Role",
      cell: ({ row }) => row.original.role || "N/A"
    },
    { 
      accessorKey: "description", 
      header: "Description",
      cell: ({ row }) => row.original.description || "N/A"
    },
    { 
      accessorKey: "feedback", 
      header: "Feedback",
      cell: ({ row }) => row.original.feedback || "N/A"
    },
    { header: "Status", cell: ({ row }) => renderStatusButton(row.original.status) },
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
  ], []);

  // Table columns for Ticket Types
  const ticketTypeColumns = useMemo<ColumnDef<TicketType>[]>(
    () => [
      {
        header: "SN",
        cell: ({ row }) => row.index + 1,
      },
      {
        accessorKey: "name",
        header: "Ticket Type Name",
      },
      {
        header: "Created Date",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString(),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-500 cursor-pointer"
              onClick={() => handleEditTicketType(row.original)}
              disabled={updateTicketTypeMutation.isPending}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-red-500 text-white hover:bg-red-600 border-red-500 cursor-pointer"
              onClick={() => handleDeleteTicketType(row.original)}
              disabled={deleteTicketTypeMutation.isPending}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [updateTicketTypeMutation.isPending, deleteTicketTypeMutation.isPending]
  );

  // Table setup for Tickets
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
    enableSorting: true,
    showSerialNumber: true,
  });

  // Table setup for Ticket Types - FIXED VERSION
  const ticketTypesTableConfig = CustomTableServerSidePagination({
    data: ticketTypesData || [],
    columns: ticketTypeColumns,
    pagination: { pageIndex: 0, pageSize: 10 },
    totalCount: Array.isArray(ticketTypesData) ? ticketTypesData.length : 0,
    loading: isLoadingTicketTypes,
    onPaginationChange: () => {},
    onSortingChange: () => {},
    sorting: [],
    columnVisibility: {},
    onColumnVisibilityChange: () => {},
    emptyMessage: "No ticket types found",
    enableSorting: false,
    showSerialNumber: false,
  });

  // Filter by status
  const handleStatusFilter = (status: "All" | "Open" | "In Progress" | "Resolved") => {
    setStatusFilter(status);
    if (status === "All") setFilteredData(filterResults);
    else setFilteredData(filterResults.filter((t) => t.status === status));
  };

  // Button color logic
  const getStatusButtonColor = (status: string) => {
    switch (status) {
      case "Open":
        return statusFilter === "Open"
          ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
          : "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
      case "In Progress":
        return statusFilter === "In Progress"
          ? "bg-yellow-500 text-black hover:bg-yellow-600 border-yellow-500"
          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
      case "Resolved":
        return statusFilter === "Resolved"
          ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
          : "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
      case "All":
      default:
        return statusFilter === "All"
          ? "bg-gray-800 text-white hover:bg-gray-900"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300";
    }
  };

  // Debug: Log ticket types data
  useEffect(() => {
    console.log("Ticket Types Data:", ticketTypesData);
  }, [ticketTypesData]);

  return (
    <main>
      <ResponseLoader isLoading={isLoading || isFetching} />

      {/* ---------- FILTER HEADER ---------- */}
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
          <DateRangeFilter onDateRangeChange={() => {}} title="Search by Added Date" />
          <ColumnVisibilitySelector columns={table.getAllColumns()} buttonVariant="outline" buttonSize="default" />

          <div className="flex space-x-2">
            {["All", "Open", "In Progress", "Resolved"].map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className={`border ${getStatusButtonColor(status)}`}
                onClick={() => handleStatusFilter(status as any)}
              >
                {status}
              </Button>
            ))}
          </div>
        </section>

        <section className="flex space-x-2">
          {/* Manage Ticket Types Button */}
          <Dialog open={isTicketTypesDialogOpen} onOpenChange={setIsTicketTypesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-purple-500 text-white hover:bg-purple-600 hover:text-white border-purple-500">
                Manage Ticket Types
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Ticket Types</DialogTitle>
              </DialogHeader>
              
              {/* Add New Ticket Type Form */}
              <form onSubmit={handleAddTicketType} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="ticketTypeName">Add New Ticket Type</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="ticketTypeName"
                      placeholder="Enter ticket type name"
                      value={newTicketType}
                      onChange={(e) => setNewTicketType(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={addTicketTypeMutation.isPending}
                      className="bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-500"
                    >
                      {addTicketTypeMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Ticket Types Table */}
              <div className="mt-1">
                <Label className="text-sm font-medium mb-2 block">Existing Ticket Types</Label>
                <div className="border rounded-md">
                  {ticketTypesTableConfig.tableElement}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button 
                  variant="outline" 
                  onClick={() => setIsTicketTypesDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </section>
      </header>

      {/* ---------- TICKETS TABLE ---------- */}
      <section className="mb-4">{tableElement}</section>

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

      <FloatingMenu />
    </main>
  );
}