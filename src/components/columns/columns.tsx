import { ColumnDef } from "@tanstack/react-table";
import { Category, Device, Model, Route, Student } from "@/interface/modal";
import { CellContent } from "@/components/ui/CustomTable";

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
    accessorFn: (row: Device) => row.driver?.driverName ?? "—",
  },
  {
    id: "registerationDate",
    headers: "Registeration Date",
    accessorFn: (row: Device) => new Date(row.createdAt).toLocaleDateString(),
  },
];
