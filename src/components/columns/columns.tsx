import { ColumnDef } from "@tanstack/react-table";
import {
  AlertsAndEventsReport,
  Category,
  Device,
  Driver,
  Geofence,
  GeofenceAlerts,
  IdleReport,
  LiveTrack,
  Model,
  Parent,
  Route,
  StatusReport,
  StopReport,
  Student,
  Supervisor,
  TripReport,
} from "@/interface/modal";
import { CellContent } from "@/components/ui/CustomTable";
import { Eye, EyeOff, Locate } from "lucide-react";
import { calculateTimeSince } from "@/util/calculateTimeSince";
import React, { useMemo } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { statusIconMap } from "@/components/statusIconMap";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export const getModelColumns = (
  setEditTarget: (row: Model) => void,
  setDeleteTarget: (row: Model) => void
): ColumnDef<Model, CellContent>[] => [
  {
    header: "Model Name",
    accessorFn: (row) => ({
      type: "text",
      value: row.modelName ?? "",
    }),
    meta: { minWidth: 570 },
    enableHiding: true,
  },

  {
    header: "Action",
    accessorFn: (row) => ({
      type: "group",
      items: [
        {
          type: "button",
          label: "Edit",
          onClick: () => setEditTarget(row),
          className:
            "cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white",
        },
        {
          type: "button",
          label: "Delete",
          onClick: () => setDeleteTarget(row),
          className: "cursor-pointer bg-red-500 hover:bg-red-600 text-white",
        },
      ],
    }),
    meta: { minWidth: 570 },
    enableSorting: false,
    enableHiding: true,
  },
];

export const getCategoryColumns = (
  setEditTarget: (row: Category) => void,
  setDeleteTarget: (row: Category) => void
): ColumnDef<Category, CellContent>[] => [
  {
    header: "Category Name",
    accessorFn: (row) => ({
      type: "text",
      value: row.categoryName ?? "",
    }),
    meta: { minWidth: 570 },
  },
  {
    header: "Action",
    accessorFn: (row) => ({
      type: "group",
      items: [
        {
          type: "button",
          label: "Edit",
          onClick: () => setEditTarget(row),
          className: "bg-yellow-500 hover:bg-yellow-600 text-white",
        },
        {
          type: "button",
          label: "Delete",
          onClick: () => setDeleteTarget(row),
          className: "bg-red-500 hover:bg-red-600 text-white",
        },
      ],
    }),
    meta: { minWidth: 570 },
    enableSorting: false,
  },
];

export const getRouteColumns = (
  onEdit: (row: Route) => void,
  onDelete: (row: Route) => void
): ColumnDef<Route>[] => [
  {
    header: "Route No",
    accessorKey: "routeNumber",
  },
  {
    header: "Device",
    accessorKey: "deviceObjId.name",
  },
  {
    header: "School",
    accessorKey: "schoolId.schoolName",
  },
  {
    header: "Branch",
    accessorKey: "branchId.branchName",
  },
  {
    id: "firstGeofence",
    header: "First Stop",
    accessorFn: (row: Route) => row.startPointGeoId?.geofenceName ?? "—",
  },
  {
    id: "firstGeofenceAddress",
    header: "First Stop Address",
    accessorFn: (row: Route) => row.startPointGeoId?.address ?? "—",
    meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
  },
  {
    id: "lastGeofence",
    header: "School Point (last stop)",
    accessorFn: (row: Route) => row.endPointGeoId?.geofenceName ?? "—",
  },
  {
    id: "lastGeofenceAddress",
    header: "School Point (last stop)",
    accessorFn: (row: Route) => row.endPointGeoId?.address ?? "—",
    meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
  },
  {
    header: "Route Completion Time",
    accessorFn: (row: Route) =>
      `${row.routeCompletionTime ? `${row.routeCompletionTime} Min` : "—"}`,
  },
  {
    header: "Action",
    cell: ({ row }) => {
      const data = row.original;

      return (
        <div className="flex justify-center gap-2">
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(data);
            }}
          >
            Edit
          </button>

          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(data);
            }}
          >
            Delete
          </button>
        </div>
      );
    },
    enableSorting: false,
  },
];

export const getStudentColumns = (
  onEdit: (row: Student) => void,
  onDelete: (row: Student) => void
): ColumnDef<Student>[] => [
  {
    header: "Student Name",
    accessorKey: "childName",
  },
  {
    header: "Class",
    accessorKey: "className",
  },
  {
    header: "Section",
    accessorKey: "section",
  },
  {
    header: "Age",
    accessorKey: "age",
  },
  {
    header: "Parent Name",
    accessorFn: (row: Student) => row.parentId?.parentName ?? "—",
  },
  {
    id: "pickupLocation",
    header: "Pickup Location",
    accessorFn: (row: Student) => row.pickupGeoId?.geofenceName ?? "—",
  },
  {
    id: "pickupTime",
    header: "Pickup Time",
    accessorFn: (row: Student) => row.pickupGeoId?.pickupTime ?? "—",
  },
  {
    id: "dropLocation",
    header: "Drop Location",
    accessorFn: (row: Student) => row.dropGeoId?.geofenceName ?? "—",
  },
  {
    id: "dropTime",
    header: "Drop Time",
    accessorFn: (row: Student) => row.dropGeoId?.dropTime ?? "—",
  },
  {
    id: "route",
    headers: "Route",
    accessorFn: (row: Student) => row.routeObjId?.routeNumber ?? "—",
  },
  {
    id: "school",
    headers: "School",
    accessorFn: (row: Student) => row.schoolId?.schoolName ?? "—",
  },
  {
    id: "branch",
    headers: "Branch",
    accessorFn: (row: Student) => row.branchId?.branchName ?? "—",
  },
  {
    id: "registerationDate",
    headers: "Registeration Date",
    accessorFn: (row: Student) => new Date(row.createdAt).toLocaleDateString(),
  },
  {
    header: "Action",
    cell: ({ row }) => {
      const data = row.original;

      return (
        <div className="flex justify-center gap-2">
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(data);
            }}
          >
            Edit
          </button>

          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(data);
            }}
          >
            Delete
          </button>
        </div>
      );
    },
    enableSorting: false,
  },
];

// DEVICE COLUMNS START
const getDaysRemaining = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getExpiryStyle = (days: number) => {
  switch (true) {
    case days === 0:
      return {
        color: "bg-red-100 text-red-700",
        message: "Subscription expires today",
      };

    case days < 0:
      return {
        color: "bg-red-100 text-red-700",
        message: "Subscription expired",
      };

    case days <= 15:
      return {
        color: "bg-orange-100 text-orange-700",
        message: `Expiring in ${days} day${days === 1 ? "" : "s"}`,
      };

    case days <= 30:
      return {
        color: "bg-yellow-100 text-yellow-700",
        message: `Expiring in ${days} days`,
      };

    default:
      return {
        color: "bg-green-100 text-green-700",
        message: `Valid for ${days} more days`,
      };
  }
};

export const getDeviceColumns = (
  onEdit: (row: Device) => void,
  onDelete: (row: Device) => void
): ColumnDef<Device>[] => [
  {
    header: "Device Name",
    accessorKey: "name",
  },
  {
    header: "Unique Id",
    accessorKey: "uniqueId",
  },
  {
    header: "Sim No",
    accessorKey: "sim",
  },
  {
    header: "OverSpeed km/h",
    accessorKey: "speed",
  },
  {
    header: "Average km/l",
    accessorKey: "average",
  },

  {
    header: "Model",
    accessorKey: "model",
  },
  {
    header: "Category",
    accessorKey: "category",
  },
  {
    header: "Key Feature",
    accessorKey: "keyFeature",
    cell: ({ row }) => {
      const value = row.original.keyFeature;

      return (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}
        >
          {value ? "Key switch available" : "Key switch not available"}
        </span>
      );
    },
  },
  {
    id: "school",
    header: "School",
    accessorFn: (row: Device) => row.schoolId?.schoolName ?? "—",
  },
  {
    id: "branch",
    header: "Branch",
    accessorFn: (row: Device) => row.branchId?.branchName ?? "—",
  },
  {
    id: "route",
    header: "Route",
    accessorFn: (row: Device) => row.routeObjId?.routeNumber ?? "—",
  },
  {
    id: "driver",
    header: "Driver",
    accessorFn: (row: Device) => row.driverObjId?.driverName ?? "—",
  },
  {
    id: "subscriptionEndDate",
    header: "Subscription End",
    cell: ({ row }: any) => {
      const value = row.original.subscriptionEndDate;
      if (!value) return "-";

      const date = new Date(value);
      const daysRemaining = getDaysRemaining(value);
      const { color, message } = getExpiryStyle(daysRemaining);

      const formattedDate = date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: true,
        timeZone: "UTC",
      });

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`px-2 py-1 rounded-md text-sm font-medium inline-block ${color}`}
              >
                {formattedDate}
              </div>
            </TooltipTrigger>

            <TooltipContent side="top" align="center">
              <p className="text-sm">{message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },

    meta: {
      wrapConfig: {
        wrap: "break-word",
        maxWidth: "200px",
      },
    },
    enableHiding: true,
    enableSorting: true,
  },
];
// DEVICE COLUMNS END

export const getLiveVehicleColumns = (): ColumnDef<LiveTrack>[] => [
  {
    id: "status",
    header: "Status",
    cell: ({ row }: any) => {
      const vehicle = row.original;
      const vehicleStatus = useMemo(() => {
        const lastUpdateTime = new Date(vehicle.lastUpdate).getTime();
        const currentTime = new Date().getTime();
        const timeDifference = currentTime - lastUpdateTime;
        const thirtyFiveHoursInMs = 35 * 60 * 60 * 1000;

        // Check for overspeeding
        const speedLimit = parseFloat(vehicle.speedLimit) || 60;
        if (vehicle.speed > speedLimit) return "overspeed";

        // Check if vehicle is inactive
        if (vehicle.latitude === 0 && vehicle.longitude === 0) return "noData";

        if (timeDifference > thirtyFiveHoursInMs) return "inactive";

        // Extract vehicle attributes
        const { ignition } = vehicle.attributes;
        const speed = vehicle.speed;
        if (ignition === true) {
          if (speed > 5 && speed < speedLimit) {
            return "running";
          } else {
            return "idle";
          }
        } else if (ignition === false) {
          return "stopped";
        }
      }, [
        vehicle.speed,
        vehicle.speedLimit,
        vehicle.lastUpdate,
        vehicle.attributes.ignition,
      ]);

      const imageUrl = useMemo(() => {
        const statusToImageUrl = {
          running: "/bus/side-view/green-bus.svg",
          idle: "/bus/side-view/yellow-bus.svg",
          stopped: "/bus/side-view/red-bus.svg",
          inactive: "/bus/side-view/grey-bus.svg",
          overspeed: "/bus/side-view/orange-bus.svg",
          noData: "/bus/side-view/blue-bus.svg",
        };
        return (
          statusToImageUrl[
            String(vehicleStatus) as keyof typeof statusToImageUrl
          ] || statusToImageUrl.inactive
        );
      }, [vehicleStatus]);

      return (
        <div>
          <img src={imageUrl} className="w-20" alt="school bus status" />
        </div>
      );
    },
    meta: { flex: 1, maxWidth: 80 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "name",
    header: "vehicle",
    accessorFn: (row: any) => row.name ?? "N/A",
    meta: {
      wrapConfig: {
        wrap: "break-word",
        maxWidth: "200px",
      },
    },
    enableHiding: true,
    enableSorting: true,
  },
  {
    header: "No. of Students",
    accessorKey: "noOfStudent",
  },
  {
    header: "No. of Stops",
    accessorKey: "noOfStops",
  },
  {
    header: "Route No.",
    accessorKey: "routeName",
  },
  {
    id: "lastUpdate",
    header: "Last Update",
    cell: ({ row }: any) => {
      const value = row.original.lastUpdate;

      if (!value) return "-";

      const date = new Date(value);

      return (
        <div>
          {date.toLocaleString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZone: "UTC",
          })}
        </div>
      );
    },

    meta: {
      wrapConfig: {
        wrap: "break-word",
        maxWidth: "200px",
      },
    },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "since",
    header: "Since",
    cell: ({ row }: any) => {
      const timeSince = calculateTimeSince(row.original.lastUpdate);
      return <div>{timeSince}</div>;
    },
    meta: { flex: 1, minWidth: 100, maxWidth: 200 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "battery",
    header: "Battery",
    cell: ({ row }: any) => {
      const batteryLevel = row.original.batteryLevel ?? 0;
      const batteryPercentage = Math.min(Math.max(batteryLevel, 20), 100);

      const segments = 4;
      const filledSegments = Math.ceil(batteryPercentage / (100 / segments));

      const getSegmentColor = (segmentIndex: number, totalFilled: number) => {
        if (segmentIndex >= totalFilled) return "bg-gray-200";

        if (totalFilled <= 2) return "bg-red-500";
        if (totalFilled <= 3) return "bg-orange-500";
        if (totalFilled <= 3) return "bg-yellow-500";
        return "bg-green-500";
      };

      return (
        <div className="flex items-center space-x-2 rotate-[-90deg] relative bottom-4">
          <div className="relative flex">
            <div className="flex space-x-0.5 p-0.5 border border-gray-400 bg-white">
              {[...Array(segments)].map((_, index) => (
                <div
                  key={index}
                  className={`w-[4px] h-2 rounded-sm transition-colors duration-200 ${getSegmentColor(
                    index,
                    filledSegments
                  )}`}
                />
              ))}
            </div>
            <div className="w-0.5 h-1 bg-gray-400 rounded-r-sm self-center ml-0.5" />
          </div>
        </div>
      );
    },
    meta: { flex: 1, minWidth: 130, maxWidth: 180 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "gsm",
    header: "GSM",
    cell: ({ row }: any) => {
      const device = row.original;
      const cellTowers = device.gsmSignal || 0;
      const towerCount = Math.min(cellTowers, 5);

      const renderSignalBars = (count: number) => {
        const bars = [];
        const maxBars = 5;

        for (let i = 1; i <= maxBars; i++) {
          const isActive = i <= count;
          const height = `${i * 3 + 3}px`;

          bars.push(
            <div
              key={i}
              className={`w-1 rounded-sm transition-colors duration-200 ${
                isActive
                  ? count <= 1
                    ? "bg-red-500"
                    : count <= 2
                    ? "bg-yellow-500"
                    : count <= 3
                    ? "bg-green-400"
                    : "bg-green-600"
                  : "bg-gray-200"
              }`}
              style={{ height }}
            />
          );
        }

        return bars;
      };

      const getSignalLabel = (count: number) => {
        if (count === 0) return { label: "No Signal", color: "text-red-600" };
        if (count === 1) return { label: "Very Weak", color: "text-red-600" };
        if (count === 2) return { label: "Weak", color: "text-yellow-600" };
        if (count === 3) return { label: "Good", color: "text-green-600" };
        if (count >= 4) return { label: "Strong", color: "text-green-700" };
        return { label: "Unknown", color: "text-gray-600" };
      };

      const signalInfo = getSignalLabel(towerCount);

      return (
        <div className="flex items-center space-x-3">
          <div
            className="flex items-end space-x-0.5"
            title={`${towerCount} cell towers detected`}
          >
            {renderSignalBars(towerCount)}
          </div>

          <div className="flex flex-col">
            <span className={`text-xs font-medium ${signalInfo.color}`}>
              {/* {signalInfo.label} */}
            </span>
          </div>
        </div>
      );
    },
    meta: { flex: 1, minWidth: 120, maxWidth: 180 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "gps",
    header: "GPS",
    cell: ({ row }: any) => {
      const gps = row.original.attributes.sat;
      return (
        <div className="relative flex items-center justify-center">
          <Locate className="w-8 h-8 text-gray-400" />
          <span className="absolute text-xs font-bold text-gray-700">
            {gps}
          </span>
        </div>
      );
    },
    meta: { flex: 1, minWidth: 100, maxWidth: 200 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "speed",
    header: "Speed (km/h)",
    accessorFn: (row: any) => row.speed?.toFixed(2) ?? "N/A",
    meta: { flex: 1, minWidth: 100, maxWidth: 200 },
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "ig",
    header: "Ignition",
    cell: ({ row }: any) => {
      const status = row.original.status || "unknown";
      const statusColor = status ? "green" : "red";
      return (
        <div
          style={{ color: `${statusColor}`, fontSize: "1.1rem" }}
          className="flex items-center justify-center"
        >
          <svg
            stroke="currentColor"
            fill="currentColor"
            strokeWidth="0"
            viewBox="0 0 256 256"
            height="1em"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M256,120v48a16,16,0,0,1-16,16H227.31L192,219.31A15.86,15.86,0,0,1,180.69,224H103.31A15.86,15.86,0,0,1,92,219.31L52.69,180A15.86,15.86,0,0,1,48,168.69V148H24v24a8,8,0,0,1-16,0V108a8,8,0,0,1,16,0v24H48V80A16,16,0,0,1,64,64h60V40H100a8,8,0,0,1,0-16h64a8,8,0,0,1,0,16H140V64h40.69A15.86,15.86,0,0,1,192,68.69L227.31,104H240A16,16,0,0,1,256,120Z"></path>
          </svg>
        </div>
      );
    },
    meta: { flex: 1, minWidth: 100, maxWidth: 200 },
    enableHiding: true,
    enableSorting: true,
  },
];

export const getParentsColumns = (
  onEdit: (row: Parent) => void,
  onDelete: (row: Parent) => void
): ColumnDef<Parent>[] => [
  {
    header: "Parent Name",
    accessorKey: "parentName",
  },
  {
    header: "Username",
    accessorKey: "username",
  },
  {
    header: "Password",
    accessorKey: "password",
    cell: ({ row }) => {
      const [show, setShow] = React.useState(false);
      const password = row.original.password;

      return (
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono">
            {show ? password : "•".repeat(password?.length || 8)}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShow((prev) => !prev);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {show ? (
              <EyeOff className="h-4 w-4 text-gray-700" />
            ) : (
              <Eye className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      );
    },
  },
  {
    header: "Email",
    accessorKey: "email",
  },
  { header: "Mobile No.", accessorKey: "mobileNo" },
  {
    id: "school",
    header: "School",
    accessorFn: (row: Parent) => row.schoolId?.schoolName ?? "—",
  },
  {
    id: "branch",
    header: "Branch",
    accessorFn: (row: Parent) => row.branchId?.branchName ?? "—",
  },
  {
    id: "registerationDate",
    headers: "Registeration Date",
    accessorFn: (row: Parent) => new Date(row.createdAt).toLocaleDateString(),
  },
  {
    header: "Action",
    cell: ({ row }) => {
      const data = row.original;

      return (
        <div className="flex justify-center gap-2">
          <button
            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(data);
            }}
          >
            Edit
          </button>

          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-xs cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(data);
            }}
          >
            Delete
          </button>
        </div>
      );
    },
    enableSorting: false,
  },
];

export const getGeofenceCoumns = (
  onEdit: (row: Geofence) => void,
  onDelete: (row: Geofence) => void
): ColumnDef<Geofence>[] => [
  {
    id: "name",
    header: "Device Name",
    accessorFn: (row) => row.route?.device?.name || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "geofenceName",
    header: "Geofence Name",
    accessorFn: (row) => row.geofenceName || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "address",
    headers: "Address",
    accessorFn: (row) => row.address || "N/A",
    enableHiding: false,
    enableSorting: false,
    meta: { wrapConfig: { wrap: "wrap", minWidth: "360px" } },
  },
  {
    id: "schoolName",
    header: "School Name",
    accessorFn: (row) => row.school?.schoolName || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "branchName",
    header: "Branch Name",
    accessorFn: (row) => row.branch?.branchName || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "routeNumber",
    header: "Route Number",
    accessorFn: (row) => row.route?.routeNumber || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "pickupTime",
    header: "Pickup Time",
    accessorFn: (row) => row.pickupTime || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "dropTime",
    header: "Drop Time",
    accessorFn: (row) => row.dropTime || "N/A",
    enableHiding: true,
    enableSorting: true,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original); // Use the callback
          }}
          className="cursor-pointer bg-[#f3c623] hover:bg-[#D3A80C]"
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original); // Use the callback
          }}
          className="cursor-pointer hover:bg-red-700"
        >
          Delete
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export const getDriverColumns = (
  onEdit: (row: Driver) => void,
  onDelete: (row: Driver) => void
): ColumnDef<Driver>[] => [
  {
    header: "Driver Name",
    accessorKey: "driverName",
  },
  {
    header: "Mobile No",
    accessorKey: "mobileNo",
  },
  {
    header: "Email",
    accessorKey: "email",
  },
  {
    id: "School",
    header: "school",
    accessorFn: (row: Driver) => row.schoolId?.schoolName ?? "—",
  },
  {
    id: "Branch",
    header: "branch",
    accessorFn: (row: Driver) => row.branchId?.branchName ?? "—",
  },
  {
    id: "vehicleNo",
    header: "vehicle No",
    accessorFn: (row: Driver) => row.deviceObjId?.name ?? "—",
  },
  {
    id: "route",
    header: "Route",
    accessorFn: (row: Driver) => row.routeObjId?.routeNumber ?? "—",
  },
  {
    header: "Username",
    accessorKey: "username",
  },
  {
    header: "Password",
    accessorKey: "password",
    cell: ({ row }) => {
      const [show, setShow] = React.useState(false);
      const password = row.original.password;

      return (
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono">
            {show ? password : "•".repeat(password?.length || 8)}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShow((prev) => !prev);
            }}
            className="p-1 hover:bg-gray-200 rounded cursor-pointer"
          >
            {show ? (
              <EyeOff className="h-4 w-4 text-gray-700" />
            ) : (
              <Eye className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      );
    },
  },
  {
    id: "registrationDate",
    header: "Registration Date",
    accessorFn: (row: Device) => new Date(row.createdAt).toLocaleDateString(),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original); // Use the callback
          }}
          className="cursor-pointer bg-[#f3c623] hover:bg-[#D3A80C]"
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original); // Use the callback
          }}
          className="cursor-pointer hover:bg-red-700"
        >
          Delete
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export const getSupervisorColumns = (
  onEdit: (row: Supervisor) => void,
  onDelete: (row: Supervisor) => void
): ColumnDef<Supervisor>[] => [
  { header: "Supervisor Name", accessorKey: "supervisorName" },
  { header: "Email", accessorKey: "email" },
  { header: "Mobile No", accessorKey: "mobileNo" },
  { header: "Username", accessorKey: "username" },
  {
    header: "Password",
    accessorKey: "password",
    cell: ({ row }) => {
      const [show, setShow] = React.useState(false);
      const password = row.original.password;

      return (
        <div className="flex items-center justify-center gap-2">
          <span className="font-mono">
            {show ? password : "•".repeat(password?.length || 8)}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShow((prev) => !prev);
            }}
            className="p-1 hover:bg-gray-200 rounded cursor-pointer"
          >
            {show ? (
              <EyeOff className="h-4 w-4 text-gray-700" />
            ) : (
              <Eye className="h-4 w-4 text-gray-700" />
            )}
          </button>
        </div>
      );
    },
  },
  {
    id: "school",
    header: "School",
    accessorFn: (row: Supervisor) => row.schoolId?.schoolName ?? "—",
  },
  {
    id: "branch",
    header: "Branch",
    accessorFn: (row: Supervisor) => row.branchId?.branchName ?? "—",
  },
  {
    id: "route",
    header: "Route",
    accessorFn: (row: Supervisor) => row.routeObjId?.routeNumber ?? "—",
  },
  {
    id: "vehicleNo",
    header: "Vehicle No",
    accessorFn: (row: Supervisor) => row.deviceObjId?.name ?? "—",
  },
  {
    id: "registrationDate",
    header: "Registration Date",
    accessorFn: (row: Supervisor) =>
      new Date(row.createdAt).toLocaleDateString(),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row.original); // Use the callback
          }}
          className="cursor-pointer bg-[#f3c623] hover:bg-[#D3A80C]"
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(row.original); // Use the callback
          }}
          className="cursor-pointer hover:bg-red-700"
        >
          Delete
        </Button>
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];

export const getStatusReportColumns = (): ColumnDef<StatusReport>[] => [
  {
    header: "Status",
    accessorKey: "vehicleStatus",
    cell: ({ getValue }) => {
      const status = getValue<VehicleStatus>();
      const config = statusIconMap[status];
      if (!config) return <span>-</span>;
      const statusColorMap: Record<string, string> = {
        "Vehicle Stopped": "text-red-600 bg-red-100",
        "Vehicle Running": "text-green-600 bg-green-100",
        "Vehicle Idle": "text-yellow-600 bg-yellow-100",
        "Vehicle Overspeed": "text-orange-600 bg-orange-100",
      };


      return (
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Image
                src={config.src}
                alt={config.label}
                // title={config.label}
                width={40}
                height={40}
                className="cursor-pointer"
              />
            </TooltipTrigger>
            <TooltipContent
              className={`font-semibold ${
                statusColorMap[config.label] ?? "text-gray-600"
              }`}
            >
              {config.label}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
  {
    header: "Vehicle No",
    accessorKey: "name",
  },
  {
    header: "Start Time",
    accessorFn: (row) =>
      new Date(row.startDateTime).toLocaleString("en-GB", {
        hour12: true,
        timeZone: "UTC",
      }),
  },
  {
    header: "Start Location",
    accessorKey: "startLocation",
    meta: { wrapConfig: { wrap: "wrap", maxWidth: "260px" } },
  },
  {
    header: "Start Coordinates",
    accessorFn: (row) =>
      `${row.startCoordinate.latitude},${row.startCoordinate.longitude}`,
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const [lat, lng] = value.split(",");

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {lat}, {lng}
            </a>
          </TooltipTrigger>
          <TooltipContent>Open in Google Maps</TooltipContent>
        </Tooltip>
      );
    },
    meta: { wrapConfig: { wrap: "wrap", maxWidth: "260px" } },
    enableSorting: true,
  },
  {
    header: "Duration",
    accessorKey: "time",
  },
  {
    header: "Distance (km)",
    accessorFn: (row) =>
      row.distance != null ? (row.distance / 1000).toFixed(2) : "0.00",
  },
  {
    header: "Max Speed",
    accessorKey: "maxSpeed",
  },
  {
    header: "End Time",
    accessorFn: (row) =>
      new Date(row.endDateTime).toLocaleString("en-GB", {
        hour12: true,
        timeZone: "UTC",
      }),
  },
  {
    header: "End Location",
    accessorKey: "endLocation",
    meta: { wrapConfig: { wrap: "wrap", maxWidth: "260px" } },
  },
  {
    header: "End Coordinates",
    accessorFn: (row) =>
      `${row.endCoordinate.latitude},${row.endCoordinate.longitude}`,
    cell: ({ getValue }) => {
      const value = getValue<string>();
      const [lat, lng] = value.split(",");

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {lat}, {lng}
            </a>
          </TooltipTrigger>
          <TooltipContent>Open in Google Maps</TooltipContent>
        </Tooltip>
      );
    },
    meta: { wrapConfig: { wrap: "wrap", maxWidth: "260px" } },
    enableSorting: true,
  }
];


export const getStopReportColumns = (): ColumnDef<StatusReport>[] => [
  {
    header: "Status",
    accessorKey: "vehicleStatus",

    cell: () => {
      const status = "Ignition Off";
      const config = statusIconMap[status];

      if (!config) return "-";

      return (
        <div className="flex justify-center">
          <Image
            src={config.src}
            alt={config.label}
            title={config.label}
            width={40}
            height={40}
            className="cursor-pointer"
          />
        </div>
      );
    },
  },
  {
    header: "Vehicle No",
    accessorKey: "name",
  },
  {
    header: "Start Time",
    accessorFn: (row: StopReport) =>
      new Date(row.arrivalTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
  },
  {
    header: "Duration",
    accessorKey: "time",
  },
  {
    header: "End Time",
    accessorFn: (row: StopReport) =>
      new Date(row.departureTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
  },
  {
    header: "Address",
    accessorKey: "address",
  },
  {
    header: "Coordinates",
    cell: ({ row }: { row: any }) => {
      const latitude = row.original.latitude;
      const longitude = row.original.longitude;
      return `${latitude}, ${longitude}`;
    },
  },
];

export const getIdleReportColumns = (): ColumnDef<IdleReport>[] => [
  {
    header: "Status",
    accessorKey: "vehicleStatus",
    cell: () => {
      const status = "Idle";
      const config = statusIconMap[status];

      if (!config) return "-";

      return (
        <div className="flex justify-center">
          <Image
            src={config.src}
            alt={config.label}
            title={config.label}
            width={40}
            height={40}
            className="cursor-pointer"
          />
        </div>
      );
    },
  },
  {
    header: "Vehicle No",
    accessorKey: "name",
  },
  {
    header: "Duration",
    accessorKey: "time",
  },
  {
    header: "Distance",
    accessorKey: "distance",
  },
  {
    header: "Max Speed",
    accessorKey: "maxSpeed",
  },

  {
    header: "Start Time",
    accessorFn: (row: StatusReport) =>
      new Date(row.startDateTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
  },
  {
    header: "Start Location",
    accessorKey: "startLocation",
  },
  {
    header: "Start Coordinates",
    accessorKey: "startCoordinates",
  },
  {
    header: "End Time",
    accessorFn: (row: StatusReport) =>
      new Date(row.endDateTime).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
  },
  {
    header: "End Location",
    accessorKey: "endLocation",
  },
  {
    header: "End Coordinates",
    accessorKey: "endCoordinates",
  },
];

export const GetAlertsAndEventsReportColumns =
  (): ColumnDef<AlertsAndEventsReport>[] => [
    { header: "Vehicle No", accessorKey: "name" },
    { header: "Alert Type", accessorKey: "alertType" },
    { header: "Location", accessorKey: "location" },
    { header: "Message", accessorKey: "message" },
    { header: "Address", accessorKey: "address" },
    { header: "Created At", accessorKey: "createdAt" },
  ];

export const GetGeofenceAlertsReportColumns =
  (): ColumnDef<GeofenceAlerts>[] => [
    { header: "Vehicle No", accessorKey: "name" },
    { header: "Geofence Name", accessorKey: "geofenceName" },
    { header: "Location", accessorKey: "location" },
    { header: "Coordinates", accessorKey: "coordinate" },
    { header: "In Time", accessorKey: "inTime" },
    { header: "Out Time", accessorKey: "outTime" },
    { header: "Halt Time", accessorKey: "haltTime" },
    // { header: "Created At", accessorKey: "createdAt" },
  ];

export const GetTripReportColumns = (): ColumnDef<TripReport>[] => [
  {
    header: "Vehicle No",
    accessorKey: "name",
  },

  {
    header: "Start Time",
    accessorKey: "startTime",
    cell: ({ getValue }) =>
      new Date(getValue<string>()).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }),
  },

  {
    header: "Start Address",
    accessorKey: "startAddress",
    meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
  },

  {
    header: "Start Coordinates",
    accessorFn: (row) => ({
      lat: row.startLatitude,
      lng: row.startLongitude,
    }),
    cell: ({ getValue }) => {
      const { lat, lng } = getValue<{ lat: number; lng: number }>();
      return (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {lat?.toFixed(6)}, {lng?.toFixed(6)}
        </a>
      );
    },
  },
  {
    header: "End Time",
    accessorKey: "endTime",
    cell: ({ getValue }) =>
      new Date(getValue<string>()).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "UTC",
      }),
  },

  {
    header: "End Address",
    accessorKey: "endAddress",
    meta: {
      wrapConfig: { wrap: "wrap", maxWidth: "260px" },
    },
  },

  {
    header: "End Coordinates",
    accessorFn: (row) => ({
      lat: row.startLatitude,
      lng: row.startLongitude,
    }),
    cell: ({ getValue }) => {
      const { lat, lng } = getValue<{ lat: number; lng: number }>();
      return (
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {lat?.toFixed(6)}, {lng?.toFixed(6)}
        </a>
      );
    },
  },
  {
    header: "Duration",
    accessorKey: "duration",
  },

  {
    header: "Distance",
    accessorKey: "distance",
  },

  {
    header: "Max Speed",
    accessorKey: "maxSpeed",
    cell: ({ getValue }) => `${getValue<number>()} km/h`,
  },
];

export const getRouteReportColumns = (): ColumnDef<GeofenceAlerts>[] => [
  { header: "Vehicle No", accessorKey: "name" },
  { header: "Geofence Name", accessorKey: "geofenceName" },
  { header: "Location", accessorKey: "location" },
  { header: "Coordinates", accessorKey: "coordinate" },
  { header: "In Time", accessorKey: "inTime" },
  { header: "Out Time", accessorKey: "outTime" },
  { header: "Halt Time", accessorKey: "haltTime" },
  { header: "Created At", accessorKey: "createdAt" },
];
