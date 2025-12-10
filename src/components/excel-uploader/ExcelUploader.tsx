import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  FileSpreadsheet,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { LoadingSpinner } from "../ui/loading-spinner";
import { Combobox, ComboboxItem } from "../ui/combobox";
import { useSchoolDropdown, useBranchDropdown } from "@/hooks/useDropdown";

interface ExcelUploaderProps {
  onFileUpload?: (file: File, school: string, branch: string) => Promise<void>;
  role?: string;
  tokenSchoolId?: string;
  tokenBranchId?: string;
  tokenBranchGroupSchoolId?: string;
  requiredHeaders?: string[];
  csvContent?: string;
}

export const ExcelUploader = ({
  onFileUpload,
  role = "superAdmin",
  tokenSchoolId,
  tokenBranchId,
  tokenBranchGroupSchoolId,
  requiredHeaders = [],
  csvContent,
}: ExcelUploaderProps) => {
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Track dropdown open states
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Track if dropdowns have been opened at least once
  const [hasOpenedSchool, setHasOpenedSchool] = useState(false);
  const [hasOpenedBranch, setHasOpenedBranch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Determine which dropdowns to show based on role
  const showSchoolDropdown = role === "superAdmin";
  const showBranchDropdown = role !== "branch";

  // Determine effective school ID based on role
  const effectiveSchoolId =
    role === "school"
      ? tokenSchoolId
      : role === "branchGroup"
      ? tokenBranchGroupSchoolId
      : role === "branch"
      ? tokenSchoolId
      : selectedSchool; // superAdmin selects manually

  // Fetch schools only for superAdmin when dropdown is opened
  const { data: schools, isLoading: isLoadingSchools } = useSchoolDropdown(
    hasOpenedSchool && role === "superAdmin"
  );

  // Fetch branches based on role
  const { data: branches, isLoading: isLoadingBranches } = useBranchDropdown(
    effectiveSchoolId,
    hasOpenedBranch && !!effectiveSchoolId && role !== "branch",
    role === "branchGroup"
  );

  // Upload is disabled if required fields are missing
  const isUploadDisabled = !effectiveSchoolId || !selectedBranch;

  // Transform schools data to Combobox format
  const schoolItems: ComboboxItem[] =
    schools?.map((school) => ({
      value: school._id,
      label: school.schoolName || school.name || "",
    })) || [];

  // Transform branches data to Combobox format
  const branchItems: ComboboxItem[] =
    branches?.map((branch) => ({
      value: branch._id,
      label: branch.branchName || branch.name || "",
    })) || [];

  // Auto-apply role-based defaults on mount
  useEffect(() => {
    if (hasInitialized.current) return;

    if (role === "school" && tokenSchoolId) {
      setSelectedSchool(tokenSchoolId);
      setHasOpenedBranch(true);
    }

    if (role === "branchGroup" && tokenBranchGroupSchoolId) {
      setSelectedSchool(tokenBranchGroupSchoolId);
      setHasOpenedBranch(true);
    }

    if (role === "branch" && tokenSchoolId && tokenBranchId) {
      setSelectedSchool(tokenSchoolId);
      setSelectedBranch(tokenBranchId);
    }

    hasInitialized.current = true;
  }, [role, tokenSchoolId, tokenBranchId, tokenBranchGroupSchoolId]);

  // Handle school dropdown open state
  const handleSchoolOpenChange = (open: boolean) => {
    setSchoolDropdownOpen(open);
    if (open && !hasOpenedSchool) {
      setHasOpenedSchool(true);
    }
  };

  // Handle branch dropdown open state
  const handleBranchOpenChange = (open: boolean) => {
    setBranchDropdownOpen(open);
    if (open && !hasOpenedBranch) {
      setHasOpenedBranch(true);
    }
  };

  // Reset branch when school changes (only for superAdmin)
  useEffect(() => {
    if (role === "superAdmin") {
      setSelectedBranch("");
      setHasOpenedBranch(false);
    }
  }, [selectedSchool, role]);

  const isExcelFile = (file: File): boolean => {
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    const allowedExtensions = [".xls", ".xlsx", ".csv"];
    const fileExtension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();

    return (
      allowedTypes.includes(file.type) ||
      allowedExtensions.includes(fileExtension)
    );
  };

  const handleFileSelect = (file: File) => {
    if (!isExcelFile(file)) {
      toast.error("Invalid file type", {
        description: "Please upload only Excel files (.xlsx, .xls or .csv)",
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      let headers: string[] = [];

      // --- CSV FILE ---
      if (file.name.endsWith(".csv")) {
        const text = data as string;
        const firstLine = text.split("\n")[0].trim();
        headers = firstLine.split(",").map((h) => h.trim());
      }

      // --- EXCEL FILE ---
      else {
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
        }) as any[][];
        headers = jsonData[0] as string[];
      }

      // Compare headers only if requiredHeaders are provided
      if (requiredHeaders.length > 0) {
        const missing = requiredHeaders.filter((h) => !headers.includes(h));

        if (missing.length > 0) {
          toast.error("Invalid template format", {
            description: `Missing columns: ${missing.join(", ")}`,
          });
          return;
        }
      }

      // All good
      setSelectedFile(file);
      toast.success("File selected", {
        description: `${file.name} ${
          requiredHeaders.length > 0
            ? "matches the template"
            : "is ready to upload"
        }`,
      });
    };

    // Read file based on type
    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = async () => {
    // Validate school selection
    if (!effectiveSchoolId) {
      toast.error("Missing selection", {
        description: "Please select a school",
      });
      return;
    }

    // Validate branch selection
    if (!selectedBranch) {
      toast.error("Missing selection", {
        description: "Please select a branch",
      });
      return;
    }

    // Validate file selection
    if (!selectedFile) {
      toast.error("No file selected", {
        description: "Please select an Excel file to upload",
      });
      return;
    }

    setIsUploading(true);

    try {
      await onFileUpload?.(selectedFile, effectiveSchoolId, selectedBranch);

      toast.success("Upload successful", {
        description: `${selectedFile.name} uploaded successfully`,
      });

      // Reset form after successful upload based on role
      setSelectedFile(null);

      if (role === "superAdmin") {
        setSelectedSchool("");
        setSelectedBranch("");
        setHasOpenedSchool(false);
        setHasOpenedBranch(false);
      } else if (role === "school" || role === "branchGroup") {
        setSelectedBranch("");
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast.error("Upload failed", {
        description: "An error occurred while uploading the file",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!csvContent) {
      toast.error("Template not available", {
        description: "CSV template content is not provided",
      });
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Template downloaded", {
      description: "Use this template to format your Excel file",
    });
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Dynamic dialog description based on role
  const getDialogDescription = () => {
    if (role === "branch") {
      return "Upload your Excel file";
    }
    if (role === "school" || role === "branchGroup") {
      return "Select your branch, then upload your Excel file";
    }
    return "Select your school and branch, then upload your Excel file";
  };

  return (
    <div className="space-y-6">
      <DialogHeader className="pb-2">
        <DialogTitle className="flex items-center gap-3 text-xl font-semibold">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          Excel File Upload
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground pt-2">
          {getDialogDescription()}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* School and Branch Selection */}
        {(showSchoolDropdown || showBranchDropdown) && (
          <div
            className={cn(
              "grid gap-4",
              showSchoolDropdown && showBranchDropdown ? "sm:grid-cols-2" : ""
            )}
          >
            {/* School Dropdown */}
            {showSchoolDropdown && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  School <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  items={schoolItems}
                  value={selectedSchool}
                  onValueChange={(value) => setSelectedSchool(value || "")}
                  placeholder="Select School"
                  searchPlaceholder="Search schools..."
                  emptyMessage={
                    isLoadingSchools ? "Loading..." : "No schools found"
                  }
                  width="w-full"
                  disabled={isUploading}
                  open={schoolDropdownOpen}
                  onOpenChange={handleSchoolOpenChange}
                />
              </div>
            )}

            {/* Branch Dropdown */}
            {showBranchDropdown && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Branch <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  items={branchItems}
                  value={selectedBranch}
                  onValueChange={(value) => setSelectedBranch(value || "")}
                  placeholder="Select Branch"
                  searchPlaceholder="Search branches..."
                  emptyMessage={
                    !effectiveSchoolId
                      ? "Select a school first"
                      : isLoadingBranches
                      ? "Loading..."
                      : "No branches found"
                  }
                  width="w-full"
                  disabled={!effectiveSchoolId || isUploading}
                  open={branchDropdownOpen}
                  onOpenChange={handleBranchOpenChange}
                />
              </div>
            )}
          </div>
        )}

        {/* Template Download Section */}
        {csvContent && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    Need the correct format?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Download our template to ensure compatibility
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-2 shrink-0 cursor-pointer"
                disabled={isUploading}
              >
                <Download className="h-4 w-4" />
                Template
              </Button>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Upload File <span className="text-destructive">*</span>
          </Label>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => {
              if (!isUploadDisabled && !isUploading)
                fileInputRef.current?.click();
            }}
            className={cn(
              "relative rounded-xl border-2 border-dashed transition-all duration-200",
              isUploadDisabled || isUploading
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : selectedFile
                ? "border-success/50 bg-success/5"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
            )}
            role="button"
            tabIndex={isUploadDisabled || isUploading ? -1 : 0}
            aria-label="File upload area"
            onKeyDown={(e) => {
              if (
                (e.key === "Enter" || e.key === " ") &&
                !isUploadDisabled &&
                !isUploading
              ) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading}
              aria-label="Upload Excel file"
            />

            {selectedFile ? (
              <div className="p-5 animate-scale-in">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-success/10">
                    <FileText className="h-6 w-6 text-success" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {selectedFile.name}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Valid format
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>

                      {!isUploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                          }}
                          className="h-8 gap-1.5 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                          aria-label="Remove file"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only sm:not-sr-only ">
                            Remove
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                    <LoadingSpinner size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Uploading file...</p>
                      <p className="text-xs text-muted-foreground">
                        Please wait while we process your file
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1 text-center">
                  <p className="font-medium">
                    {isUploadDisabled
                      ? "Please select a branch first"
                      : "Drop your file here, or click to browse"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls & .csv files
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={isUploadDisabled || !selectedFile || isUploading}
          className="w-full h-11 gap-2 font-medium cursor-pointer"
          size="lg"
        >
          {isUploading ? (
            <>
              <LoadingSpinner
                size="sm"
                className="border-primary-foreground border-t-transparent"
              />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Upload File
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
