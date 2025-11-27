import { ColumnDef } from "@tanstack/react-table";
import { Category, Model, Route } from "@/interface/modal";
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
            className="bg-yellow-500 text-white px-3 py-1 rounded text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(data);
            }}
          >
            Edit
          </button>

          <button
            className="bg-red-500 text-white px-3 py-1 rounded text-xs"
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
