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
};

export function Alert<T>({
  title,
  description,
  actionButton,
  target,
  setTarget,
  butttonText,
}: AlertProps<T>) {
  return (
    <AlertDialog open={!!target} onOpenChange={() => setTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setTarget(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
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
