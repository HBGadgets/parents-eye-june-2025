import { ColumnDef } from "@tanstack/react-table";
import { Category, Model } from "@/interface/modal";
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
