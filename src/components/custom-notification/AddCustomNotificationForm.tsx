"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Upload, Music, X } from "lucide-react";
import {
  useSchoolDropdown,
  useBranchDropdown,
  useRouteDropdown,
} from "@/hooks/useDropdown";

interface Props {
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
  isSending?: boolean;
  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
}

export default function AddCustomNotificationForm({
  onSubmit,
  onClose,
  isSending,
  decodedToken,
}: Props) {
  // ---------------- Form State ----------------
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);

  // ---------------- Selection State ----------------
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>();

  // ---------------- Combobox Open States ----------------
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);

  // ---------------- Error States ----------------
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---------------- Role & Token Info ----------------
  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedToken?.role === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.branchId;

  // ---------------- React Query Hooks ----------------
  const { data: schools = [], isLoading: isLoadingSchools } = useSchoolDropdown(
    decodedTokenRole === "superAdmin"
  );

  const { data: branches = [], isLoading: isLoadingBranches } = useBranchDropdown(
    selectedSchoolId,
    true,
    decodedTokenRole === "branchGroup"
  );

  const { data: routes = [], isLoading: isLoadingRoutes } = useRouteDropdown(
    selectedBranchId,
    true
  );

  // ---------------- Initialize Selection Based on Role ----------------
  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      setSelectedSchoolId(tokenSchoolId);
    }
    if (decodedTokenRole === "branch" && tokenBranchId) {
      setSelectedBranchId(tokenBranchId);
    }
  }, [decodedTokenRole, tokenSchoolId, tokenBranchId]);

  // ---------------- Validation ----------------
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!message.trim()) newErrors.message = "Message is required";
    if (selectedRouteIds.length === 0) newErrors.routes = "Select at least one route";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("message", message.trim());
    if (audioFile) {
      formData.append("audioUrl", audioFile); // Field name as requested in API payload
    }
    formData.append("routeObjIds", JSON.stringify(selectedRouteIds));
    
    onSubmit(formData);
  };

  return (
    <Card className="shadow-xl border-none">
      <CardHeader>
        <CardTitle>Send Custom Notification</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-medium">Title <span className="text-red-500">*</span></label>
          <Input
            placeholder="e.g. Bus Delay"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className={errors.title ? "border-red-500" : ""}
          />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
        </div>

        {/* Message */}
        <div>
          <label className="text-sm font-medium">Message <span className="text-red-500">*</span></label>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
            className={errors.message ? "border-red-500" : ""}
            rows={3}
          />
          {errors.message && <p className="text-xs text-red-500 mt-1">{errors.message}</p>}
        </div>

        {/* Audio File Upload */}
        <div>
          <label className="text-sm font-medium">Audio Notification (Optional)</label>
          <div className="mt-1 flex items-center gap-3">
             <Button
                variant="outline"
                type="button"
                className="relative cursor-pointer"
                onClick={() => document.getElementById('audio-upload')?.click()}
             >
                <Upload className="h-4 w-4 mr-2" />
                {audioFile ? "Change Audio" : "Upload Audio"}
                <input
                    id="audio-upload"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAudioFile(e.target.files?.[0] || null)}
                />
             </Button>
             {audioFile && (
                <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1 rounded-md text-sm">
                    <Music className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{audioFile.name}</span>
                    <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => setAudioFile(null)} />
                </div>
             )}
          </div>
        </div>

        <div className="border-t pt-4" />

        {/* Filters & Route Selection */}
        <div className="grid grid-cols-2 gap-4">
          {decodedTokenRole === "superAdmin" && (
            <div className="col-span-2">
              <label className="text-sm font-medium">School <span className="text-red-500">*</span></label>
              <Combobox
                items={schools.map((s: any) => ({ label: s.schoolName, value: s._id }))}
                value={selectedSchoolId}
                onValueChange={(val) => {
                    setSelectedSchoolId(val);
                    setSelectedBranchId(undefined);
                    setSelectedRouteIds([]);
                }}
                placeholder="Select School"
                searchPlaceholder="Search schools..."
                emptyMessage={isLoadingSchools ? "Loading..." : "No school found"}
                width="w-full"
                open={schoolOpen}
                onOpenChange={setSchoolOpen}
              />
            </div>
          )}

          {decodedTokenRole !== "branch" && (
            <div className={decodedTokenRole === "superAdmin" ? "" : "col-span-2"}>
              <label className="text-sm font-medium">Branch <span className="text-red-500">*</span></label>
              <Combobox
                items={branches.map((b: any) => ({ label: b.branchName, value: b._id }))}
                value={selectedBranchId}
                onValueChange={(val) => {
                    setSelectedBranchId(val);
                    setSelectedRouteIds([]);
                }}
                placeholder="Select Branch"
                searchPlaceholder="Search branches..."
                emptyMessage={isLoadingBranches ? "Loading..." : "No branch found"}
                width="w-full"
                disabled={decodedTokenRole === "superAdmin" && !selectedSchoolId}
                open={branchOpen}
                onOpenChange={setBranchOpen}
              />
            </div>
          )}

          <div className="col-span-2">
            <label className="text-sm font-medium">Routes <span className="text-red-500">*</span></label>
            <Combobox
              items={(routes as any[]).map((r: any) => ({ label: r.routeNumber || r.routeName, value: r._id }))}
              multiple
              selectedValues={selectedRouteIds}
              onSelectedValuesChange={setSelectedRouteIds}
              placeholder="Select Routes"
              searchPlaceholder="Search routes..."
              emptyMessage={isLoadingRoutes ? "Loading..." : "No route found"}
              width="w-full"
              disabled={decodedTokenRole !== "branch" && !selectedBranchId}
              open={routeOpen}
              onOpenChange={setRouteOpen}
              className={errors.routes ? "border-red-500" : ""}
            />
            {errors.routes && <p className="text-xs text-red-500 mt-1">{errors.routes}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSending}>
            {isSending ? "Sending..." : "Send Notification"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
