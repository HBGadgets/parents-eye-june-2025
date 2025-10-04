// import { useState, useCallback, useEffect, useMemo } from "react";
// import { api } from "@/services/apiService";
// import type { BranchGroupAccess } from "../types";

// export function useBranchGroups({ pagination, sorting, globalFilter, dateRange }: unknown) {
//   const [branchGroupsData, setBranchGroupsData] = useState<{ data: BranchGroupAccess[], total: number }>({
//     data: [],
//     total: 0
//   });
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const sort = sorting.map((s: unknown) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',');

//   const queryParams = useMemo(() => {
//     const params = new URLSearchParams();
//     params.append('page', `${pagination.pageIndex + 1}`);
//     params.append('limit', `${pagination.pageSize}`);
//     if (globalFilter) params.append('search', globalFilter);
//     if (sort) params.append('sort', sort);
//     if (dateRange.start) params.append('startDate', dateRange.start.toISOString());
//     if (dateRange.end) params.append('endDate', dateRange.end.toISOString());
//     return params.toString();
//   }, [pagination.pageIndex, pagination.pageSize, globalFilter, sort, dateRange.start, dateRange.end]);

//   const fetchBranchGroups = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await api.get<BranchGroupAccess[]>(`/branchGroup?${queryParams}`);
//       setBranchGroupsData({
//         data: response,
//         total: response.length,
//       });
//     } catch (err) {
//       console.error("Failed to fetch branch group data:", err);
//       setError("Failed to load user data. Check network or API response structure.");
//       setBranchGroupsData({ data: [], total: 0 });
//     } finally {
//       setIsLoading(false);
//     }
//   }, [queryParams]);

//   useEffect(() => {
//     fetchBranchGroups();
//   }, [fetchBranchGroups]);

//   return {
//     branchGroupsData,
//     isLoading,
//     error,
//     setError,
//     fetchBranchGroups,
//   };
// }
