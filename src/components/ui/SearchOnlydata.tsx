import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

// Make it generic to work with any data type
interface SearchComponentProps<T = any> {
  data?: T[];
  placeholder?: string;
  displayKey?: string | string[];
  debounceDelay?: number;
  onResults?: (results: T[]) => void;
  className?: string;
}

// ✅ Utility to handle nested access like "company.name"
const getNestedValue = (obj: any, path: string): any => {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

const SearchComponent = <T extends Record<string, any>>({
  data = [],
  placeholder = "Search...",
  displayKey = "name",
  debounceDelay = 300,
  className = "",
  onResults,
}: SearchComponentProps<T>) => {
  const [query, setQuery] = useState("");
  const onResultsRef = useRef(onResults);
  const lastResultsRef = useRef<T[]>([]);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Memoize the filtering logic to prevent unnecessary recalculations
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return data;
    }

    return data.filter((item) => {
      if (typeof item === "object" && item !== null) {
        if (Array.isArray(displayKey)) {
          // Handle array of keys, including nested ones like ["company.name", "user.email"]
          const combined = displayKey
            .map((key) => getNestedValue(item, key))
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return combined.includes(query.toLowerCase());
        } else {
          // Handle single key, including nested ones like "company.name"
          const value = getNestedValue(item, displayKey);
          return value?.toString().toLowerCase().includes(query.toLowerCase());
        }
      }
      // Fallback for primitive types
      return String(item).toLowerCase().includes(query.toLowerCase());
    });
  }, [data, query, displayKey]);

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
      const resultsChanged = 
        currentResults.length !== lastResultsRef.current.length ||
        currentResults.some((item, index) => item.id !== lastResultsRef.current[index]?.id);

      if (onResultsRef.current && (resultsChanged || lastResultsRef.current.length === 0)) {
        console.log('Search: Calling onResults with:', currentResults.length, 'items for query:', query);
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
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border rounded px-3 py-2 bg-[#FFE58A]"
          icon={<SearchIcon />}
        />
      </div>
    </div>
  );
};

export default SearchComponent;
