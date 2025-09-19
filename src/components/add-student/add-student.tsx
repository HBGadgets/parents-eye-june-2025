import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "../ui/datePicker";
import { Eye, EyeOff } from "lucide-react";
import { getDecodedToken } from "@/lib/jwt";
import Cookies from "js-cookie";
import { Combobox } from "../ui/combobox";
import { useSchoolData } from "@/hooks/useSchoolData";
import { useBranchData } from "@/hooks/useBranchData";
import { useBranchGroupData } from "@/hooks/useBranchGroup";
import { School } from "@/interface/modal";
import { useRouteData } from "@/hooks/useRouteData";

type UserRole = "superAdmin" | "school" | "branchGroup" | "branch" | null;

export function AddStudentForm() {
  const [activeTab, setActiveTab] = useState<"parent" | "children">("parent");
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedRoute, setSelectedRoute] = useState("");

  // Add parent form state - controlled components
  const [parentData, setParentData] = useState({
    parentName: "",
    username: "",
    email: "",
    mobileNo: "",
    password: "",
  });

  const [children, setChildren] = useState([
    {
      childName: "",
      className: "",
      section: "",
      DOB: undefined as Date | undefined,
      age: "",
      gender: "",
      geofenceId: "",
      routeObjId: "",
    },
  ]);
  const [datePickerStates, setDatePickerStates] = useState<boolean[]>([false]);

  const { data: schoolData } = useSchoolData();
  const { data: branchData } = useBranchData();
  const { data: routeData } = useRouteData();

  // Handle parent input changes
  const handleParentInputChange = (
    field: keyof typeof parentData,
    value: string
  ) => {
    setParentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addSibling = () => {
    setChildren([
      ...children,
      {
        childName: "",
        className: "",
        section: "",
        DOB: undefined,
        age: "",
        gender: "",
        geofenceId: "",
        routeObjId: "",
      },
    ]);
    setDatePickerStates([...datePickerStates, false]);
  };

  const removeSibling = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
      setDatePickerStates(datePickerStates.filter((_, i) => i !== index));
    }
  };

  const updateChild = (
    index: number,
    field: string,
    value: string | Date | undefined
  ) => {
    const updatedChildren = [...children];
    updatedChildren[index] = { ...updatedChildren[index], [field]: value };
    setChildren(updatedChildren);
  };

  // Transform school data for Combobox
  const schoolMetaData = schoolData?.map((item) => ({
    value: item._id,
    label: item.schoolName,
  }));

  // Transform branch data for Combobox
  const branchMetaData = branchData
    ?.filter((branch) =>
      userRole === "superAdmin"
        ? branch?.schoolId?._id === selectedSchool
        : true
    )
    .map((branch) => ({
      value: branch._id,
      label: branch.branchName,
    }));

  // Transform route data for Combobox
  const routeMetaData = routeData
    ?.filter((route) =>
      userRole === "superAdmin" || userRole === "school"
        ? route?.branchId?._id === selectedBranch
        : true
    )
    .map((route) => ({
      value: route._id,
      label: route.routeNumber,
    }));

  const setDatePickerOpen = (index: number, open: boolean) => {
    const newStates = [...datePickerStates];
    newStates[index] = open;
    setDatePickerStates(newStates);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Helper function to remove empty string fields from an object
    const removeEmptyFields = (obj: Record<string, any>) => {
      return Object.fromEntries(
        Object.entries(obj).filter(([key, value]) => {
          // Keep field if it's not an empty string and not null/undefined
          return value !== "" && value != null;
        })
      );
    };

    // If we're on the parent tab, validate and switch to children tab
    if (activeTab === "parent") {
      // Validate parent data using state instead of FormData
      const { parentName, username, email, mobileNo, password } = parentData;

      // Basic validation
      if (!parentName || !username || !password) {
        alert("Please fill in all parent information fields");
        return;
      }

      // Role-based validation
      if (userRole === "superAdmin" && (!selectedSchool || !selectedBranch)) {
        alert("Please select both school and branch");
        return;
      }

      if (
        (userRole === "branchGroup" || userRole === "school") &&
        !selectedBranch
      ) {
        alert("Please select a branch");
        return;
      }

      // Switch to children tab
      setActiveTab("children");
      return;
    }

    // If we're on the children tab, submit the form
    if (activeTab === "children") {
      // Filter out children with empty required fields
      const validChildren = children.filter((child) => {
        // Define required fields - add/remove fields as needed
        const requiredFields = [
          "childName",
          "geofenceId",
          "RouteObjId",
          // Uncomment additional required fields as needed:
          // 'className',
          // 'section',
          // 'age',
          // 'gender'
        ];

        // Check if all required fields are filled
        return requiredFields.every((field) => {
          const value = child[field as keyof typeof child];
          return value && value.toString().trim() !== "";
        });
      });

      // Check if we have at least one valid child
      if (validChildren.length === 0) {
        alert("Please fill in all required fields for at least one child");
        return;
      }

      // Convert dates to strings for submission and add route info
      const childrenData = validChildren.map((child) => {
        const childWithRoute = {
          ...child,
          DOB: child.DOB ? child.DOB.toISOString().split("T")[0] : "",
          routeObjId: selectedRoute, // Use the selected route
        };

        // Remove empty string fields from each child
        return removeEmptyFields(childWithRoute);
      });

      // Prepare parent data with school/branch info
      const parentWithIds = {
        ...parentData,
        schoolId: selectedSchool,
        branchId: selectedBranch,
      };

      // Remove empty string fields from parent data
      const cleanParentData = removeEmptyFields(parentWithIds);

      const formSubmissionData = {
        parent: cleanParentData,
        children: childrenData,
      };

      console.log("Form submitted:", formSubmissionData);

      // Show info about how many children were included
      const totalChildren = children.length;
      const validChildrenCount = validChildren.length;
      const skippedChildren = totalChildren - validChildrenCount;

      let successMessage = `${validChildrenCount} child${
        validChildrenCount > 1 ? "ren" : ""
      } added successfully!`;

      if (skippedChildren > 0) {
        successMessage += ` ${skippedChildren} incomplete child record${
          skippedChildren > 1 ? "s were" : " was"
        } skipped.`;
      }

      // Add your actual form submission logic here
      // Example: await submitStudentForm(formSubmissionData);

      // Show success message and reset form
      alert(successMessage);
      resetForm();
    }
  };

  const resetForm = () => {
    setActiveTab("parent");
    setParentData({
      parentName: "",
      username: "",
      email: "",
      mobileNo: "",
      password: "",
    });
    setChildren([
      {
        childName: "",
        className: "",
        section: "",
        DOB: undefined,
        age: "",
        gender: "",
        geofenceId: "",
        routeObjId: "",
      },
    ]);
    setDatePickerStates([false]);
    setSelectedSchool("");
    setSelectedBranch("");
    setSelectedRoute("");
  };

  useEffect(() => {
    const token = Cookies.get("token");
    const decoded = token ? getDecodedToken(token) : null;
    const role = decoded?.role;

    if (
      typeof role === "string" &&
      ["superAdmin", "school", "branchGroup", "branch"].includes(role)
    ) {
      setUserRole(role as UserRole);
    }
  }, []);

  return (
    <Dialog onOpenChange={(open) => !open && resetForm()}>
      <DialogTrigger asChild>
        <button className="bg-yellow-400 hover:bg-yellow-500 text-[#733e0a] font-semibold py-2 px-4 rounded-md cursor-pointer">
          Add Student
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Student Information</DialogTitle>
          <DialogDescription>
            Choose to add parent information or children details. You can add
            multiple siblings for child.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "parent" | "children")
          }
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="parent"
              className="flex items-center gap-2 cursor-pointer"
            >
              Parent
            </TabsTrigger>
            <TabsTrigger
              value="children"
              className="flex items-center gap-2 cursor-pointer"
            >
              Child
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <TabsContent value="parent" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="parentName">Parent</Label>
                      <Input
                        id="parentName"
                        name="parentName"
                        value={parentData.parentName}
                        onChange={(e) =>
                          handleParentInputChange("parentName", e.target.value)
                        }
                        placeholder="Enter parent name"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        name="username"
                        value={parentData.username}
                        onChange={(e) =>
                          handleParentInputChange("username", e.target.value)
                        }
                        placeholder="Enter username"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={parentData.email}
                        onChange={(e) =>
                          handleParentInputChange("email", e.target.value)
                        }
                        placeholder="Enter email"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="mobileNo">Mobile Number</Label>
                      <Input
                        id="mobileNo"
                        name="mobileNo"
                        value={parentData.mobileNo}
                        onChange={(e) =>
                          handleParentInputChange("mobileNo", e.target.value)
                        }
                        placeholder="Enter mobile number"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={parentData.password}
                        onChange={(e) =>
                          handleParentInputChange("password", e.target.value)
                        }
                        placeholder="Enter password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Role-based conditional rendering */}
                  {userRole === "superAdmin" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="schoolId">School</Label>
                        <Combobox
                          items={schoolMetaData || []}
                          value={selectedSchool}
                          onValueChange={setSelectedSchool}
                          placeholder="Select a School..."
                          emptyMessage="No schools found"
                          width="w-[300px]"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="branchId">Branch</Label>
                        <Combobox
                          items={branchMetaData || []}
                          value={selectedBranch}
                          onValueChange={setSelectedBranch}
                          placeholder="Select a Branch..."
                          emptyMessage={
                            selectedSchool
                              ? "No branches found"
                              : "Please select school"
                          }
                          width="w-[300px]"
                        />
                      </div>
                    </div>
                  )}

                  {(userRole === "branchGroup" || userRole === "school") && (
                    <div className="grid gap-2">
                      <Label htmlFor="branchId">Branch</Label>
                      <Combobox
                        items={branchMetaData || []}
                        value={selectedBranch}
                        onValueChange={setSelectedBranch}
                        placeholder="Select a Branch..."
                        emptyMessage="No branches found"
                        width="w-[300px]"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="children"
                className="space-y-4 mt-4 h-[55vh] pr-4"
              >
                <div className="space-y-6">
                  {children.map((child, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-4 bg-gray-50"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-lg">
                          Child {index + 1}
                        </h4>
                        {children.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeSibling(index)}
                            className="cursor-pointer"
                          >
                            ✕ Remove
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`childName-${index}`}>
                            Child Name
                          </Label>
                          <Input
                            id={`childName-${index}`}
                            value={child.childName}
                            onChange={(e) =>
                              updateChild(index, "childName", e.target.value)
                            }
                            placeholder="Enter child name"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`className-${index}`}>Class</Label>
                          <Input
                            id={`className-${index}`}
                            value={child.className}
                            onChange={(e) =>
                              updateChild(index, "className", e.target.value)
                            }
                            placeholder="e.g., 12th"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`section-${index}`}>Section</Label>
                          <Input
                            id={`section-${index}`}
                            value={child.section}
                            onChange={(e) =>
                              updateChild(index, "section", e.target.value)
                            }
                            placeholder="e.g., A"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <DatePicker
                            label="Date of Birth"
                            open={datePickerStates[index] || false}
                            setOpen={(open) => setDatePickerOpen(index, open)}
                            date={child.DOB}
                            setDate={(date) => updateChild(index, "DOB", date)}
                            className="w-full"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`age-${index}`}>Age</Label>
                          <Input
                            id={`age-${index}`}
                            type="number"
                            min={0}
                            value={child.age}
                            onChange={(e) =>
                              updateChild(index, "age", e.target.value)
                            }
                            placeholder="Enter age"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`gender-${index}`}>Gender</Label>
                          <Select
                            value={child.gender}
                            onValueChange={(value) =>
                              updateChild(index, "gender", value)
                            }
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`routeObjId-${index}`}>
                            Route Number
                          </Label>
                          <Combobox
                            items={routeMetaData || []}
                            value={selectedRoute}
                            onValueChange={setSelectedRoute}
                            placeholder="Select Route No. ..."
                            emptyMessage={
                              selectedBranch
                                ? "No routes found"
                                : "Please select branch"
                            }
                            width="w-[300px]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`geofenceId-${index}`}>
                            Geofence
                          </Label>
                          <Input
                            id={`geofenceId-${index}`}
                            value={child.geofenceId}
                            onChange={(e) =>
                              updateChild(index, "geofenceId", e.target.value)
                            }
                            placeholder="Enter geofence"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSibling}
                    className="w-full border-dashed border-2 py-6 text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
                  >
                    + Add Another Sibling
                  </Button>
                </div>
              </TabsContent>
            </form>
          </div>
        </Tabs>

        <DialogFooter className="pt-4">
          <DialogClose asChild>
            <Button variant="outline" className="cursor-pointer">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={handleSubmit}
            className="hover:bg-yellow-500 text-[#733e0a] cursor-pointer"
          >
            {activeTab === "parent"
              ? "Next"
              : `Add ${children.length} Child${
                  children.length > 1 ? "ren" : ""
                }`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
