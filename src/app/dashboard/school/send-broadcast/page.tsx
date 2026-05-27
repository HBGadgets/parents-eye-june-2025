"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";
import { useNotification } from "@/hooks/useNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { CustomTableServerSidePagination } from "@/components/ui/customTable(serverSidePagination)";
import { type ColumnDef } from "@tanstack/react-table";
import { Bell, Send, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/util/formatDate";
import ResponseLoader from "@/components/ResponseLoader";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Page() {
  const { decodedToken, hydrateAuth } = useAuthStore();

  // ---------------- UI & Dialog States ----------------
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{ branchId: string; schoolId?: string; title: string; message: string } | null>(null);

  // ---------------- Pagination & Filters State ----------------
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([]);

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  // ---------------- Form State ----------------
  const [title, setTitle] = useState("Notice");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Decode role information
  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedToken?.role === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId =
    decodedToken?.role === "branch" ? decodedToken?.id : decodedToken?.branchId;

  const activeBranchId = decodedTokenRole === "branch" ? tokenBranchId : selectedBranchId;
  const activeSchoolId = decodedTokenRole === "superAdmin" ? selectedSchoolId : tokenSchoolId;

  // Memoize historyParams to prevent infinite react-query refetch loops and UI freezing
  const historyParams = useMemo(() => ({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    ...(activeBranchId ? { branchId: activeBranchId } : {}),
  }), [pagination.pageIndex, pagination.pageSize, activeBranchId]);

  // React Query Hook with pagination & branch filter
  const { sendNotification, isSending, historyData, isHistoryLoading } = useNotification(historyParams);

  // React Query Hooks for Dropdowns
  const { data: schools = [], isLoading: isLoadingSchools } = useSchoolDropdown(
    decodedTokenRole === "superAdmin"
  );

  const { data: branches = [], isLoading: isLoadingBranches } = useBranchDropdown(
    selectedSchoolId,
    true,
    decodedTokenRole === "branchGroup"
  );

  // Initialize values based on role
  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      setSelectedSchoolId(tokenSchoolId);
    }
    if (decodedTokenRole === "branch" && tokenBranchId) {
      setSelectedBranchId(tokenBranchId);
    }
  }, [decodedTokenRole, tokenSchoolId, tokenBranchId]);

  // Handle Submit
  const handleSend = () => {
    const newErrors: Record<string, string> = {};

    if (!activeBranchId) {
      newErrors.branch = "Please select or assign a branch";
    }
    if (!title.trim()) {
      newErrors.title = "Notification Title is required";
    }
    if (!message.trim()) {
      newErrors.message = "Notification Message is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    setPendingPayload({
      branchId: activeBranchId!,
      schoolId: activeSchoolId,
      title: title.trim(),
      message: message.trim(),
    });
  };

  // Define table columns matching repository's CustomTable column design
  const columns: ColumnDef<any>[] = [
    {
      id: "createdAt",
      header: "Date & Time",
      accessorFn: (row) => formatDate(row.createdAt) || new Date(row.createdAt).toLocaleString(),
      enableSorting: true,
    },
    {
      id: "title",
      header: "Title",
      accessorKey: "title",
      enableSorting: true,
    },
    {
      id: "message",
      header: "Message",
      accessorKey: "message",
      enableSorting: true,
      meta: {
        wrapConfig: { wrap: "wrap", maxWidth: "400px" },
      },
    },
    {
      id: "sender",
      header: "Sender Role",
      accessorFn: (row) => row.sender?.userModel?.toUpperCase() || "SYSTEM",
      enableSorting: true,
    },
    {
      id: "recipients",
      header: "Recipients (Parents)",
      cell: ({ row }) => {
        const parentsList = row.original.parents || [];
        if (parentsList.length === 0) return <span className="text-slate-400 text-xs">No Parents</span>;

        return (
          <Select>
            <SelectTrigger size="sm" className="h-8 text-xs font-semibold flex gap-1 cursor-pointer w-[160px] mx-auto">
              <SelectValue placeholder={`View Parents (${parentsList.length})`} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto bg-popover border shadow-md rounded-md p-1 z-50">
              <SelectGroup>
                {parentsList.map((p: any, idx: number) => {
                  const name = p.parentId?.parentName || p.parentId?.username || "Unknown Parent";
                  return (
                    <SelectItem key={p._id || idx} value={p._id || String(idx)} className="text-xs cursor-pointer">
                      {name}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        );
      },
      enableSorting: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPendingPayload({
                branchId: item.branchId,
                schoolId: typeof item.schoolId === "string" ? item.schoolId : item.schoolId?._id,
                title: item.title || "Notice",
                message: item.message,
              });
            }}
            disabled={isSending}
            className="h-8 text-xs font-semibold cursor-pointer flex gap-1"
          >
            Resend
          </Button>
        );
      },
      enableSorting: false,
    },
  ];

  // Initialize server-side pagination CustomTable component
  const { tableElement } = CustomTableServerSidePagination({
    data: historyData?.data || [],
    columns,
    pagination,
    totalCount: historyData?.total || 0,
    loading: isHistoryLoading,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    sorting,
    emptyMessage: "No broadcast history logs found",
    pageSizeOptions: [5, 10, 20, 30, 50, 100],
    enableSorting: true,
    showSerialNumber: true,
  });

  return (
    <main className="p-6 flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Response loading progress banner */}
      <ResponseLoader isLoading={isHistoryLoading || isSending} />

      {/* Page Header and Trigger Button */}
      <div className="flex items-center justify-between w-full border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Send Notification</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Broadcast and track alerts dispatched to parents.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-semibold px-4 py-2 cursor-pointer flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Send Notification
            </Button>
          </DialogTrigger>

          <DialogContent
            className="max-w-md bg-background rounded-lg shadow-lg p-6"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-semibold">
                Send Notification
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Complete the fields below to broadcast this notification.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Branch & School Selectors based on Role */}
              {decodedTokenRole === "superAdmin" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Select School <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={schools.map((s: any) => ({ label: s.schoolName, value: s._id }))}
                    value={selectedSchoolId}
                    onValueChange={(val) => {
                      setSelectedSchoolId(val);
                      setSelectedBranchId(undefined);
                    }}
                    placeholder="Select School"
                    searchPlaceholder="Search schools..."
                    emptyMessage={isLoadingSchools ? "Loading schools..." : "No school found"}
                    width="w-full"
                    open={schoolOpen}
                    onOpenChange={setSchoolOpen}
                  />
                </div>
              )}

              {decodedTokenRole !== "branch" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Select Branch <span className="text-red-500">*</span>
                  </label>
                  <Combobox
                    items={branches.map((b: any) => ({ label: b.branchName, value: b._id }))}
                    value={selectedBranchId}
                    onValueChange={(val) => setSelectedBranchId(val)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branches..."
                    emptyMessage={isLoadingBranches ? "Loading branches..." : "No branch found"}
                    width="w-full"
                    disabled={decodedTokenRole === "superAdmin" && !selectedSchoolId}
                    open={branchOpen}
                    onOpenChange={setBranchOpen}
                    className={errors.branch ? "border-red-500" : ""}
                  />
                  {errors.branch && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                      <Info className="h-3 w-3" />
                      {errors.branch}
                    </p>
                  )}
                </div>
              )}

              {/* Title Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Weather Alert"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? "border-red-500 text-foreground" : "text-foreground"}
                />
                {errors.title && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                    <Info className="h-3 w-3" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Message Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Notification Message <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Type notification message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={errors.message ? "border-red-500 text-foreground" : "text-foreground"}
                />
                {errors.message && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1 mt-1">
                    <Info className="h-3 w-3" />
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <DialogClose asChild>
                  <Button variant="outline" className="text-muted-foreground font-medium">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  onClick={handleSend}
                  disabled={isSending}
                  className="bg-primary text-primary-foreground font-semibold px-4 transition-all"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Broadcast History Log */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Broadcast History</h2>
          <p className="text-xs text-muted-foreground mt-0.5">List of sent circulars and notice dispatches.</p>
        </div>

        {/* Existing Premium UI Table Component with Server-Side Pagination */}
        <div className="w-full">
          {tableElement}
        </div>
      </section>

      {/* Critical Action Alert Dialog */}
      <AlertDialog open={!!pendingPayload} onOpenChange={(open) => !open && setPendingPayload(null)}>
        <AlertDialogContent
          className="max-w-md bg-white rounded-lg p-6 border-none shadow-xl"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-red-600 flex items-center gap-2">
              ⚠️ Critical Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-slate-600 text-sm mt-2">
                You are about to broadcast this notification to **ALL parents**. 
                <span className="block mt-2 bg-slate-50 border rounded-md p-3 text-slate-800 space-y-1">
                  <strong className="block text-sm text-slate-900 border-b pb-1">Title: {pendingPayload?.title}</strong>
                  <div className="text-xs text-slate-600 whitespace-pre-wrap">{pendingPayload?.message}</div>
                </span>
                <span className="block mt-2 text-xs text-red-500 font-bold">
                  * This action will trigger instant mobile push notifications and cannot be undone!
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingPayload) return;
                sendNotification(pendingPayload, {
                  onSuccess: (data: any) => {
                    setIsDialogOpen(false);
                    setTitle("Notice");
                    setMessage("");
                    toast.success(data?.message || "Notification sent successfully!");
                    setPendingPayload(null);
                  },
                  onError: (err: any) => {
                    const errMsg = err?.response?.data?.message || err?.message || "Failed to send notification";
                    toast.error(errMsg);
                    setPendingPayload(null);
                  },
                });
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-100 cursor-pointer"
            >
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}