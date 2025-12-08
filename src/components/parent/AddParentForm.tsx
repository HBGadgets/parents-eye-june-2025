"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Parent } from "@/interface/modal";

interface Props {
  onSubmit: (data: {
    parentName: string;
    mobileNo: string;
    email: string;
    username: string;
    password?: string;
    schoolId?: string;
    branchId?: string;
  }) => void;

  onClose: () => void;
  initialData?: Parent | null;

  schools: { _id: string; schoolName: string }[];
  branches: { _id: string; branchName: string }[];

  selectedSchoolId?: string;
  selectedBranchId?: string;

  onSchoolChange?: (id?: string) => void;
  onBranchChange?: (id?: string) => void;

  decodedToken?: {
    role: string;
    schoolId?: string;
    id?: string;
    branchId?: string;
  };
}

export default function AddParentForm({
  onSubmit,
  onClose,
  initialData,
  schools,
  branches,
  selectedSchoolId,
  selectedBranchId,
  onSchoolChange,
  onBranchChange,
  decodedToken,
}: Props) {
  const [parentName, setParentName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const decodedTokenRole = decodedToken?.role;
  const tokenSchoolId =
    decodedTokenRole === "school" ? decodedToken?.id : decodedToken?.schoolId;
  const tokenBranchId = decodedToken?.id;

  /* ✅ Token based auto selection */
  useEffect(() => {
    if (decodedTokenRole === "school" && tokenSchoolId) {
      onSchoolChange?.(tokenSchoolId);
    }

    if (decodedTokenRole === "branch" && tokenBranchId) {
      onBranchChange?.(tokenBranchId);
    }
  }, []);

  /* ✅ Edit Prefill */
  useEffect(() => {
    if (initialData) {
      setParentName(initialData.parentName);
      setMobileNo(initialData.mobileNo);
      setEmail(initialData.email);
      setUsername(initialData.username);
      onSchoolChange?.(initialData.schoolId?._id);
      onBranchChange?.(initialData.branchId?._id);
    }
  }, [initialData]);

  const handleSave = () => {
    onSubmit({
      parentName,
      mobileNo,
      email,
      username,
      ...(initialData ? {} : { password }),
      schoolId: selectedSchoolId,
      branchId: selectedBranchId,
    });
  };

  return (
    <Card className="w-[420px] shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? "Edit Parent" : "Add Parent"}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* NAME */}
        <div>
          <label className="text-sm font-medium">Parent Name *</label>
          <Input
            placeholder="Enter parent name"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            required
          />
        </div>

        {/* MOBILE */}
        <div>
          <label className="text-sm font-medium">Mobile No *</label>
          <Input
            placeholder="Enter mobile number"
            value={mobileNo}
            onChange={(e) => setMobileNo(e.target.value)}
            required
          />
        </div>

        {/* EMAIL */}
        <div>
          <label className="text-sm font-medium">Email</label>
          <Input
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* USERNAME */}
        <div>
          <label className="text-sm font-medium">Username *</label>
          <Input
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {/* PASSWORD */}
        {!initialData && (
          <div>
            <label className="text-sm font-medium">Password *</label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}

        {/* SCHOOL */}
        {decodedTokenRole === "superAdmin" && (
          <div>
            <label className="text-sm font-medium">School *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {schools.find((s) => s._id === selectedSchoolId)
                    ?.schoolName || "Select School"}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search school..." />
                  <CommandEmpty>No schools found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {schools.map((s) => (
                      <CommandItem
                        key={s._id}
                        onSelect={() => onSchoolChange?.(s._id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            s._id === selectedSchoolId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {s.schoolName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* BRANCH */}
        {decodedTokenRole !== "branch" && (
          <div>
            <label className="text-sm font-medium">Branch *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  disabled={
                    decodedTokenRole === "superAdmin" && !selectedSchoolId
                  }
                >
                  {branches.find((b) => b._id === selectedBranchId)
                    ?.branchName ||
                    (selectedSchoolId
                      ? "Select Branch"
                      : "Select school first")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0">
                <Command>
                  <CommandInput placeholder="Search branch..." />
                  <CommandEmpty>No branches found</CommandEmpty>
                  <CommandGroup className="max-h-[220px] overflow-y-auto">
                    {branches.map((b) => (
                      <CommandItem
                        key={b._id}
                        onSelect={() => onBranchChange?.(b._id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4",
                            b._id === selectedBranchId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {b.branchName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-primary" onClick={handleSave}>
            {initialData ? "Update" : "Create"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
