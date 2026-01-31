import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type AlertProps<T> = {
  title: string;
  description: string;
  actionButton: (target: T) => void;
  target: T | null;
  setTarget: (target: T | null) => void;
  butttonText: string;
  dialogClassName?: string;
};

export function Alert<T>({
  title,
  description,
  actionButton,
  target,
  setTarget,
  butttonText,
  dialogClassName,
}: AlertProps<T>) {
  return (
    <AlertDialog open={!!target} onOpenChange={() => setTarget(null)}>
      <AlertDialogContent className={`max-w-md w-full ${dialogClassName || ""}`}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => setTarget(null)}
            className="cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded-md cursor-pointer"
            onClick={() => {
              if (target) {
                actionButton(target);
              }
              setTarget(null);
            }}
          >
            {butttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
