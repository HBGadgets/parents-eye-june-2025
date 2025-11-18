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
// import { SearchableDropdown } from "./SearcheableDropdownFilter";
// import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { SearchableDropdown } from "../SearcheableDropdownFilter";
import { LoadingSpinner } from "../ui/loading-spinner";

interface ExcelUploaderProps {
  schools?: string[];
  branches?: string[];
  onFileUpload?: (file: File, school: string, branch: string) => Promise<void>;
}

export const ExcelUploader = ({
  schools,
  branches,
  onFileUpload,
}: ExcelUploaderProps) => {
  const [selectedSchool, setSelectedSchool] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploadDisabled = !selectedSchool || !selectedBranch;

  const requiredHeaders = [
    "name",
    "uniqueId",
    "sim",
    "speed",
    "average",
    "model",
    "category",
    "createdAt",
  ];

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

      // Compare headers
      const missing = requiredHeaders.filter((h) => !headers.includes(h));

      if (missing.length > 0) {
        toast.error("Invalid template format", {
          description: `Missing columns: ${missing.join(", ")}`,
        });
        return;
      }

      // All good
      setSelectedFile(file);
      toast.success("File selected", {
        description: `${file.name} matches the template`,
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
    if (!selectedSchool) {
      toast.error("Missing selection", {
        description: "Please select a school",
      });
      return;
    }

    if (!selectedBranch) {
      toast.error("Missing selection", {
        description: "Please select a branch",
      });
      return;
    }

    if (!selectedFile) {
      toast.error("No file selected", {
        description: "Please select an Excel file to upload",
      });
      return;
    }

    setIsUploading(true);

    try {
      await onFileUpload?.(selectedFile, selectedSchool, selectedBranch);
      toast.success("Upload successful", {
        description: `${selectedFile.name} uploaded successfully`,
      });

      // Reset form after successful upload
      setSelectedFile(null);
      setSelectedSchool("");
      setSelectedBranch("");
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
    // Create a simple CSV that can be opened in Excel
    const csvContent =
      "name,uniqueId,sim,speed,average,model,category,createdAt\nMH31BB1234,7458745874587,01234567890,80,12,v5,School Bus,18/11/2025\n";
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

  useEffect(() => {
    console.log("File selected:", selectedFile);
  }, [selectedFile]);

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
          Excel File Upload
        </DialogTitle>
        <DialogDescription className="text-base">
          Select your school and branch, then upload your Excel file
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 pt-2">
        {/* School and Branch Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* School Dropdown */}
          <SearchableDropdown
            items={schools}
            valueKey="_id"
            labelKey="schoolName"
            placeholder="Select School"
            value={selectedSchool}
            onSelect={(item) => {
              setSelectedSchool(item._id);
              setSelectedBranch(""); // reset branch
            }}
            disabled={isUploading}
          />

          {/* Branch Dropdown */}
          <SearchableDropdown
            items={
              branches?.filter(
                (b: any) => b.schoolId?._id === selectedSchool
              ) || []
            }
            valueKey="_id"
            labelKey="branchName"
            placeholder="Select Branch"
            emptyMessage="Select a school first"
            value={selectedBranch}
            onSelect={(item) => setSelectedBranch(item._id)}
            disabled={isUploading}
          />
        </div>

        {/* Template Download Section */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Need the correct format?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Download our template to ensure your data matches the required
                  format
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-2 flex-shrink-0 cursor-pointer"
              disabled={isUploading}
            >
              <Download className="h-4 w-4" />
              Template
            </Button>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="space-y-3">
          <Label className="text-sm font-medium ">
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
              "relative cursor-pointer rounded-lg border-2 border-dashed transition-all",
              isUploadDisabled || isUploading
                ? "opacity-50 cursor-not-allowed"
                : isDragging
                ? "border-primary bg-upload-bg shadow-sm"
                : "border-upload-border bg-upload-bg/30 hover:bg-upload-bg/50 hover:border-primary/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
              className="hidden"
              disabled={isUploading}
            />

            {selectedFile ? (
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-success/10 p-3">
                      <FileText className="h-8 w-8 text-success" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground truncate text-lg">
                          {selectedFile.name}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            Valid format
                          </span>
                          <span className="text-muted-foreground/50">•</span>
                          <span>
                            {(selectedFile.size / 1024).toFixed(2)} KB
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
                          className="gap-2 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Progress Indicator */}
                {isUploading && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-3">
                      <LoadingSpinner size="sm" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          Uploading file...
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Please wait while we process your file
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-10">
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium text-foreground">
                    Drop your Excel file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls & .csv files only
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleUpload}
            disabled={
              !selectedSchool || !selectedBranch || !selectedFile || isUploading
            }
            className="flex-1 h-11 cursor-pointer"
            size="lg"
          >
            {isUploading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                Upload File
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
