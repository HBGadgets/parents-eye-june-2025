"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
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
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FieldConfig {
  key: string;
  label: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "url"
    | "select"
    | "textarea"
    | "date"
    | "searchable-select";
  required?: boolean;
  placeholder?: string;
  options?: string[] | { value: string; label: string }[] | unknown[];
  // For searchable-select with complex objects
  labelKey?: string; // Field to use for display label (e.g., "schoolName")
  valueKey?: string; // Field to use as value (e.g., "_id")
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    message?: string;
    minDate?: Date;
    maxDate?: Date;
  };
  disabled?: boolean;
  hidden?: boolean;
  gridCols?: 1 | 2;
  isProtected?: boolean; // New property for protected fields
}

interface DynamicEditDialogProps<T = unknown> {
  data: T | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: unknown) => void;
  onFieldChange?: (fieldKey: string, value: unknown, option?: unknown) => void;
  fields: FieldConfig[];
  title?: string;
  description?: string;
  avatarConfig?: { imageKey: string; nameKeys: string[] };
}

const getNestedValue = (obj: unknown, path: string): unknown =>
  path.split(".").reduce((current, key) => current?.[key], obj);

const setNestedValue = (
  obj: unknown,
  path: string,
  value: unknown
): unknown => {
  const keys = path.split(".");
  const result = { ...obj };
  let current = result;

  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = current[keys[i]] ? { ...current[keys[i]] } : {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
};

const validateField = (
  value: unknown,
  config: FieldConfig
): string | undefined => {
  if (config.required && (!value || value === ""))
    return `${config.label} is required`;
  if (!config.validation || !value) return undefined;

  const { min, max, minLength, maxLength, pattern, message, minDate, maxDate } =
    config.validation;

  if (config.type === "number") {
    const numValue = Number(value);
    if (min !== undefined && numValue < min)
      return message || `${config.label} must be at least ${min}`;
    if (max !== undefined && numValue > max)
      return message || `${config.label} must be at most ${max}`;
  }

  if (config.type === "date" && value instanceof Date) {
    if (minDate && value < minDate)
      return (
        message || `${config.label} must be after ${format(minDate, "PPP")}`
      );
    if (maxDate && value > maxDate)
      return (
        message || `${config.label} must be before ${format(maxDate, "PPP")}`
      );
  }

  if (typeof value === "string") {
    if (minLength !== undefined && value.length < minLength)
      return (
        message || `${config.label} must be at least ${minLength} characters`
      );
    if (maxLength !== undefined && value.length > maxLength)
      return (
        message || `${config.label} must be at most ${maxLength} characters`
      );
    if (pattern && !pattern.test(value))
      return message || `${config.label} format is invalid`;
    if (config.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      return `Please enter a valid email address`;
    if (config.type === "url" && !/^https?:\/\/.+/.test(value))
      return `Please enter a valid URL`;
  }

  return undefined;
};

// Helper function to get option value and label
const getOptionValue = (option: unknown, field: FieldConfig): string => {
  if (typeof option === "string") return option;
  if (field.valueKey) return option[field.valueKey];
  return option.value || option._id || option.id || "";
};

const getOptionLabel = (option: unknown, field: FieldConfig): string => {
  if (typeof option === "string") return option;
  if (field.labelKey) return option[field.labelKey];
  return option.label || option.name || option.title || "";
};

export const DynamicEditDialog: React.FC<DynamicEditDialogProps> = ({
  data,
  isOpen,
  onClose,
  onSave,
  onFieldChange,
  fields,
  title = "Edit Record",
  description = "Update the information below. Fields marked with * are required.",
  avatarConfig,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [unlockedFields, setUnlockedFields] = useState<Set<string>>(new Set());
  // const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  // const [currentProtectedField, setCurrentProtectedField] = useState<
  //   string | null
  // >(null);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  useEffect(() => {
    if (data && isOpen) {
      const formData: unknown = {};

      fields.forEach((field) => {
        const value = getNestedValue(data, field.key);
        if (field.type === "date" && value) {
          // Convert string dates to Date objects
          formData[field.key] =
            typeof value === "string" ? new Date(value) : value;
        } else {
          formData[field.key] = value ?? "";
        }
      });
      form.reset(formData);
      // setUnlockedFields(new Set());
    }
  }, [data, isOpen, fields, form]);

  // const handleUnlockClick = (fieldKey: string) => {
  //   setCurrentProtectedField(fieldKey);
  //   setPasswordDialogOpen(true);
  // };

  const onSubmit = async (formData: unknown) => {
    setIsSubmitting(true);
    try {
      const errors: { [key: string]: string } = {};
      fields.forEach((field) => {
        const error = validateField(formData[field.key], field);
        if (error) errors[field.key] = error;
      });

      if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([key, message]) => {
          form.setError(key as unknown, { type: "manual", message });
        });
        return;
      }

      let transformedData = { ...formData };
      fields.forEach((field) => {
        if (field.key.includes(".")) {
          transformedData = setNestedValue(
            transformedData,
            field.key,
            formData[field.key]
          );
          delete transformedData[field.key];
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSave(transformedData);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const renderField = (field: FieldConfig) => {
    if (field.hidden) return null;

    // const isProtected = field.isProtected && !unlockedFields.has(field.key);
    // const fieldValue = form.watch(field.key);

    return (
      <FormField
        key={field.key}
        control={form.control}
        name={field.key}
        render={({ field: formField }) => (
          <FormItem className={field.gridCols === 1 ? "col-span-full" : ""}>
            <FormLabel>
              {field.label}
              {field.required && (
                <span className="text-destructive ml-1">*</span>
              )}
            </FormLabel>
            <FormControl>
              {field.type === "select" ? (
                <Select
                  onValueChange={(value) => {
                    formField.onChange(value);
                    onFieldChange?.(field.key, value);
                  }}
                  value={formField.value}
                  disabled={field.disabled}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        field.placeholder ||
                        `Select ${field.label.toLowerCase()}`
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option) => {
                      const value = getOptionValue(option, field);
                      const label = getOptionLabel(option, field);
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : field.type === "searchable-select" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !formField.value && "text-muted-foreground"
                      )}
                      disabled={field.disabled}
                    >
                      {formField.value
                        ? (() => {
                            const foundOption = field.options?.find(
                              (option) => {
                                const value = getOptionValue(option, field);
                                return value === formField.value;
                              }
                            );
                            return foundOption
                              ? getOptionLabel(foundOption, field)
                              : formField.value;
                          })()
                        : field.placeholder ||
                          `Select ${field.label.toLowerCase()}`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder={`Search ${field.label.toLowerCase()}...`}
                      />
                      <CommandList className="max-h-[200px] overflow-y-auto">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup>
                          {field.options?.map((option) => {
                            const value = getOptionValue(option, field);
                            const label = getOptionLabel(option, field);
                            return (
                              <CommandItem
                                key={value}
                                value={label} // Use label for search matching
                                onSelect={() => {
                                  const newValue =
                                    value === formField.value ? "" : value;
                                  formField.onChange(newValue);

                                  // Call the parent callback with the full option object
                                  if (onFieldChange) {
                                    const selectedOption = newValue
                                      ? option
                                      : null;
                                    onFieldChange(
                                      field.key,
                                      newValue,
                                      selectedOption
                                    );
                                  }
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formField.value === value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {label}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : field.type === "textarea" ? (
                <textarea
                  {...formField}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  onChange={(e) => {
                    formField.onChange(e.target.value);
                    onFieldChange?.(field.key, e.target.value);
                  }}
                />
              ) : field.type === "date" ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formField.value && "text-muted-foreground"
                      )}
                      disabled={field.disabled}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formField.value ? (
                        format(formField.value, "PPP")
                      ) : (
                        <span>{field.placeholder || "Pick a date"}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value}
                      onSelect={(date) => {
                        formField.onChange(date);
                        onFieldChange?.(field.key, date);
                      }}
                      disabled={(date) => {
                        if (field.disabled) return true;
                        const { minDate, maxDate } = field.validation || {};
                        if (minDate && date < minDate) return true;
                        if (maxDate && date > maxDate) return true;
                        return false;
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  {...formField}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  onChange={(e) => {
                    const value =
                      field.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value;
                    formField.onChange(value);
                    onFieldChange?.(field.key, value);
                  }}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  if (!isOpen) return null;

  const avatarDisplay = avatarConfig && (
    <Avatar className="h-10 w-10">
      <AvatarImage
        src={getNestedValue(data, avatarConfig.imageKey)}
        alt="User Avatar"
      />
      <AvatarFallback>
        {avatarConfig.nameKeys
          .map((key) => getNestedValue(data, key)?.charAt(0) || "")
          .join("")
          .toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {avatarDisplay}
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Render all fields in a responsive grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(renderField)}
              </div>

              {/* Footer with action buttons */}
              <DialogFooter className="gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
