"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  HARDCODED_QUESTIONS,
  ChatQuestion,
  ChatbotExecutionResult,
  executeChatbotFunction,
} from "@/services/api/aiChatBotService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useExport } from "@/hooks/useExport";
import { useAiChatBotStore } from "@/store/aiChatBotStore";
import { FrameSequencePlayer } from "@/components/ui/FrameSequencePlayer";
import DateRangeFilter from "@/components/ui/DateRangeFilter";
import { formatDateToYYYYMMDD } from "@/util/formatDate";
import { reverseGeocodeMapTiler } from "@/hooks/useReverseGeocoding";
import {
  Bot,
  X,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  ArrowRight,
  RefreshCw,
  Car,
  Compass,
  MapPin,
  Shield,
  Activity,
  PauseCircle,
  Clock,
  Route,
  Timer,
  BarChart3,
  Calendar,
  Building2,
  Layers,
  Users,
  CreditCard,
  Ticket,
  Laptop,
  Search,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileText,
  Download,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text?: string;
  timestamp: string;
  question?: ChatQuestion;
  pendingFields?: {
    question: ChatQuestion;
    values: Record<string, string>;
  };
  result?: ChatbotExecutionResult;
  isLoading?: boolean;
}

const getQuestionIcon = (funcName: string) => {
  if (funcName.includes("distance") || funcName.includes("km")) return Compass;
  if (funcName.includes("last_position")) return MapPin;
  if (funcName.includes("geofence")) return Shield;
  if (funcName.includes("active")) return Activity;
  if (funcName.includes("stopped")) return PauseCircle;
  if (funcName.includes("status")) return Clock;
  if (funcName.includes("trip")) return Route;
  if (funcName.includes("idle")) return Timer;
  if (funcName.includes("travel_summary")) return BarChart3;
  if (funcName.includes("vehicle") || funcName.includes("device")) return Car;
  if (funcName.includes("school")) return Building2;
  if (funcName.includes("branch_group")) return Layers;
  if (funcName.includes("branch")) return Users;
  if (funcName.includes("route")) return Route;
  if (funcName.includes("subscription")) return CreditCard;
  if (funcName.includes("ticket")) return Ticket;
  if (funcName.includes("session")) return Laptop;
  return Sparkles;
};

export const AiChatBot: React.FC = () => {
  const { exportToPDF, exportToExcel } = useExport();
  const { isOpen, setIsOpen } = useAiChatBotStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState("");
  const [pendingFormValues, setPendingFormValues] = useState<Record<string, string>>({});
  const [exportingId, setExportingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: "👋 Hello! I am parentseye.ai, your intelligent fleet assistant. You can ask me anything about vehicle statuses, live KM reports, trip history, idle times, stoppages, travel summaries. Choose from the quick queries below or type your question!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Autocomplete matching questions for input
  const inputMatches = useMemo(() => {
    if (!inputVal.trim()) return [];
    const lower = inputVal.toLowerCase().trim();
    const words = lower
      .split(/\s+/)
      .filter((w) => w.length > 1 && !["add", "the", "of"].includes(w));
    return HARDCODED_QUESTIONS.filter(
      (q) =>
        q.question.toLowerCase().includes(lower) ||
        (q.intent && q.intent.toLowerCase().includes(lower)) ||
        (words.length > 0 &&
          words.every((word) => q.question.toLowerCase().includes(word)))
    ).slice(0, 5);
  }, [inputVal]);

  // Handle Question selection
  const handleSelectQuestion = async (q: ChatQuestion, providedFields?: Record<string, string>) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // If question has fields and values are not yet provided, show interactive inline form
    if (q.fields && q.fields.length > 0 && !providedFields) {
      const initialFields: Record<string, string> = {};
      const defaultStart =
        formatDateToYYYYMMDD(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)) || "";
      const defaultEnd = formatDateToYYYYMMDD(new Date()) || "";

      q.fields.forEach((f) => {
        if (f.name === "from_date") {
          initialFields[f.name] = defaultStart;
        } else if (f.name === "to_date") {
          initialFields[f.name] = defaultEnd;
        } else {
          initialFields[f.name] = "";
        }
      });
      setPendingFormValues(initialFields);

      // Add user message indicating selection
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: q.question,
          timestamp,
        },
        {
          id: `bot-prompt-${Date.now()}`,
          sender: "bot",
          text: `Please provide details for "${q.question.trim()}":`,
          question: q,
          pendingFields: {
            question: q,
            values: initialFields,
          },
          timestamp,
        },
      ]);
      return;
    }

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: "user",
        text: q.question,
        timestamp,
      },
    ]);

    // Add loading message from bot
    const botMsgId = `bot-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        sender: "bot",
        isLoading: true,
        text: "Fetching live report data...",
        timestamp,
      },
    ]);

    // Execute the function
    const result = await executeChatbotFunction(q.function, providedFields || {});

    // Replace loading message with result
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === botMsgId
          ? {
            ...msg,
            isLoading: false,
            text: result.summary,
            result,
          }
          : msg
      )
    );
  };

  // Submit inline field form
  const handleFieldSubmit = (q: ChatQuestion) => {
    handleSelectQuestion(q, pendingFormValues);
    setPendingFormValues({});
  };

  // Handle free-form input submit
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    // Check if there is an exact or best matching question
    const lower = inputVal.toLowerCase().trim();
    let match =
      HARDCODED_QUESTIONS.find((q) => q.question.toLowerCase().trim() === lower) ||
      HARDCODED_QUESTIONS.find((q) => q.question.toLowerCase().includes(lower)) ||
      HARDCODED_QUESTIONS.find((q) => lower.includes(q.question.toLowerCase().trim()));

    if (!match) {
      if (
        (lower.includes("distance") || lower.includes("km")) &&
        (lower.includes("all") || lower.includes("every") || lower.includes("fleet"))
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_all_vehicles_distance_report"
        );
      } else if (
        lower.includes("status") &&
        (lower.includes("report") || lower.includes("vehicle") || lower.includes("timeline") || lower.includes("history"))
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_specific_status_report"
        );
      } else if (
        lower.includes("idle") &&
        (lower.includes("report") || lower.includes("vehicle") || lower.includes("show"))
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_specific_idle_report"
        );
      } else if (
        lower.includes("stop") || lower.includes("stopped") || lower.includes("stoppage")
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_specific_stopped_vehicle"
        );
      } else if (
        lower.includes("travel") &&
        (lower.includes("all") || lower.includes("every") || lower.includes("fleet") || lower.includes("devices") || lower.includes("vehicles"))
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_all_vehicles_travel_summary"
        );
      } else if (
        lower.includes("travel") &&
        (lower.includes("summary") || lower.includes("report") || lower.includes("vehicle") || lower.includes("show"))
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_specific_travel_summary"
        );
      } else if (
        lower.includes("trip") &&
        !lower.includes("travel")
      ) {
        match = HARDCODED_QUESTIONS.find(
          (q) => q.function === "get_specific_trip_report"
        );
      }
    }

    if (match) {
      handleSelectQuestion(match);
    } else {
      // Fallback: respond with guidance
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          sender: "user",
          text: inputVal,
          timestamp,
        },
        {
          id: `bot-${Date.now()}`,
          sender: "bot",
          text: `I couldn't find a direct report for "${inputVal}". Please select one of the available questions below or filter by category.`,
          timestamp,
        },
      ]);
    }

    setInputVal("");
    setShowSuggestions(false);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "bot",
        text: "Chat cleared! How can I assist you with your fleet and reports today?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleExportResult = async (
    msgId: string,
    result: ChatbotExecutionResult,
    format: "pdf" | "excel"
  ) => {
    // Always export the full unpaginated dataset if available
    const sourceData = (result.allData && result.allData.length > 0)
      ? result.allData
      : result.data;

    if (!sourceData || sourceData.length === 0) return;

    try {
      setExportingId(`${msgId}-${format}`);

      // Extract columns
      let columns: { key: string; header: string }[] = [];
      if (result.columns && result.columns.length > 0) {
        columns = result.columns.map((c) => ({
          key: c.key,
          header: c.label || c.key,
        }));
      } else {
        const sample = sourceData[0];
        columns = Object.keys(sample).map((key) => ({
          key,
          header: key
            .replace(/([A-Z])/g, " $1")
            .replace(/_/g, " ")
            .replace(/^\w/, (c) => c.toUpperCase())
            .trim(),
        }));
      }

      // Exclude branch, message, and status when exporting distance reports
      const isDistanceReport =
        result.title?.toLowerCase().includes("distance") ||
        columns.some((c) => c.key === "totalKm");

      if (isDistanceReport) {
        const excludedKeys = new Set([
          "branch",
          "branchname",
          "branchid",
          "message",
          "status",
        ]);
        columns = columns.filter(
          (c) =>
            !excludedKeys.has(c.key.toLowerCase().replace(/[^a-z]/g, ""))
        );
      }

      // Check if exporting status report to match the status-report page exactly
      const isStatusReport =
        result.title?.toLowerCase().includes("status") &&
        (columns.some((c) => c.key === "vehicleStatus" || c.key === "startLocation" || c.key === "startCoordinates") ||
          sourceData.some((r) => "vehicleStatus" in r || "startCoordinate" in r));

      if (isStatusReport) {
        columns = [
          { key: "name", header: "Vehicle No" },
          { key: "vehicleStatus", header: "Status" },
          { key: "startTime", header: "Start Time" },
          { key: "startLocation", header: "Start Location" },
          { key: "startCoordinates", header: "Start Coordinates" },
          { key: "time", header: "Duration" },
          { key: "distance", header: "Distance (KM)" },
          { key: "maxSpeed", header: "Max Speed (KM/H)" },
          { key: "endTime", header: "End Time" },
          { key: "endLocation", header: "End Location" },
          { key: "endCoordinates", header: "End Coordinates" },
        ];
      }

      // Check if exporting stop report to match the stop-report page exactly
      const isStopReport = Boolean(
        (result.title?.toLowerCase().includes("stop") ||
          result.title?.toLowerCase().includes("stopped") ||
          result.title?.toLowerCase().includes("stoppage") ||
          result.title?.toLowerCase().includes("halt")) &&
        !result.title?.toLowerCase().includes("travel")
      );

      if (isStopReport) {
        columns = [
          { key: "name", header: "Vehicle No" },
          { key: "arrivalTime", header: "Start Time" },
          { key: "departureTime", header: "End Time" },
          { key: "haltTime", header: "Duration" },
          { key: "location", header: "Location" },
          { key: "coordinates", header: "Coordinates" },
        ];
      }

      // Check if exporting idle report to match the idle-report page exactly
      const isIdleReport =
        !isStopReport &&
        Boolean(result.title?.toLowerCase().includes("idle"));

      if (isIdleReport) {
        columns = [
          { key: "name", header: "Vehicle No" },
          { key: "arrivalTime", header: "Start Time" },
          { key: "departureTime", header: "End Time" },
          { key: "haltTime", header: "Duration" },
          { key: "location", header: "Location" },
          { key: "coordinates", header: "Coordinates" },
        ];
      }

      // Check if exporting trip report to match the trip-report page exactly
      const isTripReport = Boolean(
        result.title?.toLowerCase().includes("trip") &&
        !result.title?.toLowerCase().includes("travel")
      );

      if (isTripReport) {
        columns = [
          { key: "name", header: "Vehicle No" },
          { key: "startTime", header: "Start Time" },
          { key: "startAddress", header: "Start Address" },
          { key: "startCoordinates", header: "Start Coordinates" },
          { key: "endTime", header: "End Time" },
          { key: "endAddress", header: "End Address" },
          { key: "endCoordinates", header: "End Coordinates" },
          { key: "duration", header: "Duration" },
          { key: "distance", header: "Distance (KM)" },
          { key: "maxSpeed", header: "Max Speed" },
        ];
      }

      // Check if exporting travel summary report to match the travel-summary page exactly
      const isTravelSummary =
        result.title?.toLowerCase().includes("travel") ||
        columns.some((c) => c.key === "workingHours" || (c.key === "running" && columns.some((c2) => c2.key === "idle")));

      if (isTravelSummary) {
        columns = [
          { key: "vehicleName", header: "Vehicle No" },
          { key: "startAddress", header: "Start Address" },
          { key: "startCoordinates", header: "Start Coordinates" },
          { key: "distance", header: "Distance (KM)" },
          { key: "running", header: "Running Time" },
          { key: "idle", header: "Idle Time" },
          { key: "stop", header: "Stop Time" },
          { key: "workingHours", header: "Working Hours" },
          { key: "maxSpeed", header: "Max Speed (KM/H)" },
          { key: "avgSpeed", header: "Avg Speed (KM/H)" },
          { key: "endAddress", header: "End Address" },
          { key: "endCoordinates", header: "End Coordinates" },
        ];
      }

      // If status report, ensure all addresses are resolved before exporting
      let dataToExport = sourceData;
      if (isStatusReport) {
        dataToExport = await Promise.all(
          sourceData.map(async (item) => {
            const startLat = item.startCoordinate?.latitude ?? item.startLatitude;
            const startLng = item.startCoordinate?.longitude ?? item.startLongitude;
            const endLat = item.endCoordinate?.latitude ?? item.endLatitude;
            const endLng = item.endCoordinate?.longitude ?? item.endLongitude;

            const [startLocation, endLocation] = await Promise.all([
              item.startLocation && item.startLocation !== "--" && item.startLocation.length > 5
                ? item.startLocation
                : startLat && startLng
                  ? reverseGeocodeMapTiler(Number(startLat), Number(startLng)).catch(() => `${startLat}, ${startLng}`)
                  : item.startLocation || "--",
              item.endLocation && item.endLocation !== "--" && item.endLocation.length > 5
                ? item.endLocation
                : endLat && endLng
                  ? reverseGeocodeMapTiler(Number(endLat), Number(endLng)).catch(() => `${endLat}, ${endLng}`)
                  : item.endLocation || "--",
            ]);

            return {
              ...item,
              startLocation,
              endLocation,
            };
          })
        );
      }

      // If idle report or stop report, ensure all addresses are resolved before exporting
      if (isIdleReport || isStopReport) {
        dataToExport = await Promise.all(
          dataToExport.map(async (item) => {
            const lat = item.latitude ?? item.lat;
            const lng = item.longitude ?? item.lng;
            const loc =
              item.location && item.location !== "--" && item.location.length > 5
                ? item.location
                : lat && lng
                  ? await reverseGeocodeMapTiler(Number(lat), Number(lng)).catch(() => `${lat}, ${lng}`)
                  : item.location || item.address || "--";

            return {
              ...item,
              location: loc,
            };
          })
        );
      }

      // If trip report, ensure all addresses are resolved before exporting
      if (isTripReport) {
        const isCoord = (addr?: string) => !addr || addr === "-" || addr === "--" || /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(addr.trim());
        dataToExport = await Promise.all(
          dataToExport.map(async (item) => {
            const startLat = item.startLatitude ?? item.startLat;
            const startLng = item.startLongitude ?? item.startLong ?? item.startLng;
            const endLat = item.endLatitude ?? item.endLat;
            const endLng = item.endLongitude ?? item.endLong ?? item.endLng;

            const [startAddress, endAddress] = await Promise.all([
              item.startAddress && !isCoord(item.startAddress) && item.startAddress.length > 5
                ? item.startAddress
                : startLat && startLng
                  ? reverseGeocodeMapTiler(Number(startLat), Number(startLng)).catch(() => `${startLat}, ${startLng}`)
                  : item.startAddress || "-",
              item.endAddress && !isCoord(item.endAddress) && item.endAddress.length > 5
                ? item.endAddress
                : endLat && endLng
                  ? reverseGeocodeMapTiler(Number(endLat), Number(endLng)).catch(() => `${endLat}, ${endLng}`)
                  : item.endAddress || "-",
            ]);

            return {
              ...item,
              startAddress,
              endAddress,
            };
          })
        );
      }

      // If travel summary report, ensure all addresses are resolved before exporting
      if (isTravelSummary) {
        dataToExport = await Promise.all(
          dataToExport.map(async (item) => {
            const startLat = item.startLat ?? item.startLatitude;
            const startLng = item.startLong ?? item.startLongitude;
            const endLat = item.endLat ?? item.endLatitude;
            const endLng = item.endLong ?? item.endLongitude;

            const [startAddress, endAddress] = await Promise.all([
              item.startAddress && item.startAddress !== "-" && item.startAddress !== "--" && item.startAddress.length > 5
                ? item.startAddress
                : startLat && startLng
                  ? reverseGeocodeMapTiler(Number(startLat), Number(startLng)).catch(() => `${startLat}, ${startLng}`)
                  : item.startAddress || "-",
              item.endAddress && item.endAddress !== "-" && item.endAddress !== "--" && item.endAddress.length > 5
                ? item.endAddress
                : endLat && endLng
                  ? reverseGeocodeMapTiler(Number(endLat), Number(endLng)).catch(() => `${endLat}, ${endLng}`)
                  : item.endAddress || "-",
            ]);

            let enrichedDayWiseTrips = item.dayWiseTrips;
            if (Array.isArray(item.dayWiseTrips) && item.dayWiseTrips.length > 0) {
              enrichedDayWiseTrips = await Promise.all(
                item.dayWiseTrips.map(async (trip: any) => {
                  let tripStart = trip.startAddress || "-";
                  let tripEnd = trip.endAddress || "-";
                  if ((!trip.startAddress || trip.startAddress === "-" || trip.startAddress === "--") && trip.startLatitude && trip.startLongitude) {
                    tripStart = await reverseGeocodeMapTiler(Number(trip.startLatitude), Number(trip.startLongitude)).catch(() => `${trip.startLatitude}, ${trip.startLongitude}`) || "-";
                  }
                  if ((!trip.endAddress || trip.endAddress === "-" || trip.endAddress === "--") && trip.endLatitude && trip.endLongitude) {
                    tripEnd = await reverseGeocodeMapTiler(Number(trip.endLatitude), Number(trip.endLongitude)).catch(() => `${trip.endLatitude}, ${trip.endLongitude}`) || "-";
                  }
                  return {
                    ...trip,
                    startAddress: tripStart,
                    endAddress: tripEnd,
                  };
                })
              );
            }

            return {
              ...item,
              startAddress,
              endAddress,
              dayWiseTrips: enrichedDayWiseTrips,
            };
          })
        );
      }

      // Format all unpaginated data rows cleanly
      const formattedData = dataToExport.map((item) => {
        const row: Record<string, any> = {};
        columns.forEach((col) => {
          const raw = item[col.key];
          if (raw === null || raw === undefined) {
            row[col.key] = "--";
          } else if (typeof raw === "object") {
            row[col.key] = JSON.stringify(raw);
          } else {
            row[col.key] = String(raw);
          }
        });
        if (item.dayWiseTrips) {
          row.dayWiseTrips = item.dayWiseTrips;
        }
        return row;
      });

      // Nested table columns for day-wise trips matching travel-summary/page.tsx
      const nestedExportColumns = [
        { key: "date", header: "Date", formatter: (value: unknown) => value ? new Date(value as string).toLocaleDateString() : "--" },
        { key: "startTime", header: "Ignition Start", formatter: (value: unknown) => value ? new Date(value as string).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : "--" },
        { key: "startAddress", header: "Start Location" },
        { key: "distance", header: "Distance" },
        { key: "runningTime", header: "Running" },
        { key: "idleTime", header: "Idle" },
        { key: "stopTime", header: "Stopped" },
        { key: "workingHours", header: "Working Hours" },
        { key: "maxSpeed", header: "Max Speed", formatter: (value: unknown) => value != null ? Number(value).toFixed(2) : "0.00" },
        { key: "avgSpeed", header: "Avg Speed", formatter: (value: unknown) => value != null ? Number(value).toFixed(2) : "0.00" },
        { key: "endAddress", header: "End Location" },
        { key: "endTime", header: "Ignition Stop", formatter: (value: unknown) => value ? new Date(value as string).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) : "--" },
      ];

      const nestedTableConfig =
        isTravelSummary && dataToExport.some((i) => Array.isArray(i.dayWiseTrips) && i.dayWiseTrips.length > 0)
          ? {
            dataKey: "dayWiseTrips",
            columns: nestedExportColumns,
            title: "Day-Wise Details",
          }
          : undefined;

      const title = isStatusReport
        ? "Vehicle Status Report"
        : isTripReport
          ? "Vehicle Trip Report"
          : isStopReport
            ? "Vehicle Stop Report"
            : isIdleReport
              ? "Vehicle Idle Report"
              : isTravelSummary
                ? "Travel Summary Report"
                : result.title || "Fleet Data Report";
      const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const dateStr = new Date().toISOString().split("T")[0];

      const metadata: Record<string, string> = {};
      if (result.badges && result.badges.length > 0) {
        result.badges.forEach((b) => {
          if (!b.label.toLowerCase().includes("status")) {
            metadata[b.label] = String(b.value);
          }
        });
      }
      metadata["Total Records Exported"] = String(formattedData.length);

      if (!isStatusReport) {
        columns = columns.filter(
          (col) => col.key.toLowerCase() !== "status" && col.header?.toLowerCase() !== "status"
        );
      }

      if (format === "excel") {
        await exportToExcel(formattedData, columns, {
          title,
          filename: `${cleanTitle}_All_${formattedData.length}_${dateStr}.xlsx`,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          nestedTable: nestedTableConfig,
        });
      } else {
        await exportToPDF(formattedData, columns, {
          title,
          filename: `${cleanTitle}_All_${formattedData.length}_${dateStr}.pdf`,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          nestedTable: nestedTableConfig,
        });
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setExportingId(null);
    }
  };

  return (
    <>
      {/* Floating Chatbot Window */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded
            ? "bottom-4 right-4 w-[92vw] md:w-[750px] h-[88vh]"
            : "bottom-6 right-6 w-[94vw] sm:w-[460px] h-[640px] max-h-[85vh]"
            }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-amber-950 text-white px-4 py-3 flex items-center justify-between shadow-md border-b border-amber-500/25">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-transparent shrink-0">
                <FrameSequencePlayer
                  frameCount={60}
                  framePrefix="/background-remover/"
                  fps={35}
                  mode="pingpong"
                  paddingRatio={0.98}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm leading-tight tracking-tight text-white">
                    parentseye<span className="text-amber-400">.ai</span>
                  </h3>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 font-normal">Fleet & Safety Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full hidden sm:flex"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-1.5 mb-1 text-[11px] text-zinc-400 px-1">
                  {msg.sender === "bot" ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                        parentseye<span className="text-amber-500 font-bold">.ai</span>
                      </span>
                    </>
                  ) : (
                    <span className="font-medium">You</span>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] rounded-2xl p-3.5 text-sm shadow-xs ${msg.sender === "user"
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-medium rounded-tr-xs shadow-xs"
                    : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-tl-xs"
                    }`}
                >
                  {/* Loading Spinner */}
                  {msg.isLoading && (
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 py-1">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span className="text-xs italic">{msg.text}</span>
                    </div>
                  )}

                  {/* Regular Text */}
                  {!msg.isLoading && msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                  {/* Cards Grid inside Welcome Message */}
                  {msg.id === "welcome" && (
                    <div className="mt-3.5 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                      <div className="flex items-center justify-between mb-2.5 px-0.5">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
                          Choose a query to begin:
                        </span>
                        <Badge variant="outline" className="text-[10px] text-zinc-500 font-medium">
                          {HARDCODED_QUESTIONS.length} Queries
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                        {HARDCODED_QUESTIONS.map((q) => {
                          const Icon = getQuestionIcon(q.function);
                          return (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => handleSelectQuestion(q)}
                              className="group text-left p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-amber-400 dark:hover:border-amber-500 shadow-xs hover:shadow-sm transition-all flex items-start gap-2.5 cursor-pointer"
                            >
                              <div className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 group-hover:bg-gradient-to-br group-hover:from-amber-400 group-hover:to-yellow-500 group-hover:text-zinc-950 transition-colors shrink-0 shadow-xs border border-zinc-200/50 dark:border-zinc-700/50">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 leading-snug line-clamp-2">
                                    {q.question.trim()}
                                  </span>
                                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium capitalize truncate">
                                    {q.intent?.replace(/_/g, " ") || "Report"}
                                  </span>
                                  {q.fields && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium shrink-0">
                                      Input
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Interactive Inline Input Form for Questions with Fields */}
                  {msg.pendingFields && (
                    <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <h4 className="text-xs font-semibold mb-2 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Parameters Required
                      </h4>
                      <div className="space-y-2">
                        {/* If question includes date range fields (from_date & to_date), render the existing DateRangeFilter */}
                        {msg.pendingFields.question.fields?.some((f) => f.name === "from_date") &&
                          msg.pendingFields.question.fields?.some((f) => f.name === "to_date") && (
                            <div>
                              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                Select Date Range
                              </label>
                              <DateRangeFilter
                                title="Select Date Range"
                                defaultStartDate={
                                  pendingFormValues.from_date
                                    ? new Date(pendingFormValues.from_date)
                                    : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
                                }
                                defaultEndDate={
                                  pendingFormValues.to_date
                                    ? new Date(pendingFormValues.to_date)
                                    : new Date()
                                }
                                onDateRangeChange={(start, end) => {
                                  setPendingFormValues((prev) => ({
                                    ...prev,
                                    from_date: start ? formatDateToYYYYMMDD(start) || "" : "",
                                    to_date: end ? formatDateToYYYYMMDD(end) || "" : "",
                                  }));
                                }}
                              />
                            </div>
                          )}

                        {/* Render all other non-date fields */}
                        {msg.pendingFields.question.fields
                          ?.filter((f) => f.name !== "from_date" && f.name !== "to_date")
                          .map((f) => (
                            <div key={f.name}>
                              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                {f.label || f.name}
                              </label>
                              <Input
                                type={f.type || "text"}
                                placeholder={f.placeholder || `Enter ${f.name}`}
                                value={pendingFormValues[f.name] || ""}
                                onChange={(e) =>
                                  setPendingFormValues((prev) => ({
                                    ...prev,
                                    [f.name]: e.target.value,
                                  }))
                                }
                                className="h-8 text-xs bg-white dark:bg-zinc-800 focus-visible:ring-amber-500"
                              />
                            </div>
                          ))}
                        <Button
                          size="sm"
                          onClick={() => handleFieldSubmit(msg.pendingFields!.question)}
                          className="w-full mt-2 h-8 text-xs bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-zinc-950 font-semibold shadow-xs cursor-pointer"
                        >
                          Submit & Fetch Report
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Structured Result Display */}
                  {msg.result && (
                    <div className="mt-3 space-y-2.5">
                      {/* Result Header, Badges & Export Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-700 pb-2">
                        <div className="flex flex-col gap-1 min-w-0 max-w-[65%]">
                          <span className="font-semibold text-xs text-amber-600 dark:text-amber-400 truncate">
                            {msg.result.title}
                          </span>
                          {msg.result.badges && (
                            <div className="flex flex-wrap gap-1">
                              {msg.result.badges
                                .filter((b) => !b.label.toLowerCase().includes("status"))
                                .map((b, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {b.label}: <strong className="ml-1">{b.value}</strong>
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </div>

                        {/* Export in PDF or Excel */}
                        {msg.result.data && msg.result.data.length > 0 && (
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <button
                              type="button"
                              disabled={exportingId !== null}
                              onClick={() => handleExportResult(msg.id, msg.result!, "excel")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-md transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Export all ${msg.result.allData?.length || msg.result.data.length} records to Excel (.xlsx)`}
                            >
                              {exportingId === `${msg.id}-excel` ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                              ) : (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                              <span>Excel</span>
                              {msg.result.allData && msg.result.allData.length > (msg.result.data?.length ?? 0) && (
                                <span className="text-[9px] px-1 py-0.2 bg-emerald-200/60 dark:bg-emerald-800/60 rounded font-bold">
                                  All ({msg.result.allData.length})
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={exportingId !== null}
                              onClick={() => handleExportResult(msg.id, msg.result!, "pdf")}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 rounded-md transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Export all ${msg.result.allData?.length || msg.result.data.length} records to PDF (.pdf)`}
                            >
                              {exportingId === `${msg.id}-pdf` ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-600" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              )}
                              <span>PDF</span>
                              {msg.result.allData && msg.result.allData.length > (msg.result.data?.length ?? 0) && (
                                <span className="text-[9px] px-1 py-0.2 bg-red-200/60 dark:bg-red-800/60 rounded font-bold">
                                  All ({msg.result.allData.length})
                                </span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Cards View */}
                      {msg.result.type === "cards" && msg.result.data && (
                        <div className="space-y-2">
                          {msg.result.data.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700 text-xs space-y-1"
                            >
                              {Object.entries(item).map(([key, val]) => (
                                <div
                                  key={key}
                                  className="flex items-center justify-between py-0.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                >
                                  <span className="text-zinc-500 dark:text-zinc-400">{key}:</span>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right">
                                    {String(val ?? "--")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Table View */}
                      {msg.result.type === "table" && msg.result.data && (
                        <div className="space-y-1">
                          <div className="overflow-x-auto max-h-60 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 uppercase text-[10px] sticky top-0">
                                <tr>
                                  {msg.result.columns?.map((c) => (
                                    <th key={c.key} className="px-2.5 py-1.5">
                                      {c.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {msg.result.data.map((row, rIdx) => (
                                  <tr
                                    key={rIdx}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                  >
                                    {msg.result?.columns?.map((c) => (
                                      <td
                                        key={c.key}
                                        className="px-2.5 py-1.5 text-zinc-800 dark:text-zinc-200 whitespace-nowrap"
                                      >
                                        {String(row[c.key] ?? "--")}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {msg.result.allData && msg.result.allData.length > (msg.result.data?.length ?? 0) && (
                            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 px-1 pt-0.5">
                              <span>Showing preview of {msg.result.data?.length} of {msg.result.allData.length} records</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Export includes all {msg.result.allData.length} records</span>
                            </div>
                          )}
                        </div>
                      )}


                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Autocomplete suggestions popup above input */}
          {showSuggestions && inputMatches.length > 0 && (
            <div className="bg-white dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 p-2 shadow-lg max-h-48 overflow-y-auto">
              <span className="text-[10px] font-semibold text-zinc-400 px-2 uppercase tracking-wider block mb-1">
                Suggested Matches:
              </span>
              {inputMatches.map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    handleSelectQuestion(q);
                    setInputVal("");
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-600 rounded-md transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{q.question}</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-amber-300/40 text-amber-700 dark:text-amber-300">
                    {q.intent || "query"}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Toggle Query Cards tray for ongoing chat */}
          {messages.length > 1 && (
            <div className="border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
              <div className="px-3 py-1.5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCards(!showCards)}
                  className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{showCards ? "Hide Query Cards" : `Show All Query Cards (${HARDCODED_QUESTIONS.length})`}</span>
                  {showCards ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showCards && (
                <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HARDCODED_QUESTIONS.map((q) => {
                      const Icon = getQuestionIcon(q.function);
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => {
                            handleSelectQuestion(q);
                            setShowCards(false);
                          }}
                          className="group text-left p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 flex items-start gap-2 cursor-pointer transition-colors"
                        >
                          <Icon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold line-clamp-2 group-hover:text-amber-600">
                              {q.question.trim()}
                            </span>
                            {q.fields && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium inline-block mt-0.5">
                                Input
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={handleInputSubmit}
            className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Ask parentseye.ai about vehicles, reports, trips..."
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pr-8 text-xs h-10 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-amber-500 focus-visible:border-amber-500"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => {
                    setInputVal("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-2.5 top-3 text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={!inputVal.trim()}
              className="h-10 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-zinc-950 font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default AiChatBot;
