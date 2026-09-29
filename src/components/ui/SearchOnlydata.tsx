import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

// Make it generic to work with unknown data type
interface SearchComponentProps<T = unknown> {
  data?: T[];
  placeholder?: string;
  displayKey?: string | string[];
  debounceDelay?: number;
  onResults?: (results: T[]) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
}

// ✅ Utility to handle nested access like "company.name"
const getNestedValue = (obj: unknown, path: string): unknown => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

const SearchComponent = <T extends Record<string, unknown>>({
  data = [],
  placeholder = "Search...",
  displayKey = "name",
  debounceDelay = 300,
  className = "",
  onResults,
  onQueryChange,
}: SearchComponentProps<T>) => {
  const [query, setQuery] = useState("");
  const onResultsRef = useRef(onResults);
  const onQueryChangeRef = useRef(onQueryChange);
  const lastResultsRef = useRef<T[]>([]);

  // Keep the refs updated with the latest callbacks
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);


  // Memoize the filtering logic to prevent unnecessary recalculations
  // const filteredResults = useMemo(() => {
  //   if (!query.trim()) {
  //     return data;
  //   }

  //   return data.filter((item) => {
  //     if (typeof item === "object" && item !== null) {
  //       if (Array.isArray(displayKey)) {
  //         // Handle array of keys, including nested ones like ["company.name", "user.email"]
  //         const combined = displayKey
  //           .map((key) => getNestedValue(item, key))
  //           .filter(Boolean)
  //           .join(" ")
  //           .toLowerCase();
  //         return combined.includes(query.toLowerCase());
  //       } else {
  //         // Handle single key, including nested ones like "company.name"
  //         const value = getNestedValue(item, displayKey);
  //         return value?.toString().toLowerCase().includes(query.toLowerCase());
  //       }
  //     }
  //     // Fallback for primitive types
  //     return String(item).toLowerCase().includes(query.toLowerCase());
  //   });
  // }, [data, query, displayKey]);

  // Initialize with all data when component mounts
  useEffect(() => {
    if (onResultsRef.current && data.length > 0) {
      onResultsRef.current(data);
      lastResultsRef.current = data;
    }
  }, []); // Only run on mount

  // Handle search results with debouncing
  useEffect(() => {
    const debounce = setTimeout(() => {
      // Calculate filtered results inside the effect to avoid dependency issues
      let currentResults: T[];
      if (!query.trim()) {
        currentResults = data;
      } else {
        currentResults = data.filter((item) => {
          if (typeof item === "object" && item !== null) {
            if (Array.isArray(displayKey)) {
              const combined = displayKey
                .map((key) => getNestedValue(item, key))
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return combined.includes(query.toLowerCase());
            } else {
              const value = getNestedValue(item, displayKey);
              return value
                ?.toString()
                .toLowerCase()
                .includes(query.toLowerCase());
            }
          }
          return String(item).toLowerCase().includes(query.toLowerCase());
        });
      }

      // Check if results have actually changed to prevent infinite loops
      const getItemKey = (item: any, index: number) =>
        item?._id ?? item?.id ?? item?.uuid ?? index;

      const resultsChanged =
        currentResults.length !== lastResultsRef.current.length ||
        currentResults.some((item, index) => {
          const prev = lastResultsRef.current[index];
          if (!prev) return true;
          if (getItemKey(item, index) !== getItemKey(prev, index)) return true;
          return item !== prev;
        });

      if (
        onResultsRef.current &&
        (resultsChanged || lastResultsRef.current.length === 0)
      ) {
        onResultsRef.current(currentResults);
        lastResultsRef.current = currentResults;
      }
    }, debounceDelay);

    return () => clearTimeout(debounce);
  }, [query, data, displayKey, debounceDelay]); // Include data and displayKey

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onQueryChangeRef.current?.(val);
          }}
          className="w-full border rounded px-3 py-2 bg-[#FFE58A]"
          icon={<SearchIcon />}
        />
      </div>
    </div>
  );
};


export default SearchComponent;
