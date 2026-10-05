import api from "@/lib/axios";
import { reportService } from "@/services/api/reportService";
import { deviceApiService } from "@/services/api/deviceApiService";
import { routeService } from "@/services/api/routeService";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { subscriptionExpiryService } from "@/services/api/subscriptionExpiry";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";

export interface ChatField {
  name: string;
  type?: string;
  label?: string;
  placeholder?: string;
}

export interface ChatQuestion {
  id: number;
  question: string;
  intent?: string;
  function: string;
  fields?: ChatField[];
}

export interface ChatResultItem {
  [key: string]: any;
}

export interface ChatbotExecutionResult {
  title: string;
  summary?: string;
  count?: number;
  type: "table" | "cards" | "key-value" | "empty" | "error";
  data?: ChatResultItem[];
  allData?: ChatResultItem[];
  columns?: { key: string; label: string }[];
  badges?: { label: string; value: string | number; color?: string }[];
  raw?: any;
}

// 26 Hardcoded Questions as specified
export const HARDCODED_QUESTIONS: ChatQuestion[] = [
  {
    id: 101,
    question: "Show all vehicles",
    intent: "devices",
    function: "get_all_devices",
  },
  {
    id: 102,
    question: "Distance report of all vehicles",
    intent: "distance_report",
    function: "get_all_vehicles_distance_report",
    fields: [
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 103,
    question: "Travel summary of all vehicles",
    intent: "all_vehicles_travel_summary",
    function: "get_all_vehicles_travel_summary",
    fields: [
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 3119,
    question: "Specific device km report ",
    intent: "devices",
    function: "get_superadmin_single_vehicle_km_report",
    fields: [
      {
        name: "vehicle_input",
        type: "text",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "Example: MH31FC7874",
      },
    ],
  },
  {
    id: 122086015,
    question: "Show specific vehicle geofences",
    intent: "specific_vehicle_geofences",
    function: "get_specific_vehicle_geofences",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
    ],
  },
  {
    id: 1220282009,
    question: "Show specific stopped vehicle",
    intent: "specific_stopped_vehicle",
    function: "get_specific_stopped_vehicle",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 1220822010,
    question: "Show specific vehicle status report",
    intent: "specific_vehicle_status_report",
    function: "get_specific_status_report",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 120208012,
    question: "Show specific vehicle trip report",
    intent: "specific_vehicle_trip_report",
    function: "get_specific_trip_report",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 122208013,
    question: "Show specific vehicle idle report",
    intent: "specific_vehicle_idle_report",
    function: "get_specific_idle_report",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
  {
    id: 122080134,
    question: "Show specific vehicle travel summary",
    intent: "specific_vehicle_travel_summary",
    function: "get_specific_travel_summary",
    fields: [
      {
        name: "vehicle_input",
        label: "Enter Vehicle Name or Unique ID",
        placeholder: "MH05GA1153",
      },
      {
        name: "from_date",
        label: "Enter Start Date",
        placeholder: "e.g. 01-09-2026 or 1 Sept 2026",
      },
      {
        name: "to_date",
        label: "Enter End Date",
        placeholder: "e.g. 10-09-2026 or 10 Sept 2026",
      },
    ],
  },
];

// In-memory cached devices for fast vehicle resolution
let cachedDevices: any[] | null = null;
let lastCacheTime = 0;

export const getCachedDevices = async (): Promise<any[]> => {
  const now = Date.now();
  if (cachedDevices && now - lastCacheTime < 60000) {
    return cachedDevices;
  }
  try {
    const res = await deviceApiService.getDevices({ page: 1, limit: "all" });
    const list = Array.isArray(res?.devices) ? res.devices : (res as any)?.data || [];
    if (list.length > 0) {
      cachedDevices = list;
      lastCacheTime = now;
      return list;
    }
    throw new Error("Empty list with limit: all");
  } catch {
    try {
      const res = await deviceApiService.getDevices({ page: 1, limit: 10000 });
      const list = Array.isArray(res?.devices) ? res.devices : (res as any)?.data || [];
      cachedDevices = list;
      lastCacheTime = now;
      return list;
    } catch {
      return cachedDevices || [];
    }
  }
};

/**
 * Resolves a user's vehicle input (name, number, imei, or uniqueId) to device and numeric uniqueId
 */
export const resolveVehicle = async (
  input?: string
): Promise<{ uniqueId: number; device: any | null }> => {
  if (!input) return { uniqueId: 0, device: null };
  const trimmed = input.trim();
  const cleanInput = trimmed.toLowerCase();

  const devices = await getCachedDevices();

  // 1. Direct match by uniqueId, name, plate, or imei
  const matched = devices.find((d) => {
    const uId = String(d.uniqueId || "").toLowerCase();
    const name = String(d.deviceName || d.name || "").toLowerCase();
    const plate = String(d.vehicleNo || d.plateNumber || "").toLowerCase();
    const imei = String(d.imei || "").toLowerCase();

    return (
      uId === cleanInput ||
      name === cleanInput ||
      plate === cleanInput ||
      imei === cleanInput ||
      name.includes(cleanInput) ||
      cleanInput.includes(name && name.length > 3 ? name : "___no_match___")
    );
  });

  if (matched && matched.uniqueId) {
    return { uniqueId: Number(matched.uniqueId), device: matched };
  }

  // 2. If input is purely numeric, treat directly as uniqueId
  const parsedNum = Number(cleanInput.replace(/\D/g, ""));
  if (parsedNum && !isNaN(parsedNum)) {
    return { uniqueId: parsedNum, device: matched || null };
  }

  return { uniqueId: 0, device: null };
};

/**
 * Normalizes any free-form date input (e.g., "08-02-2026", "4 July 2026", "2026-07-04") to "YYYY-MM-DD"
 */
export const parseInputDate = (dateStr?: string): string => {
  if (!dateStr || !dateStr.trim()) {
    return formatDateToYYYYMMDD(new Date()) || "";
  }

  const trimmed = dateStr.trim();

  // Check DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Check YYYY-MM-DD
  const yyyymmdd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, "0");
    const day = yyyymmdd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Natural language date (e.g., "4 July 2026")
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return formatDateToYYYYMMDD(parsed) || "";
  }

  return formatDateToYYYYMMDD(new Date()) || "";
};

/**
 * Dispatches chatbot functions and calls the appropriate report/master APIs
 */
export const executeChatbotFunction = async (
  funcName: string,
  fieldValues: Record<string, string> = {}
): Promise<ChatbotExecutionResult> => {
  const todayStr = formatDateToYYYYMMDD(new Date()) || "";

  try {
    switch (funcName) {
      // 1. Show all vehicles
      case "get_all_devices": {
        const devices = await getCachedDevices();
        if (!devices || devices.length === 0) {
          return {
            title: "All Vehicles",
            type: "empty",
            summary: "No vehicles found in the system.",
            count: 0,
          };
        }

        const allVehicleData = devices.map((d) => ({
          name: d.deviceName || d.name || "Unnamed Vehicle",
          uniqueId: d.uniqueId || "--",
          sim: d.sim || d.phone || d.simNumber || d.simNo || "--",
          imei: d.imei || "--",
          status: d.status || "offline",
          speed: `${d.speed ?? 0} km/h`,
          branch: d.branchId?.branchName || d.branchName || "--",
        }));

        return {
          title: "All Vehicles",
          type: "table",
          count: devices.length,
          summary: `Found ${devices.length} registered vehicles.`,
          columns: [
            { key: "name", label: "Vehicle" },
            { key: "uniqueId", label: "Unique ID" },
            { key: "sim", label: "SIM Number" },
            { key: "status", label: "Status" },
            { key: "speed", label: "Speed" },
            { key: "branch", label: "Branch" },
          ],
          data: allVehicleData.slice(0, 50),
          allData: allVehicleData,
        };
      }

      // Distance report of all vehicles
      case "get_all_vehicles_distance_report": {
        const fromDate = parseInputDate(fieldValues.from_date);
        const toDate = parseInputDate(fieldValues.to_date);
        let start = fromDate;
        let end = toDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        const devices = await getCachedDevices();
        if (!devices || devices.length === 0) {
          return {
            title: `Distance Report: All Vehicles (${start} to ${end})`,
            type: "empty",
            summary: "No vehicles found in the system.",
            count: 0,
          };
        }

        const uniqueIds = devices
          .map((d) => Number(d.uniqueId))
          .filter((id) => !isNaN(id) && id > 0);

        let rows: any[] = [];
        try {
          const res = await reportService.getDistanceReport({
            uniqueIds,
            page: 1,
            limit: "all",
            period: "Custom",
            from: start,
            to: end,
          });
          const rawData = res?.data ?? res ?? [];
          rows = Array.isArray(rawData)
            ? rawData
            : Array.isArray(rawData?.data)
            ? rawData.data
            : [];
        } catch (err) {
          console.error("Failed to fetch distance report for all vehicles:", err);
        }

        // Collect all date keys returned by backend across all rows (like distance-report/page.tsx)
        const nonDateKeys = new Set([
          "_id",
          "id",
          "name",
          "uniqueId",
          "totalKm",
          "sim",
          "status",
          "speed",
          "branch",
          "branchId",
          "branchName",
          "message",
        ]);

        const dateKeySet = new Set<string>();
        if (Array.isArray(rows)) {
          rows.forEach((r: any) => {
            Object.keys(r).forEach((k) => {
              if (!nonDateKeys.has(k) && !k.startsWith("_")) {
                dateKeySet.add(k);
              }
            });
          });
        }
        const dateKeys = Array.from(dateKeySet).sort();

        // Create lookup map for distance records by uniqueId and vehicle name
        const rowsByUniqueId = new Map<string, any>();
        if (Array.isArray(rows)) {
          rows.forEach((r: any) => {
            if (r.uniqueId != null) {
              rowsByUniqueId.set(String(r.uniqueId), r);
            }
            if (r.name) {
              rowsByUniqueId.set(String(r.name).toLowerCase().trim(), r);
            }
          });
        }

        // Map every vehicle with its date columns, totalKm, and metadata matching distance-report/page.tsx
        const allDistanceData: any[] = devices.map((d) => {
          const row =
            rowsByUniqueId.get(String(d.uniqueId)) ||
            rowsByUniqueId.get(String(d.deviceName || "").toLowerCase().trim()) ||
            rowsByUniqueId.get(String(d.name || "").toLowerCase().trim()) ||
            {};

          const vehicleName = d.deviceName || d.name || row.name || `Vehicle ${d.uniqueId}`;
          const sim = d.sim || d.phone || d.simNumber || d.simNo || "--";
          const rawTotal = row.totalKm ?? row.distance ?? 0;
          const numTotal =
            typeof rawTotal === "number" ? rawTotal : parseFloat(String(rawTotal)) || 0;

          const item: Record<string, any> = {
            name: vehicleName,
            uniqueId: d.uniqueId || "--",
            sim: sim,
          };

          // Populate each date column exactly as distance-report/page.tsx does
          dateKeys.forEach((dk) => {
            const val = row[dk];
            if (val !== undefined && val !== null) {
              const numVal =
                typeof val === "number" ? val : parseFloat(String(val)) || 0;
              item[dk] = `${numVal.toFixed(2)} km`;
            } else {
              item[dk] = "0.00 km";
            }
          });

          item.totalKm = `${numTotal.toFixed(2)} km`;
          item._numTotal = numTotal;

          return item;
        });

        // Also include any vehicle rows returned from backend that weren't in devices list
        if (Array.isArray(rows)) {
          rows.forEach((r: any) => {
            const uId = r.uniqueId != null ? String(r.uniqueId) : null;
            if (uId && !devices.some((d) => String(d.uniqueId) === uId)) {
              const rawTotal = r.totalKm ?? r.distance ?? 0;
              const numTotal =
                typeof rawTotal === "number" ? rawTotal : parseFloat(String(rawTotal)) || 0;
              const item: Record<string, any> = {
                name: r.name || `Vehicle ${uId}`,
                uniqueId: uId,
                sim: "--",
              };
              dateKeys.forEach((dk) => {
                const val = r[dk];
                const numVal =
                  typeof val === "number" ? val : parseFloat(String(val)) || 0;
                item[dk] = `${numVal.toFixed(2)} km`;
              });
              item.totalKm = `${numTotal.toFixed(2)} km`;
              item._numTotal = numTotal;
              allDistanceData.push(item);
            }
          });
        }

        // Sort vehicles by distance traveled descending
        allDistanceData.sort((a, b) => b._numTotal - a._numTotal);

        // Remove temporary sorting helper
        const cleanedData = allDistanceData.map(({ _numTotal, ...rest }) => rest);

        const totalFleetKm = allDistanceData.reduce((acc, r) => acc + r._numTotal, 0);
        const movingCount = allDistanceData.filter((r) => r._numTotal > 0).length;

        // Build columns matching prepareDistanceExport from distance-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle Name" },
          { key: "uniqueId", label: "Unique ID" },
          { key: "sim", label: "SIM Number" },
          ...dateKeys.map((dk) => ({
            key: dk,
            label: dk,
          })),
          { key: "totalKm", label: "Total KM" },
        ];

        return {
          title: `Distance Report: All Vehicles (${start} to ${end})`,
          type: "table",
          count: cleanedData.length,
          // summary: `Distance report from ${start} to ${end}. Found ${cleanedData.length} vehicles. Total fleet distance: ${totalFleetKm.toFixed(2)} km across ${movingCount} active vehicles.`,
          columns,
          data: cleanedData.slice(0, 50),
          allData: cleanedData,
        };
      }

      // 2. Show specific vehicle
      case "get_superadmin_vehicle_details": {
        const input = fieldValues.vehicle_input || "";
        const { uniqueId, device } = await resolveVehicle(input);

        if (!uniqueId && !device) {
          return {
            title: "Vehicle Details",
            type: "empty",
            summary: `Could not find any vehicle matching "${input}". Please check the vehicle name or unique ID.`,
          };
        }

        const d = device || {};
        return {
          title: `Vehicle Details: ${d.deviceName || d.name || uniqueId}`,
          type: "cards",
          summary: `Showing details for vehicle ${d.deviceName || d.name || uniqueId}.`,
          badges: [
            { label: "Status", value: d.status || "offline", color: d.status === "running" ? "green" : "amber" },
            { label: "Speed", value: `${d.speed ?? 0} km/h` },
            { label: "Unique ID", value: uniqueId },
          ],
          data: [
            {
              "Vehicle Name": d.deviceName || d.name || "--",
              "Unique ID": uniqueId,
              "SIM Number": d.sim || d.phone || d.simNumber || d.simNo || "--",
              "IMEI": d.imei || "--",
              "Plate Number": d.vehicleNo || d.plateNumber || "--",
              "Status": d.status || "--",
              "Ignition": d.ignition ? "ON" : "OFF",
              "Speed": `${d.speed ?? 0} km/h`,
              "Branch": d.branchId?.branchName || d.branchName || "--",
              "School": d.schoolId?.schoolName || d.schoolName || "--",
              "Last Updated": d.lastUpdate || d.updatedAt ? new Date(d.lastUpdate || d.updatedAt).toLocaleString() : "--",
            },
          ],
        };
      }

      // 3. Show Admin (Schools)
      case "find_school_superadmin": {
        const res = await api.get("/school");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.schools || [];
        if (!list.length) {
          return {
            title: "Admin / Schools",
            type: "empty",
            summary: "No school admins found.",
          };
        }

        const data = list.map((s: any) => ({
          name: s.schoolName || s.name || "--",
          contactPerson: s.contactPerson || s.adminName || s.name || "--",
          email: s.email || "--",
          phone: s.mobileNo || s.phone || s.contactNumber || "--",
          address: s.address || "--",
        }));

        return {
          title: "School Admins",
          type: "table",
          count: list.length,
          summary: `Found ${list.length} school administrative accounts.`,
          columns: [
            { key: "name", label: "School Name" },
            { key: "contactPerson", label: "Admin" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
          ],
          data,
        };
      }

      // 4. Show Users (Branches)
      case "find_branch_superadmin": {
        const res = await api.get("/branch");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.branches || [];
        if (!list.length) {
          return {
            title: "Branch Users",
            type: "empty",
            summary: "No branch users found.",
          };
        }

        const data = list.map((b: any) => ({
          branchName: b.branchName || b.name || "--",
          contactPerson: b.contactPerson || b.userName || "--",
          email: b.email || "--",
          phone: b.mobileNo || b.phone || "--",
          school: b.schoolId?.schoolName || b.schoolName || "--",
        }));

        return {
          title: "Branch Users",
          type: "table",
          count: list.length,
          summary: `Found ${list.length} branch user profiles.`,
          columns: [
            { key: "branchName", label: "Branch Name" },
            { key: "contactPerson", label: "Contact Person" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone" },
            { key: "school", label: "School" },
          ],
          data,
        };
      }

      // 5. Show Groups
      case "get_all_branch_groups_profile": {
        const res = await api.get("/branchGroup");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.branchGroups || [];
        if (!list.length) {
          return {
            title: "Branch Groups",
            type: "empty",
            summary: "No branch groups found.",
          };
        }

        const data = list.map((g: any) => ({
          groupName: g.branchGroupName || g.name || "--",
          branchesCount: Array.isArray(g.branches) ? g.branches.length : g.branchCount || "--",
          description: g.description || "--",
          createdAt: g.createdAt ? new Date(g.createdAt).toLocaleDateString() : "--",
        }));

        return {
          title: "Branch Groups",
          type: "table",
          count: list.length,
          summary: `Found ${list.length} branch groups.`,
          columns: [
            { key: "groupName", label: "Group Name" },
            { key: "branchesCount", label: "Branches Count" },
            { key: "description", label: "Description" },
          ],
          data,
        };
      }

      // 6. Show Specific User (Branch)
      case "find_specific_branch_superadmin": {
        const branchInput = (fieldValues.branch_name || "").toLowerCase().trim();
        const res = await api.get("/branch");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.branches || [];

        const matched = list.filter((b: any) => {
          const name = String(b.branchName || b.name || "").toLowerCase();
          const id = String(b._id || "").toLowerCase();
          return name.includes(branchInput) || id.includes(branchInput);
        });

        if (!matched.length) {
          return {
            title: "Specific User / Branch",
            type: "empty",
            summary: `No branch found matching "${fieldValues.branch_name}".`,
          };
        }

        return {
          title: `Branch Details: ${matched[0].branchName || fieldValues.branch_name}`,
          type: "cards",
          summary: `Found ${matched.length} branch record(s).`,
          data: matched.map((b: any) => ({
            "Branch Name": b.branchName || b.name || "--",
            "Contact Person": b.contactPerson || "--",
            "Email": b.email || "--",
            "Mobile": b.mobileNo || b.phone || "--",
            "School": b.schoolId?.schoolName || b.schoolName || "--",
            "Address": b.address || "--",
          })),
        };
      }

      // 7. Show Specific Admin (School)
      case "find_specific_school_superadmin": {
        const schoolInput = (fieldValues.school_name || "").toLowerCase().trim();
        const res = await api.get("/school");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.schools || [];

        const matched = list.filter((s: any) => {
          const name = String(s.schoolName || s.name || "").toLowerCase();
          const id = String(s._id || "").toLowerCase();
          return name.includes(schoolInput) || id.includes(schoolInput);
        });

        if (!matched.length) {
          return {
            title: "Specific School Admin",
            type: "empty",
            summary: `No school found matching "${fieldValues.school_name}".`,
          };
        }

        return {
          title: `School Admin: ${matched[0].schoolName || fieldValues.school_name}`,
          type: "cards",
          summary: `Found ${matched.length} school record(s).`,
          data: matched.map((s: any) => ({
            "School Name": s.schoolName || s.name || "--",
            "Admin Name": s.contactPerson || s.adminName || "--",
            "Email": s.email || "--",
            "Phone": s.mobileNo || s.phone || "--",
            "Address": s.address || "--",
          })),
        };
      }

      // 8. Show Specific Group
      case "get_specific_branch_group_profile": {
        const groupInput = (fieldValues.branchgroup_input || "").toLowerCase().trim();
        const res = await api.get("/branchGroup");
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.branchGroups || [];

        const matched = list.filter((g: any) => {
          const name = String(g.branchGroupName || g.name || "").toLowerCase();
          return name.includes(groupInput);
        });

        if (!matched.length) {
          return {
            title: "Specific Branch Group",
            type: "empty",
            summary: `No group found matching "${fieldValues.branchgroup_input}".`,
          };
        }

        return {
          title: `Branch Group: ${matched[0].branchGroupName || fieldValues.branchgroup_input}`,
          type: "cards",
          summary: `Showing information for ${matched[0].branchGroupName || fieldValues.branchgroup_input}.`,
          data: matched.map((g: any) => ({
            "Group Name": g.branchGroupName || g.name || "--",
            "Branches Count": Array.isArray(g.branches) ? g.branches.length : g.branchCount || "--",
            "Description": g.description || "--",
          })),
        };
      }

      // 9. Show specific vehicle Today distance
      case "get_specific_distance_report": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Today's Distance Report",
            type: "empty",
            summary: `Could not identify vehicle from "${fieldValues.vehicle_input}". Please verify the vehicle name or ID.`,
          };
        }

        const res = await reportService.getDistanceReport({
          uniqueIds: [uniqueId],
          page: 1,
          limit: 10,
          period: "Today",
          from: todayStr,
          to: todayStr,
        });

        const rows = res?.data ?? res ?? [];
        const firstRow = Array.isArray(rows) ? rows[0] : rows;
        const totalKm = firstRow?.totalKm ?? firstRow?.distance ?? 0;

        return {
          title: `Today's Distance: ${device?.deviceName || device?.name || uniqueId}`,
          type: "cards",
          summary: `Vehicle ${device?.deviceName || uniqueId} covered ${totalKm} km today (${todayStr}).`,
          badges: [
            { label: "Distance Today", value: `${totalKm} KM`, color: "blue" },
          ],
          data: [
            {
              "Vehicle Name": device?.deviceName || device?.name || firstRow?.name || "--",
              "Unique ID": uniqueId,
              "Date": todayStr,
              "Total KM": `${totalKm} km`,
              "Start Odometer": firstRow?.startOdometer || "--",
              "End Odometer": firstRow?.endOdometer || "--",
            },
          ],
        };
      }

      // 10. Specific device km report
      case "get_superadmin_single_vehicle_km_report": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Vehicle KM Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const res = await reportService.getDistanceReport({
          uniqueIds: [uniqueId],
          page: 1,
          limit: 20,
          period: "Today",
          from: todayStr,
          to: todayStr,
        });

        const rows = res?.data ?? res ?? [];
        const row = Array.isArray(rows) ? rows[0] : rows;
        const km = row?.totalKm ?? row?.distance ?? 0;

        return {
          title: `KM Report: ${device?.deviceName || device?.name || uniqueId}`,
          type: "cards",
          summary: `KM statistics for vehicle ${device?.deviceName || uniqueId}.`,
          badges: [
            { label: "Today Distance", value: `${km} KM`, color: "blue" },
            { label: "Unique ID", value: uniqueId },
          ],
          data: [
            {
              "Vehicle Name": device?.deviceName || device?.name || "--",
              "Unique ID": uniqueId,
              "Total KM Traveled": `${km} KM`,
              "Plate Number": device?.vehicleNo || "--",
              "Branch": device?.branchId?.branchName || device?.branchName || "--",
            },
          ],
        };
      }

      // 11. Show vehicle KM report for a specific date
      case "get_superadmin_vehicle_distance_by_date": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        const parsedDate = parseInputDate(fieldValues.report_date);

        if (!uniqueId) {
          return {
            title: "KM Report by Date",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const res = await reportService.getDistanceReport({
          uniqueIds: [uniqueId],
          page: 1,
          limit: 10,
          period: "Custom",
          from: parsedDate,
          to: parsedDate,
        });

        const rows = res?.data ?? res ?? [];
        const row = Array.isArray(rows) ? rows[0] : rows;
        const totalKm = row?.totalKm ?? row?.distance ?? 0;

        return {
          title: `KM Report for ${parsedDate}: ${device?.deviceName || uniqueId}`,
          type: "cards",
          summary: `Distance recorded on ${parsedDate} is ${totalKm} KM.`,
          badges: [
            { label: "Date", value: parsedDate },
            { label: "Distance", value: `${totalKm} KM`, color: "blue" },
          ],
          data: [
            {
              "Vehicle": device?.deviceName || device?.name || uniqueId,
              "Date": parsedDate,
              "Total KM": `${totalKm} km`,
              "Unique ID": uniqueId,
            },
          ],
        };
      }

      // 12. Show specific vehicle last position
      case "get_specific_vehicle_last_position": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!device && !uniqueId) {
          return {
            title: "Vehicle Last Position",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" was not found.`,
          };
        }

        const lat = device?.latitude ?? device?.position?.latitude ?? device?.lat;
        const lng = device?.longitude ?? device?.position?.longitude ?? device?.lng;
        const speed = device?.speed ?? 0;
        const status = device?.status ?? "unknown";
        const lastUpdate = device?.lastUpdate || device?.updatedAt;

        return {
          title: `Last Position: ${device?.deviceName || device?.name || uniqueId}`,
          type: "cards",
          summary: `Current known coordinates and status for ${device?.deviceName || uniqueId}.`,
          badges: [
            { label: "Status", value: status, color: status === "running" ? "green" : "amber" },
            { label: "Speed", value: `${speed} km/h` },
          ],
          data: [
            {
              "Vehicle": device?.deviceName || device?.name || uniqueId,
              "Unique ID": uniqueId,
              "SIM Number": device?.sim || device?.phone || device?.simNumber || device?.simNo || "--",
              "Coordinates": lat && lng ? `${lat}, ${lng}` : "Location unavailable",
              "Latitude": lat || "--",
              "Longitude": lng || "--",
              "Speed": `${speed} km/h`,
              "Ignition": device?.ignition ? "ON" : "OFF",
              "Last Ping": lastUpdate ? new Date(lastUpdate).toLocaleString() : "Recent",
              "Branch": device?.branchId?.branchName || device?.branchName || "--",
            },
          ],
        };
      }

      // 13. Show specific vehicle geofences
      case "get_specific_vehicle_geofences": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Vehicle Geofences",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" was not found.`,
          };
        }

        let geofences: any[] = [];
        try {
          const res = await geofenceService.getGeofenceByUniqueId({ uniqueId });
          geofences = Array.isArray(res) ? res : (res as any)?.data || [];
        } catch {
          const allG = await geofenceService.getGeofence({ page: 1, limit: 50 });
          geofences = Array.isArray(allG?.data) ? allG.data : [];
        }

        if (!geofences.length) {
          return {
            title: `Geofences: ${device?.deviceName || uniqueId}`,
            type: "empty",
            summary: `No geofences currently assigned or detected for vehicle ${device?.deviceName || uniqueId}.`,
          };
        }

        return {
          title: `Geofences: ${device?.deviceName || uniqueId}`,
          type: "table",
          count: geofences.length,
          summary: `Found ${geofences.length} geofence(s).`,
          columns: [
            { key: "name", label: "Geofence Name" },
            { key: "type", label: "Type" },
            { key: "radius", label: "Radius / Area" },
          ],
          data: geofences.map((g: any) => ({
            name: g.name || g.geofenceName || "--",
            type: g.type || g.shape || "Circle",
            radius: g.radius ? `${g.radius}m` : "--",
          })),
        };
      }

      // 14. Show geofence reports
      case "get_all_geofence_reports": {
        let rows: any[] = [];
        try {
          const res = await reportService.getGeofenceAlertsReport({
            page: 1,
            limit: "all",
            period: "Today",
            from: todayStr,
            to: todayStr,
          });
          rows = res?.data ?? res ?? [];
        } catch {
          const alt = await api.get("/report/geofenceevent?limit=all");
          rows = alt?.data?.data ?? alt?.data ?? [];
        }

        if (!rows.length) {
          return {
            title: "Geofence Reports",
            type: "empty",
            summary: "No geofence breach events recorded for today.",
          };
        }

        const allEvents = rows.map((r: any) => ({
          vehicle: r.deviceName || r.name || r.uniqueId || "--",
          geofence: r.geofenceName || r.geofence || "--",
          event: r.event || r.status || "IN / OUT",
          time: r.timestamp || r.time ? new Date(r.timestamp || r.time).toLocaleString() : "--",
        }));

        return {
          title: "Geofence Events Report",
          type: "table",
          count: rows.length,
          summary: `Recorded ${rows.length} geofence transition event(s) today.`,
          columns: [
            { key: "vehicle", label: "Vehicle" },
            { key: "geofence", label: "Geofence" },
            { key: "event", label: "Event" },
            { key: "time", label: "Timestamp" },
          ],
          data: allEvents.slice(0, 50),
          allData: allEvents,
        };
      }

      // 15. Show specific active vehicle
      case "get_specific_active_vehicle": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!device && !uniqueId) {
          return {
            title: "Active Vehicle Status",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const isRunning = device?.status === "running" || (device?.speed ?? 0) > 0;
        return {
          title: `Active Status: ${device?.deviceName || device?.name || uniqueId}`,
          type: "cards",
          summary: isRunning
            ? `Vehicle is actively RUNNING at ${device?.speed || 0} km/h.`
            : `Vehicle is currently ${device?.status?.toUpperCase() || "STOPPED"}.`,
          badges: [
            {
              label: "Status",
              value: device?.status || (isRunning ? "running" : "stopped"),
              color: isRunning ? "green" : "amber",
            },
            { label: "Current Speed", value: `${device?.speed ?? 0} km/h` },
          ],
          data: [
            {
              "Vehicle Name": device?.deviceName || device?.name || uniqueId,
              "SIM Number": device?.sim || device?.phone || device?.simNumber || device?.simNo || "--",
              "Is Active / Running": isRunning ? "Yes" : "No",
              "Current Status": device?.status || "--",
              "Speed": `${device?.speed ?? 0} km/h`,
              "Ignition": device?.ignition ? "ON" : "OFF",
              "Last Communication": device?.lastUpdate ? new Date(device.lastUpdate).toLocaleString() : "--",
            },
          ],
        };
      }

      // 15b. Stop report of all vehicles
      case "get_all_vehicles_stop_report": {
        const fromDate = parseInputDate(fieldValues.from_date);
        const toDate = parseInputDate(fieldValues.to_date);
        let start = fromDate || todayStr;
        let end = toDate || todayStr;
        if (start > end) {
          [start, end] = [end, start];
        }

        const devices = await getCachedDevices();
        if (!devices || devices.length === 0) {
          return {
            title: `All Vehicles Stop Report (${start} to ${end})`,
            type: "empty",
            summary: "No vehicles found in the system.",
            count: 0,
          };
        }

        const results = await Promise.all(
          devices.map(async (d: any) => {
            try {
              const res = await reportService.getStopReport({
                uniqueId: d.uniqueId,
                page: 1,
                limit: "all",
                period: "Custom",
                from: start,
                to: end,
              });
              const raw = res?.data?.data ?? res?.data?.stopArray ?? res?.data ?? res?.stopArray ?? (Array.isArray(res) ? res : []);
              return (Array.isArray(raw) ? raw : []).map((r: any) => ({
                ...r,
                name: d.deviceName || d.name || r.name || String(d.uniqueId),
              }));
            } catch {
              return [];
            }
          })
        );
        const stopRows = results.flat();

        // Enrich rows with addresses using reverseGeocodeMapTiler matching stop-report/page.tsx
        const enrichedRows = await Promise.all(
          stopRows.map(async (row: any) => {
            const lat = row.latitude ?? row.lat;
            const lng = row.longitude ?? row.lng;
            const location =
              row.location && row.location !== "--" && row.location.length > 5
                ? row.location
                : lat && lng
                ? await reverseGeocodeMapTiler(Number(lat), Number(lng)).catch(() => `${lat}, ${lng}`)
                : row.location || row.address || "--";

            return {
              ...row,
              location,
            };
          })
        );

        // Format data matching prepareExportData & enrichStopReportWithAddress in stop-report/page.tsx
        const allStopData = enrichedRows.map((r: any) => {
          const arrival = new Date(r.arrivalTime || r.startTime || r.startDateTime).getTime();
          const departure = new Date(r.departureTime || r.endTime || r.endDateTime).getTime();

          let haltTime = r.haltTime || r.time || r.duration;
          if (!haltTime && arrival && departure) {
            const diffMs = Math.max(departure - arrival, 0);
            const hours = Math.floor(diffMs / 3600000);
            const minutes = Math.floor((diffMs % 3600000) / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            haltTime = `${hours}H ${minutes}M ${seconds}S`;
          }

          const arrivalTime = r.arrivalTime || r.startTime
            ? new Date(r.arrivalTime || r.startTime).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
            : "--";

          const departureTime = r.departureTime || r.endTime
            ? new Date(r.departureTime || r.endTime).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })
            : "--";

          const coordinates = r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : r.coordinates || "--";

          return {
            name: r.name || "--",
            arrivalTime,
            departureTime,
            haltTime: haltTime || "--",
            location: r.location || "--",
            coordinates,
          };
        });

        // Columns matching exportColumns from stop-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "arrivalTime", label: "Start Time" },
          { key: "departureTime", label: "End Time" },
          { key: "haltTime", label: "Duration" },
          { key: "location", label: "Location" },
          { key: "coordinates", label: "Coordinates" },
        ];

        return {
          title: `All Vehicles Stop Report (${start} to ${end})`,
          type: "table",
          count: allStopData.length,
          summary: `Showing ${allStopData.length} stopped records across all vehicles from ${start} to ${end}.`,
          badges: [
            { label: "Total Stops", value: allStopData.length },
            { label: "Date Range", value: `${start} to ${end}` },
            { label: "Total Vehicles", value: devices.length },
          ],
          columns,
          data: allStopData.slice(0, 50),
          allData: allStopData,
        };
      }

      // 16. Show specific stopped vehicle
      case "get_specific_stopped_vehicle": {
        const inputStr = fieldValues.vehicle_input?.trim().toLowerCase();
        if (!inputStr || inputStr === "all" || inputStr === "all vehicles" || inputStr === "all devices" || inputStr === "every vehicle") {
          return executeChatbotFunction("get_all_vehicles_stop_report", fieldValues);
        }

        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Vehicle Stop Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const fromDate = fieldValues.from_date
          ? parseInputDate(fieldValues.from_date)
          : todayStr;
        const toDate = fieldValues.to_date
          ? parseInputDate(fieldValues.to_date)
          : todayStr;
        let start = fromDate;
        let end = toDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        let stopRecords: any[] = [];
        try {
          const res = await reportService.getStopReport({
            uniqueId,
            page: 1,
            limit: "all",
            period: start === end && start === todayStr ? "Today" : "Custom",
            from: start,
            to: end,
          });
          const raw = res?.data?.data ?? res?.data?.stopArray ?? res?.data ?? res?.stopArray ?? res ?? [];
          stopRecords = Array.isArray(raw) ? raw : [];
        } catch (err) {
          console.error("Failed to fetch stop report:", err);
        }

        // Enrich rows with addresses using reverseGeocodeMapTiler matching stop-report/page.tsx
        const enrichedRows = await Promise.all(
          stopRecords.map(async (row: any) => {
            const lat = row.latitude ?? row.lat;
            const lng = row.longitude ?? row.lng;
            const location =
              row.location && row.location !== "--" && row.location.length > 5
                ? row.location
                : lat && lng
                ? await reverseGeocodeMapTiler(Number(lat), Number(lng)).catch(() => `${lat}, ${lng}`)
                : row.location || row.address || "--";

            return {
              ...row,
              location,
            };
          })
        );

        const vehicleName = device?.deviceName || device?.name || `Vehicle ${uniqueId}`;

        // Format data matching prepareExportData & enrichStopReportWithAddress in stop-report/page.tsx
        const allStopData = enrichedRows.length > 0
          ? enrichedRows.map((r: any) => {
              const arrival = new Date(r.arrivalTime || r.startTime || r.startDateTime).getTime();
              const departure = new Date(r.departureTime || r.endTime || r.endDateTime).getTime();

              let haltTime = r.haltTime || r.time || r.duration;
              if (!haltTime && arrival && departure) {
                const diffMs = Math.max(departure - arrival, 0);
                const hours = Math.floor(diffMs / 3600000);
                const minutes = Math.floor((diffMs % 3600000) / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                haltTime = `${hours}H ${minutes}M ${seconds}S`;
              }

              const arrivalTime = r.arrivalTime || r.startTime
                ? new Date(r.arrivalTime || r.startTime).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "--";

              const departureTime = r.departureTime || r.endTime
                ? new Date(r.departureTime || r.endTime).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })
                : "--";

              const coordinates = r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : r.coordinates || "--";

              return {
                name: r.name || vehicleName,
                arrivalTime,
                departureTime,
                haltTime: haltTime || "--",
                location: r.location || "--",
                coordinates,
              };
            })
          : [
              {
                name: vehicleName,
                arrivalTime: `${start} Live`,
                departureTime: "Now",
                haltTime: "--",
                location: "--",
                coordinates: "--",
              },
            ];

        // Columns matching exportColumns from stop-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "arrivalTime", label: "Start Time" },
          { key: "departureTime", label: "End Time" },
          { key: "haltTime", label: "Duration" },
          { key: "location", label: "Location" },
          { key: "coordinates", label: "Coordinates" },
        ];

        return {
          title: `Vehicle Stop Report: ${vehicleName} (${start} to ${end})`,
          type: "table",
          count: stopRecords.length,
          summary: `Showing stopped records from ${start} to ${end} for ${vehicleName}. Found ${stopRecords.length} stops.`,
          badges: [
            { label: "Vehicle No", value: vehicleName },
            { label: "Date Range", value: `${start} to ${end}` },
            { label: "Stops Count", value: stopRecords.length },
          ],
          columns,
          data: allStopData.slice(0, 50),
          allData: allStopData,
        };
      }

      // 17. Show specific vehicle status report
      case "get_specific_status_report": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Vehicle Status Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const fromDate = fieldValues.from_date
          ? parseInputDate(fieldValues.from_date)
          : todayStr;
        const toDate = fieldValues.to_date
          ? parseInputDate(fieldValues.to_date)
          : todayStr;
        let start = fromDate;
        let end = toDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        let statusData: any[] = [];
        try {
          const res = await reportService.getStatusReport({
            uniqueId,
            page: 1,
            limit: "all",
            period: start === end && start === todayStr ? "Today" : "Custom",
            from: start,
            to: end,
          });
          const raw = res?.data ?? res ?? [];
          statusData = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data
            : [];
        } catch (err) {
          console.error("Failed to fetch status report:", err);
        }

        // Enrich rows with addresses using reverseGeocodeMapTiler matching status-report/page.tsx
        const enrichedRows = await Promise.all(
          statusData.map(async (row: any) => {
            const startLat = row.startCoordinate?.latitude ?? row.startLatitude;
            const startLng = row.startCoordinate?.longitude ?? row.startLongitude;
            const endLat = row.endCoordinate?.latitude ?? row.endLatitude;
            const endLng = row.endCoordinate?.longitude ?? row.endLongitude;

            const [startLocation, endLocation] = await Promise.all([
              row.startLocation && row.startLocation !== "--" && row.startLocation.length > 5
                ? row.startLocation
                : startLat && startLng
                ? reverseGeocodeMapTiler(Number(startLat), Number(startLng)).catch(() => `${startLat}, ${startLng}`)
                : row.startLocation || "--",
              row.endLocation && row.endLocation !== "--" && row.endLocation.length > 5
                ? row.endLocation
                : endLat && endLng
                ? reverseGeocodeMapTiler(Number(endLat), Number(endLng)).catch(() => `${endLat}, ${endLng}`)
                : row.endLocation || "--",
            ]);

            return {
              ...row,
              startLocation,
              endLocation,
            };
          })
        );

        const vehicleName = device?.deviceName || device?.name || `Vehicle ${uniqueId}`;

        // Format data exactly like prepareExportData in status-report/page.tsx
        const allStatusRows = enrichedRows.length > 0
          ? enrichedRows.map((item: any) => {
              const startTime = item.startDateTime
                ? new Date(item.startDateTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : item.startTime || "--";

              const endTime = item.endDateTime
                ? new Date(item.endDateTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : item.endTime || "--";

              const distance =
                item.distance != null
                  ? typeof item.distance === "number"
                    ? (item.distance / 1000).toFixed(2)
                    : item.distance
                  : "0.00";

              const startCoordinates = item.startCoordinate?.latitude
                ? `${item.startCoordinate.latitude}, ${item.startCoordinate.longitude}`
                : item.startCoordinates || "--";

              const endCoordinates = item.endCoordinate?.latitude
                ? `${item.endCoordinate.latitude}, ${item.endCoordinate.longitude}`
                : item.endCoordinates || "--";

              return {
                name: item.name || vehicleName,
                vehicleStatus: item.vehicleStatus || item.status || "--",
                startTime,
                startLocation: item.startLocation || "--",
                startCoordinates,
                time: item.time || item.duration || "--",
                distance,
                maxSpeed: item.maxSpeed != null ? `${item.maxSpeed}` : "--",
                endTime,
                endLocation: item.endLocation || "--",
                endCoordinates,
              };
            })
          : [
              {
                name: vehicleName,
                vehicleStatus: device?.status || "online",
                startTime: `${start} Live`,
                startLocation: "--",
                startCoordinates: "--",
                time: "--",
                distance: "0.00",
                maxSpeed: "--",
                endTime: "Now",
                endLocation: "--",
                endCoordinates: "--",
              },
            ];

        // Export columns exactly matching status-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "vehicleStatus", label: "Status" },
          { key: "startTime", label: "Start Time" },
          { key: "startLocation", label: "Start Location" },
          { key: "startCoordinates", label: "Start Coordinates" },
          { key: "time", label: "Duration" },
          { key: "distance", label: "Distance (KM)" },
          { key: "maxSpeed", label: "Max Speed (KM/H)" },
          { key: "endTime", label: "End Time" },
          { key: "endLocation", label: "End Location" },
          { key: "endCoordinates", label: "End Coordinates" },
        ];

        return {
          title: `Vehicle Status Report: ${vehicleName} (${start} to ${end})`,
          type: "table",
          count: statusData.length,
          summary: `Showing status timeline records from ${start} to ${end} for ${vehicleName}. Found ${statusData.length} records.`,
          badges: [
            { label: "Vehicle No", value: vehicleName },
            { label: "Date Range", value: `${start} to ${end}` },
            { label: "Events Recorded", value: statusData.length },
          ],
          columns,
          data: allStatusRows.slice(0, 50),
          allData: allStatusRows,
        };
      }

      // 17b. Trip report of all vehicles
      case "get_all_vehicles_trip_report": {
        const fromDate = parseInputDate(fieldValues.from_date);
        const toDate = parseInputDate(fieldValues.to_date);
        let start = fromDate || todayStr;
        let end = toDate || todayStr;
        if (start > end) {
          [start, end] = [end, start];
        }

        const devices = await getCachedDevices();
        if (!devices || devices.length === 0) {
          return {
            title: `All Vehicles Trip Report (${start} to ${end})`,
            type: "empty",
            summary: "No vehicles found in the system.",
            count: 0,
          };
        }

        const results = await Promise.all(
          devices.map(async (d: any) => {
            try {
              const res = await reportService.getTripReport({
                uniqueId: d.uniqueId,
                page: 1,
                limit: "all",
                period: start === end && start === todayStr ? "Today" : "Custom",
                from: start,
                to: end,
              });
              const raw = res?.data?.data ?? res?.data ?? res?.trips ?? (Array.isArray(res) ? res : []);
              return (Array.isArray(raw) ? raw : []).map((r: any) => ({
                ...r,
                name: d.deviceName || d.name || r.name || String(d.uniqueId),
              }));
            } catch {
              return [];
            }
          })
        );
        const tripRows = results.flat();

        const isCoord = (addr?: string) => !addr || addr === "-" || addr === "--" || /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr.trim());

        // Enrich rows with addresses using reverseGeocodeMapTiler matching trip-report/page.tsx
        const enrichedRows = await Promise.all(
          tripRows.map(async (row: any) => {
            let startAddress = row.startAddress || "-";
            let endAddress = row.endAddress || "-";

            if (isCoord(startAddress) && row.startLatitude && row.startLongitude) {
              startAddress = await reverseGeocodeMapTiler(
                Number(row.startLatitude),
                Number(row.startLongitude)
              ).catch(() => `${row.startLatitude}, ${row.startLongitude}`) || "-";
            }

            if (isCoord(endAddress) && row.endLatitude && row.endLongitude) {
              endAddress = await reverseGeocodeMapTiler(
                Number(row.endLatitude),
                Number(row.endLongitude)
              ).catch(() => `${row.endLatitude}, ${row.endLongitude}`) || "-";
            }

            return {
              ...row,
              startAddress,
              endAddress,
            };
          })
        );

        // Format data exactly matching prepareExportData in trip-report/page.tsx
        const allTripData = enrichedRows.map((item: any) => {
          const startTime = item.startTime
            ? new Date(item.startTime).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              })
            : "--";

          const endTime = item.endTime
            ? new Date(item.endTime).toLocaleString("en-GB", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
                timeZone: "UTC",
              })
            : "--";

          const startCoordinates = item.startLatitude && item.startLongitude ? `${item.startLatitude}, ${item.startLongitude}` : item.startCoordinates || "--";
          const endCoordinates = item.endLatitude && item.endLongitude ? `${item.endLatitude}, ${item.endLongitude}` : item.endCoordinates || "--";
          const distanceNum = typeof item.distance === "string"
            ? parseFloat(item.distance)
            : Number(item.distance);
          const distance = !isNaN(distanceNum) ? distanceNum.toFixed(2) : "0.00";
          const maxSpeed = item.maxSpeed != null ? `${item.maxSpeed} km/h` : "0 km/h";

          return {
            name: item.name || "--",
            startTime,
            startAddress: item.startAddress || "-",
            startCoordinates,
            endTime,
            endAddress: item.endAddress || "-",
            endCoordinates,
            duration: item.duration || "--",
            distance,
            maxSpeed,
            startLatitude: item.startLatitude,
            startLongitude: item.startLongitude,
            endLatitude: item.endLatitude,
            endLongitude: item.endLongitude,
          };
        });

        // Columns matching exportColumns from trip-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "startTime", label: "Start Time" },
          { key: "startAddress", label: "Start Address" },
          { key: "startCoordinates", label: "Start Coordinates" },
          { key: "endTime", label: "End Time" },
          { key: "endAddress", label: "End Address" },
          { key: "endCoordinates", label: "End Coordinates" },
          { key: "duration", label: "Duration" },
          { key: "distance", label: "Distance (KM)" },
          { key: "maxSpeed", label: "Max Speed" },
        ];

        return {
          title: `All Vehicles Trip Report (${start} to ${end})`,
          type: "table",
          count: allTripData.length,
          summary: `Showing ${allTripData.length} trip records across all vehicles from ${start} to ${end}.`,
          badges: [
            { label: "Total Trips", value: allTripData.length },
            { label: "Date Range", value: `${start} to ${end}` },
          ],
          columns,
          data: allTripData.slice(0, 50),
          allData: allTripData,
        };
      }

      // 18. Show specific vehicle trip report
      case "get_specific_trip_report": {
        const inputStr = fieldValues.vehicle_input?.trim().toLowerCase();
        if (!inputStr || inputStr === "all" || inputStr === "all vehicles" || inputStr === "all devices" || inputStr === "every vehicle") {
          return executeChatbotFunction("get_all_vehicles_trip_report", fieldValues);
        }

        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Vehicle Trip Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const fromDate = fieldValues.from_date
          ? parseInputDate(fieldValues.from_date)
          : todayStr;
        const toDate = fieldValues.to_date
          ? parseInputDate(fieldValues.to_date)
          : todayStr;
        let start = fromDate;
        let end = toDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        let trips: any[] = [];
        try {
          const res = await reportService.getTripReport({
            uniqueId,
            page: 1,
            limit: "all",
            period: start === end && start === todayStr ? "Today" : "Custom",
            from: start,
            to: end,
          });
          const raw = res?.data?.data ?? res?.data ?? res?.trips ?? (Array.isArray(res) ? res : []);
          trips = Array.isArray(raw) ? raw : [];
        } catch (err) {
          console.error("Failed to fetch trip report:", err);
        }

        const isCoord = (addr?: string) => !addr || addr === "-" || addr === "--" || /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr.trim());

        // Enrich rows with addresses using reverseGeocodeMapTiler matching trip-report/page.tsx
        const enrichedRows = await Promise.all(
          trips.map(async (row: any) => {
            let startAddress = row.startAddress || "-";
            let endAddress = row.endAddress || "-";

            if (isCoord(startAddress) && row.startLatitude && row.startLongitude) {
              startAddress = await reverseGeocodeMapTiler(
                Number(row.startLatitude),
                Number(row.startLongitude)
              ).catch(() => `${row.startLatitude}, ${row.startLongitude}`) || "-";
            }

            if (isCoord(endAddress) && row.endLatitude && row.endLongitude) {
              endAddress = await reverseGeocodeMapTiler(
                Number(row.endLatitude),
                Number(row.endLongitude)
              ).catch(() => `${row.endLatitude}, ${row.endLongitude}`) || "-";
            }

            return {
              ...row,
              startAddress,
              endAddress,
            };
          })
        );

        const vehicleName = device?.deviceName || device?.name || `Vehicle ${uniqueId}`;

        // Format data exactly like prepareExportData in trip-report/page.tsx
        const allTripData = enrichedRows.length > 0
          ? enrichedRows.map((item: any) => {
              const startTime = item.startTime
                ? new Date(item.startTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : "--";

              const endTime = item.endTime
                ? new Date(item.endTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : "--";

              const startCoordinates = item.startLatitude && item.startLongitude ? `${item.startLatitude}, ${item.startLongitude}` : item.startCoordinates || "--";
              const endCoordinates = item.endLatitude && item.endLongitude ? `${item.endLatitude}, ${item.endLongitude}` : item.endCoordinates || "--";
              const distanceNum = typeof item.distance === "string"
                ? parseFloat(item.distance)
                : Number(item.distance);
              const distance = !isNaN(distanceNum) ? distanceNum.toFixed(2) : "0.00";
              const maxSpeed = item.maxSpeed != null ? `${item.maxSpeed} km/h` : "0 km/h";

              return {
                name: item.name || vehicleName,
                startTime,
                startAddress: item.startAddress || "-",
                startCoordinates,
                endTime,
                endAddress: item.endAddress || "-",
                endCoordinates,
                duration: item.duration || "--",
                distance,
                maxSpeed,
                startLatitude: item.startLatitude,
                startLongitude: item.startLongitude,
                endLatitude: item.endLatitude,
                endLongitude: item.endLongitude,
              };
            })
          : [
              {
                name: vehicleName,
                startTime: `${start} Live`,
                startAddress: "--",
                startCoordinates: "--",
                endTime: "Now",
                endAddress: "--",
                endCoordinates: "--",
                duration: "--",
                distance: "0.00",
                maxSpeed: "0 km/h",
              },
            ];

        // Columns matching exportColumns from trip-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "startTime", label: "Start Time" },
          { key: "startAddress", label: "Start Address" },
          { key: "startCoordinates", label: "Start Coordinates" },
          { key: "endTime", label: "End Time" },
          { key: "endAddress", label: "End Address" },
          { key: "endCoordinates", label: "End Coordinates" },
          { key: "duration", label: "Duration" },
          { key: "distance", label: "Distance (KM)" },
          { key: "maxSpeed", label: "Max Speed" },
        ];

        return {
          title: `Vehicle Trip Report: ${vehicleName} (${start} to ${end})`,
          type: "table",
          count: trips.length,
          summary: `Showing trip records from ${start} to ${end} for ${vehicleName}. Found ${trips.length} trips.`,
          badges: [
            { label: "Vehicle No", value: vehicleName },
            { label: "Date Range", value: `${start} to ${end}` },
            { label: "Total Trips", value: trips.length },
          ],
          columns,
          data: allTripData.slice(0, 50),
          allData: allTripData,
        };
      }

      // 19. Show specific vehicle idle report
      case "get_specific_idle_report": {
        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Idle Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const fromDate = fieldValues.from_date
          ? parseInputDate(fieldValues.from_date)
          : todayStr;
        const toDate = fieldValues.to_date
          ? parseInputDate(fieldValues.to_date)
          : todayStr;
        let start = fromDate;
        let end = toDate;
        if (start > end) {
          [start, end] = [end, start];
        }

        let idleRows: any[] = [];
        try {
          const res = await reportService.getIdleReport({
            uniqueId,
            page: 1,
            limit: "all",
            period: start === end && start === todayStr ? "Today" : "Custom",
            from: start,
            to: end,
          });
          const raw = res?.data?.idleArray ?? res?.idleArray ?? res?.data ?? res ?? [];
          idleRows = Array.isArray(raw) ? raw : [];
        } catch (err) {
          console.error("Failed to fetch idle report:", err);
        }

        // Enrich rows with addresses using reverseGeocodeMapTiler matching idle-report/page.tsx
        const enrichedRows = await Promise.all(
          idleRows.map(async (row: any) => {
            const lat = row.latitude ?? row.lat;
            const lng = row.longitude ?? row.lng;
            const location =
              row.location && row.location !== "--" && row.location.length > 5
                ? row.location
                : lat && lng
                ? await reverseGeocodeMapTiler(Number(lat), Number(lng)).catch(() => `${lat}, ${lng}`)
                : row.location || row.address || "--";

            return {
              ...row,
              location,
            };
          })
        );

        const vehicleName = device?.deviceName || device?.name || `Vehicle ${uniqueId}`;

        // Format data exactly like prepareExportData & enrichIdleReportWithAddress in idle-report/page.tsx
        const allIdleData = enrichedRows.length > 0
          ? enrichedRows.map((r: any) => {
              const arrival = new Date(r.idleStartTime || r.startDateTime || r.startTime).getTime();
              const departure = new Date(r.idleEndTime || r.endDateTime || r.endTime).getTime();

              let haltTime = r.haltTime || r.time || r.duration;
              if (!haltTime && arrival && departure) {
                const diffMs = Math.max(departure - arrival, 0);
                const hours = Math.floor(diffMs / 3600000);
                const minutes = Math.floor((diffMs % 3600000) / 60000);
                const seconds = Math.floor((diffMs % 60000) / 1000);
                haltTime = `${hours}H ${minutes}M ${seconds}S`;
              }

              const arrivalTime = r.idleStartTime || r.startDateTime || r.startTime
                ? new Date(r.idleStartTime || r.startDateTime || r.startTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : "--";

              const departureTime = r.idleEndTime || r.endDateTime || r.endTime
                ? new Date(r.idleEndTime || r.endDateTime || r.endTime).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                    timeZone: "UTC",
                  })
                : "--";

              const coordinates = r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : r.coordinates || "--";

              return {
                name: r.name || vehicleName,
                arrivalTime,
                departureTime,
                haltTime: haltTime || "--",
                location: r.location || "--",
                coordinates,
              };
            })
          : [
              {
                name: vehicleName,
                arrivalTime: `${start} Live`,
                departureTime: "Now",
                haltTime: "--",
                location: "--",
                coordinates: "--",
              },
            ];

        // Columns matching exportColumns from idle-report/page.tsx
        const columns = [
          { key: "name", label: "Vehicle No" },
          { key: "arrivalTime", label: "Start Time" },
          { key: "departureTime", label: "End Time" },
          { key: "haltTime", label: "Duration" },
          { key: "location", label: "Location" },
          { key: "coordinates", label: "Coordinates" },
        ];

        return {
          title: `Vehicle Idle Report: ${vehicleName} (${start} to ${end})`,
          type: "table",
          count: idleRows.length,
          summary: `Showing idle records from ${start} to ${end} for ${vehicleName}. Found ${idleRows.length} idle periods.`,
          badges: [
            { label: "Vehicle No", value: vehicleName },
            { label: "Date Range", value: `${start} to ${end}` },
            { label: "Idle Count", value: idleRows.length },
          ],
          columns,
          data: allIdleData.slice(0, 50),
          allData: allIdleData,
        };
      }

      // 19b. Travel summary of all vehicles
      case "get_all_vehicles_travel_summary": {
        const fromDate = parseInputDate(fieldValues.from_date);
        const toDate = parseInputDate(fieldValues.to_date);
        let start = fromDate || todayStr;
        let end = toDate || todayStr;
        if (start > end) {
          [start, end] = [end, start];
        }

        const devices = await getCachedDevices();
        if (!devices || devices.length === 0) {
          return {
            title: `All Vehicles Travel Summary (${start} to ${end})`,
            type: "empty",
            summary: "No vehicles found in the system.",
            count: 0,
          };
        }

        const uniqueIds = devices
          .map((d: any) => Number(d.uniqueId))
          .filter((id: number) => !isNaN(id) && id > 0);

        const deviceByUniqueId = new Map<string, any>();
        devices.forEach((d: any) => {
          if (d.uniqueId != null) {
            deviceByUniqueId.set(String(d.uniqueId), d);
          }
        });

        let travelRows: any[] = [];
        try {
          const res = await reportService.getTravelSummaryReport({
            uniqueIds,
            page: 1,
            limit: "all",
            period: "Custom",
            from: start,
            to: end,
          });
          const raw = res?.reportData ?? res?.data?.reportData ?? res?.data ?? res ?? [];
          travelRows = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? [raw] : []);
        } catch (err) {
          console.error("Failed to fetch travel summary for all vehicles:", err);
        }

        // Enrich rows with addresses using reverseGeocodeMapTiler matching travel-summary/page.tsx
        const enrichedRows = await Promise.all(
          travelRows.map(async (row: any) => {
            const resolvedUniqueId = row.uniqueId || row.dayWiseTrips?.[0]?.uniqueId;
            const matchedDevice = resolvedUniqueId ? deviceByUniqueId.get(String(resolvedUniqueId)) : null;
            const vName = matchedDevice?.deviceName || matchedDevice?.name || row.name || String(resolvedUniqueId || "-");

            let startAddress = row.startAddress && row.startAddress !== "-" && row.startAddress !== "--" ? row.startAddress : "-";
            let endAddress = row.endAddress && row.endAddress !== "-" && row.endAddress !== "--" ? row.endAddress : "-";

            if ((!startAddress || startAddress === "-") && row.startLat && row.startLong) {
              try {
                const addr = await reverseGeocodeMapTiler(Number(row.startLat), Number(row.startLong));
                if (addr) startAddress = addr;
              } catch {
                startAddress = `${row.startLat}, ${row.startLong}`;
              }
            }

            if ((!endAddress || endAddress === "-") && row.endLat && row.endLong) {
              try {
                const addr = await reverseGeocodeMapTiler(Number(row.endLat), Number(row.endLong));
                if (addr) endAddress = addr;
              } catch {
                endAddress = `${row.endLat}, ${row.endLong}`;
              }
            }

            let enrichedDayWiseTrips = row.dayWiseTrips || [];
            if (Array.isArray(row.dayWiseTrips) && row.dayWiseTrips.length > 0) {
              enrichedDayWiseTrips = await Promise.all(
                row.dayWiseTrips.map(async (trip: any) => {
                  let tripStartAddress = trip.startAddress && trip.startAddress !== "-" && trip.startAddress !== "--" ? trip.startAddress : "-";
                  let tripEndAddress = trip.endAddress && trip.endAddress !== "-" && trip.endAddress !== "--" ? trip.endAddress : "-";

                  if ((!tripStartAddress || tripStartAddress === "-") && trip.startLatitude && trip.startLongitude) {
                    try {
                      const addr = await reverseGeocodeMapTiler(Number(trip.startLatitude), Number(trip.startLongitude));
                      if (addr) tripStartAddress = addr;
                    } catch {
                      tripStartAddress = `${trip.startLatitude}, ${trip.startLongitude}`;
                    }
                  }

                  if ((!tripEndAddress || tripEndAddress === "-") && trip.endLatitude && trip.endLongitude) {
                    try {
                      const addr = await reverseGeocodeMapTiler(Number(trip.endLatitude), Number(trip.endLongitude));
                      if (addr) tripEndAddress = addr;
                    } catch {
                      tripEndAddress = `${trip.endLatitude}, ${trip.endLongitude}`;
                    }
                  }

                  return {
                    ...trip,
                    startAddress: tripStartAddress,
                    endAddress: tripEndAddress,
                  };
                })
              );
            }

            return {
              ...row,
              vehicleName: vName,
              startAddress,
              endAddress,
              dayWiseTrips: enrichedDayWiseTrips,
            };
          })
        );

        // Format data matching prepareExportData in travel-summary/page.tsx
        const allTravelData = enrichedRows.map((item: any) => {
          const vName = item.vehicleName || item.name || "-";
          const distance = item.distance != null ? Number(item.distance).toFixed(2) : "0.00";
          const maxSpeed = item.maxSpeed != null ? Number(item.maxSpeed).toFixed(2) : "0.00";
          const avgSpeed = item.avgSpeed != null ? Number(item.avgSpeed).toFixed(2) : "0.00";

          const startCoordinates = item.startLat && item.startLong
            ? `${item.startLat}, ${item.startLong}`
            : "-";
          const endCoordinates = item.endLat && item.endLong
            ? `${item.endLat}, ${item.endLong}`
            : "-";

          return {
            ...item,
            vehicleName: vName,
            distance,
            maxSpeed,
            avgSpeed,
            startCoordinates,
            endCoordinates,
            running: item.running || "0D, 0H, 0M, 0S",
            idle: item.idle || "0D, 0H, 0M, 0S",
            stop: item.stop || "0D, 0H, 0M, 0S",
            workingHours: item.workingHours || "0D, 0H, 0M, 0S",
            startAddress: item.startAddress || "-",
            endAddress: item.endAddress || "-",
          };
        });

        // Columns matching exportColumns from travel-summary/page.tsx
        const columns = [
          { key: "vehicleName", label: "Vehicle No" },
          { key: "startAddress", label: "Start Address" },
          { key: "startCoordinates", label: "Start Coordinates" },
          { key: "distance", label: "Distance (KM)" },
          { key: "running", label: "Running Time" },
          { key: "idle", label: "Idle Time" },
          { key: "stop", label: "Stop Time" },
          { key: "workingHours", label: "Working Hours" },
          { key: "maxSpeed", label: "Max Speed (KM/H)" },
          { key: "avgSpeed", label: "Avg Speed (KM/H)" },
          { key: "endAddress", label: "End Address" },
          { key: "endCoordinates", label: "End Coordinates" },
        ];

        const totalFleetDistance = allTravelData
          .reduce((acc, curr) => acc + (Number(curr.distance) || 0), 0)
          .toFixed(2);
        const activeVehicles = allTravelData.filter((d) => Number(d.distance) > 0).length;

        return {
          title: `All Vehicles Travel Summary (${start} to ${end})`,
          type: "table",
          count: allTravelData.length,
          summary: `Travel summary for ${allTravelData.length} vehicles from ${start} to ${end}. Fleet total distance: ${totalFleetDistance} KM (${activeVehicles} active vehicles).`,
          badges: [
            { label: "Total Vehicles", value: allTravelData.length, color: "blue" },
            { label: "Active Vehicles", value: activeVehicles, color: "green" },
            { label: "Fleet Distance", value: `${totalFleetDistance} KM`, color: "purple" },
          ],
          columns,
          data: allTravelData.slice(0, 50),
          allData: allTravelData,
        };
      }

      // 20. Show specific vehicle travel summary
      case "get_specific_travel_summary":
      case "get_travel_summary_by_date_range": {
        const inputStr = fieldValues.vehicle_input?.trim().toLowerCase();
        if (!inputStr || inputStr === "all" || inputStr === "all vehicles" || inputStr === "all devices" || inputStr === "every vehicle") {
          return executeChatbotFunction("get_all_vehicles_travel_summary", fieldValues);
        }

        const { uniqueId, device } = await resolveVehicle(fieldValues.vehicle_input);
        if (!uniqueId) {
          return {
            title: "Travel Summary Report",
            type: "empty",
            summary: `Vehicle "${fieldValues.vehicle_input}" not found.`,
          };
        }

        const vehicleName = device?.deviceName || device?.name || String(uniqueId);
        const start = parseInputDate(fieldValues.from_date) || todayStr;
        const end = parseInputDate(fieldValues.to_date) || todayStr;

        let travelRows: any[] = [];
        try {
          const res = await reportService.getTravelSummaryReport({
            uniqueIds: [Number(uniqueId)],
            page: 1,
            limit: "all",
            period: "Custom",
            from: start,
            to: end,
          });
          const raw = res?.reportData ?? res?.data?.reportData ?? res?.data ?? res ?? [];
          travelRows = Array.isArray(raw) ? raw : (raw && typeof raw === "object" ? [raw] : []);
        } catch (err) {
          console.error("Failed to fetch travel summary report:", err);
        }

        // Enrich rows with addresses using reverseGeocodeMapTiler matching travel-summary/page.tsx
        const enrichedRows = await Promise.all(
          travelRows.map(async (row: any) => {
            let startAddress = row.startAddress && row.startAddress !== "-" && row.startAddress !== "--" ? row.startAddress : "-";
            let endAddress = row.endAddress && row.endAddress !== "-" && row.endAddress !== "--" ? row.endAddress : "-";

            if ((!startAddress || startAddress === "-") && row.startLat && row.startLong) {
              try {
                const addr = await reverseGeocodeMapTiler(Number(row.startLat), Number(row.startLong));
                if (addr) startAddress = addr;
              } catch {
                startAddress = `${row.startLat}, ${row.startLong}`;
              }
            }

            if ((!endAddress || endAddress === "-") && row.endLat && row.endLong) {
              try {
                const addr = await reverseGeocodeMapTiler(Number(row.endLat), Number(row.endLong));
                if (addr) endAddress = addr;
              } catch {
                endAddress = `${row.endLat}, ${row.endLong}`;
              }
            }

            let enrichedDayWiseTrips = row.dayWiseTrips || [];
            if (Array.isArray(row.dayWiseTrips) && row.dayWiseTrips.length > 0) {
              enrichedDayWiseTrips = await Promise.all(
                row.dayWiseTrips.map(async (trip: any) => {
                  let tripStartAddress = trip.startAddress && trip.startAddress !== "-" && trip.startAddress !== "--" ? trip.startAddress : "-";
                  let tripEndAddress = trip.endAddress && trip.endAddress !== "-" && trip.endAddress !== "--" ? trip.endAddress : "-";

                  if ((!tripStartAddress || tripStartAddress === "-") && trip.startLatitude && trip.startLongitude) {
                    try {
                      const addr = await reverseGeocodeMapTiler(Number(trip.startLatitude), Number(trip.startLongitude));
                      if (addr) tripStartAddress = addr;
                    } catch {
                      tripStartAddress = `${trip.startLatitude}, ${trip.startLongitude}`;
                    }
                  }

                  if ((!tripEndAddress || tripEndAddress === "-") && trip.endLatitude && trip.endLongitude) {
                    try {
                      const addr = await reverseGeocodeMapTiler(Number(trip.endLatitude), Number(trip.endLongitude));
                      if (addr) tripEndAddress = addr;
                    } catch {
                      tripEndAddress = `${trip.endLatitude}, ${trip.endLongitude}`;
                    }
                  }

                  return {
                    ...trip,
                    startAddress: tripStartAddress,
                    endAddress: tripEndAddress,
                  };
                })
              );
            }

            return {
              ...row,
              startAddress,
              endAddress,
              dayWiseTrips: enrichedDayWiseTrips,
            };
          })
        );

        // Format data matching prepareExportData in travel-summary/page.tsx
        const allTravelData = enrichedRows.map((item: any) => {
          const vName = device?.deviceName || device?.name || item.name || vehicleName;
          const distance = item.distance != null ? Number(item.distance).toFixed(2) : "0.00";
          const maxSpeed = item.maxSpeed != null ? Number(item.maxSpeed).toFixed(2) : "0.00";
          const avgSpeed = item.avgSpeed != null ? Number(item.avgSpeed).toFixed(2) : "0.00";

          const startCoordinates = item.startLat && item.startLong
            ? `${item.startLat}, ${item.startLong}`
            : "-";
          const endCoordinates = item.endLat && item.endLong
            ? `${item.endLat}, ${item.endLong}`
            : "-";

          return {
            ...item,
            vehicleName: vName,
            distance,
            maxSpeed,
            avgSpeed,
            startCoordinates,
            endCoordinates,
            running: item.running || "0D, 0H, 0M, 0S",
            idle: item.idle || "0D, 0H, 0M, 0S",
            stop: item.stop || "0D, 0H, 0M, 0S",
            workingHours: item.workingHours || "0D, 0H, 0M, 0S",
            startAddress: item.startAddress || "-",
            endAddress: item.endAddress || "-",
          };
        });

        // Columns matching exportColumns from travel-summary/page.tsx
        const columns = [
          { key: "vehicleName", label: "Vehicle No" },
          { key: "startAddress", label: "Start Address" },
          { key: "startCoordinates", label: "Start Coordinates" },
          { key: "distance", label: "Distance (KM)" },
          { key: "running", label: "Running Time" },
          { key: "idle", label: "Idle Time" },
          { key: "stop", label: "Stop Time" },
          { key: "workingHours", label: "Working Hours" },
          { key: "maxSpeed", label: "Max Speed (KM/H)" },
          { key: "avgSpeed", label: "Avg Speed (KM/H)" },
          { key: "endAddress", label: "End Address" },
          { key: "endCoordinates", label: "End Coordinates" },
        ];

        const primaryRow = allTravelData[0];
        const totalDistance = primaryRow?.distance ?? "0.00";
        const runningTime = primaryRow?.running ?? "0D, 0H, 0M, 0S";
        const idleTime = primaryRow?.idle ?? "0D, 0H, 0M, 0S";
        const workingHours = primaryRow?.workingHours ?? "0D, 0H, 0M, 0S";

        return {
          title: `Vehicle Travel Summary: ${vehicleName} (${start} to ${end})`,
          type: "table",
          count: allTravelData.length,
          summary: `Showing travel summary from ${start} to ${end} for ${vehicleName}. Total distance covered: ${totalDistance} KM with ${runningTime} running time.`,
          badges: [
            { label: "Distance", value: `${totalDistance} KM`, color: "blue" },
            { label: "Running Time", value: runningTime, color: "green" },
            { label: "Idle Time", value: idleTime, color: "amber" },
            { label: "Working Hours", value: workingHours, color: "purple" },
          ],
          columns,
          data: allTravelData.slice(0, 50),
          allData: allTravelData,
        };
      }

      // 22. Show routes
      case "get_superadmin_route_profile": {
        let routes: any[] = [];
        try {
          const res = await routeService.getRoutes({ page: 1, limit: "all" });
          routes = Array.isArray(res?.data) ? res.data : (res as any)?.routes || [];
        } catch {
          const res = await routeService.getRoutes({ page: 1, limit: 10000 });
          routes = Array.isArray(res?.data) ? res.data : (res as any)?.routes || [];
        }

        if (!routes.length) {
          return {
            title: "Fleet Routes",
            type: "empty",
            summary: "No routes currently configured.",
          };
        }

        const allRoutes = routes.map((r: any) => ({
          name: r.routeName || r.name || "--",
          start: r.startPoint?.name || r.startLocation || "--",
          end: r.endPoint?.name || r.endLocation || "--",
          distance: r.distance ? `${r.distance} km` : "--",
        }));

        return {
          title: "Fleet Routes",
          type: "table",
          count: routes.length,
          summary: `Found ${routes.length} configured routes.`,
          columns: [
            { key: "name", label: "Route Name" },
            { key: "start", label: "Start Location" },
            { key: "end", label: "End Location" },
            { key: "distance", label: "Distance" },
          ],
          data: allRoutes.slice(0, 50),
          allData: allRoutes,
        };
      }

      // 23. Show subscriptions
      case "get_all_subscriptions": {
        let subs: any[] = [];
        try {
          const res = await subscriptionExpiryService.getSubscriptionExpiry();
          subs = Array.isArray(res?.data) ? res.data : [];
        } catch {
          const alt = await api.get("/branch/subscription/expired");
          subs = Array.isArray(alt.data?.data) ? alt.data.data : [];
        }

        if (!subs.length) {
          return {
            title: "Active Subscriptions",
            type: "cards",
            summary: "All branches and devices currently have active subscriptions. No expired accounts found.",
            badges: [{ label: "Status", value: "All Active", color: "green" }],
            data: [
              {
                "Subscription Status": "All accounts in good standing",
                "Expired Count": 0,
                "Next Steps": "No renewals currently overdue.",
              },
            ],
          };
        }

        return {
          title: "Subscription Status",
          type: "table",
          count: subs.length,
          summary: `Detected ${subs.length} branch subscription(s) requiring attention.`,
          badges: [{ label: "Expired Accounts", value: subs.length, color: "red" }],
          columns: [
            { key: "branch", label: "Branch" },
            { key: "school", label: "School" },
            { key: "expiry", label: "Expiration Date" },
          ],
          data: subs.map((s: any) => ({
            branch: s.branchName || s.name || "--",
            school: s.schoolId?.schoolName || s.schoolName || "--",
            expiry: s.expirationDate ? new Date(s.expirationDate).toLocaleDateString() : "--",
          })),
        };
      }

      // 24. Show subscription history
      case "get_all_subscription_history": {
        let hist: any[] = [];
        try {
          const res = await api.get("/subscription/history");
          hist = Array.isArray(res.data) ? res.data : (res.data as any)?.history || [];
        } catch {
          // Fallback to expired subscriptions list as historical data
          const subRes = await subscriptionExpiryService.getSubscriptionExpiry().catch(() => null);
          hist = Array.isArray(subRes?.data) ? subRes.data : [];
        }

        if (!hist.length) {
          return {
            title: "Subscription History",
            type: "empty",
            summary: "No historical subscription logs available.",
          };
        }

        return {
          title: "Subscription History",
          type: "table",
          count: hist.length,
          summary: `Showing ${hist.length} subscription log entries.`,
          columns: [
            { key: "branch", label: "Branch" },
            { key: "date", label: "Date" },
            { key: "status", label: "Status" },
          ],
          data: hist.map((h: any) => ({
            branch: h.branchName || h.name || "--",
            date: h.createdAt || h.expirationDate ? new Date(h.createdAt || h.expirationDate).toLocaleDateString() : "--",
            status: h.status || "Expired / Renewed",
          })),
        };
      }

      // 25. Show tickets
      case "get_all_tickets": {
        const res = await api.get("/get-tickets?page=1&limit=20");
        const tickets = Array.isArray(res.data?.tickets)
          ? res.data.tickets
          : Array.isArray(res.data)
          ? res.data
          : [];

        if (!tickets.length) {
          return {
            title: "Support Tickets",
            type: "empty",
            summary: "No support tickets found.",
          };
        }

        return {
          title: "Support Tickets",
          type: "table",
          count: tickets.length,
          summary: `Found ${tickets.length} recent support ticket(s).`,
          columns: [
            { key: "id", label: "Ticket ID" },
            { key: "status", label: "Status" },
            { key: "desc", label: "Description" },
            { key: "role", label: "Role" },
          ],
          data: tickets.map((t: any) => ({
            id: t.ticket_id || t._id?.slice(-6) || "--",
            status: t.status || "Open",
            desc: t.description || "--",
            role: t.role || "--",
          })),
        };
      }

      // 26. Show user sessions
      case "get_all_sessions": {
        return {
          title: "Active User Sessions",
          type: "cards",
          summary: "Current session and authentication status.",
          badges: [{ label: "Session", value: "Active", color: "green" }],
          data: [
            {
              "Authentication": "Logged In",
              "Status": "Online",
              "Client": typeof window !== "undefined" ? window.navigator.userAgent.slice(0, 40) + "..." : "Browser",
              "Timestamp": new Date().toLocaleString(),
            },
          ],
        };
      }

      default:
        return {
          title: "Query Response",
          type: "empty",
          summary: `No handler implemented for function: ${funcName}`,
        };
    }
  } catch (error: any) {
    console.error(`Error executing chatbot function ${funcName}:`, error);
    return {
      title: "Query Error",
      type: "error",
      summary: error?.response?.data?.message || error?.message || "Failed to retrieve data from server.",
    };
  }
};
