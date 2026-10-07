import React, { useEffect, useState, useMemo } from "react";
import { geofenceService } from "@/services/api/geofenceSerevice";
import { Users, Loader2, Search, AlertCircle, RefreshCw } from "lucide-react";

export interface StopChildrenListProps {
  geofenceId?: string | number | null;
  geofenceName?: string;
  maxHeight?: string | number;
  compact?: boolean;
}

interface StudentItem {
  _id: string;
  childName: string;
  className?: string | null;
}

export const StopChildrenList: React.FC<StopChildrenListProps> = ({
  geofenceId,
  geofenceName,
  maxHeight = "200px",
  compact = false,
}) => {
  const [children, setChildren] = useState<StudentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchChildren = () => {
    if (!geofenceId) return;
    setLoading(true);
    setError(null);

    geofenceService
      .getStopChildren(geofenceId)
      .then((res: any) => {
        if (!res) {
          setChildren([]);
          return;
        }

        const pickups: StudentItem[] = Array.isArray(res.pickupChildren)
          ? res.pickupChildren
          : [];
        const drops: StudentItem[] = Array.isArray(res.dropChildren)
          ? res.dropChildren
          : [];

        // Combine and deduplicate
        const map = new Map<string, StudentItem>();
        pickups.forEach((c) => map.set(c._id || c.childName, c));
        drops.forEach((c) => map.set(c._id || c.childName, c));

        if (map.size === 0 && Array.isArray(res)) {
          res.forEach((c: any) => map.set(c._id || c.childName, c));
        }

        setChildren(Array.from(map.values()));
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) {
          setChildren([]);
        } else {
          console.warn("Failed to fetch stop children:", err?.message || err);
          setError("Unable to load students for this stop");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (geofenceId) {
      fetchChildren();
    } else {
      setChildren([]);
      setLoading(false);
      setError(null);
    }
  }, [geofenceId]);

  const filteredChildren = useMemo(() => {
    if (!search.trim()) return children;
    const term = search.trim().toLowerCase();
    return children.filter((child) => {
      const name = (child.childName || "").toLowerCase();
      const cls = (child.className || "").toLowerCase();
      return name.includes(term) || cls.includes(term);
    });
  }, [children, search]);

  if (!geofenceId) {
    return null;
  }

  const totalCount = children.length;

  return (
    <div
      style={{
        marginTop: "8px",
        paddingTop: "8px",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {/* Header with Title and Student Count */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <Users size={13} style={{ color: "#2563eb" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#1f2937",
              letterSpacing: "0.2px",
            }}
          >
            Students
          </span>
          {!loading && !error && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "10px",
                backgroundColor: totalCount > 0 ? "#eff6ff" : "#f3f4f6",
                color: totalCount > 0 ? "#2563eb" : "#6b7280",
              }}
            >
              {totalCount}
            </span>
          )}
        </div>

        {error && (
          <button
            onClick={fetchChildren}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "2px",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              gap: "3px",
              fontSize: "10px",
            }}
            title="Retry"
          >
            <RefreshCw size={11} /> Retry
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px 0",
            color: "#6b7280",
            fontSize: "11px",
          }}
        >
          <Loader2 size={13} className="animate-spin text-blue-600" />
          <span>Loading students...</span>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 8px",
            borderRadius: "6px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fee2e2",
            color: "#b91c1c",
            fontSize: "10px",
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input (if > 4 students) */}
      {!loading && !error && children.length > 4 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "3px 6px",
            backgroundColor: "#f9fafb",
            borderRadius: "5px",
            border: "1px solid #e5e7eb",
          }}
        >
          <Search size={11} style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search student or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: "10px",
              width: "100%",
              color: "#1f2937",
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && totalCount === 0 && (
        <div
          style={{
            padding: "6px 4px",
            fontSize: "10px",
            color: "#9ca3af",
            fontStyle: "italic",
            textAlign: "center",
          }}
        >
          No students registered at this stop
        </div>
      )}

      {/* Students List: ONLY childName and className */}
      {!loading && !error && totalCount > 0 && (
        <div
          style={{
            maxHeight,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            paddingRight: "2px",
          }}
        >
          {filteredChildren.length === 0 ? (
            <div
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                padding: "6px 0",
                textAlign: "center",
              }}
            >
              No students match "{search}"
            </div>
          ) : (
            filteredChildren.map((child, idx) => {
              const childName = child.childName || `Student #${idx + 1}`;
              const className = child.className || null;

              return (
                <div
                  key={child._id || `child-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    padding: compact ? "4px 8px" : "6px 10px",
                    borderRadius: "6px",
                    backgroundColor: "rgba(249, 250, 251, 0.95)",
                    border: "1px solid rgba(229, 231, 235, 0.8)",
                    fontSize: "11px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* childName */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {childName.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {childName}
                    </span>
                  </div>

                  {/* className */}
                  {className && (
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        backgroundColor: "#f3f4f6",
                        color: "#4b5563",
                        flexShrink: 0,
                      }}
                    >
                      Class: {className}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default StopChildrenList;
