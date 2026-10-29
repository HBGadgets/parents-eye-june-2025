"use client";

import Link from "next/link";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "../ui/drawer";
import { useRouter } from "next/navigation";
import { useDistance } from "@/hooks/useDistance";
import { uniqueId } from "lodash";

interface BottomDrawerProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  selectedDevice: any;
  addresses: any;
  loadingAddresses: any;
  handleOpenLiveTrack: (
    uniqueId: any,
    name: string,
    routeName?: string,
    routeObjId?: string,
    schoolId?: string,
    branchId?: string,
    device?: any
  ) => void;
  onOpenRouteTimeline: (
    uniqueId: any,
    deviceName: string,
    routeObjId?: string
  ) => void;
}

export const BottomDrawer = ({
  isDrawerOpen,
  setIsDrawerOpen,
  selectedDevice,
  addresses,
  loadingAddresses,
  handleOpenLiveTrack,
  onOpenRouteTimeline,
}: BottomDrawerProps) => {
  const router = useRouter();
  const isBle =
    selectedDevice?.category === "BLE" ||
    selectedDevice?.category === "GeoTag" ||
    Boolean(selectedDevice?.rawBleDevice) ||
    String(selectedDevice?.name || "").startsWith("GeoTag") ||
    String(selectedDevice?.uniqueId || "").startsWith("GeoTag");

  const rawBle = selectedDevice?.rawBleDevice;
  const targetHistoryId = isBle
    ? (selectedDevice?.sn ||
        rawBle?.sn ||
        (typeof selectedDevice?.uniqueId === "string" &&
        selectedDevice.uniqueId.startsWith("GeoTag")
          ? selectedDevice.uniqueId
          : null) ||
        (rawBle?.deviceId != null ? String(rawBle.deviceId) : null) ||
        (selectedDevice?.deviceId != null ? String(selectedDevice.deviceId) : null) ||
        selectedDevice?.uniqueId ||
        selectedDevice?.name ||
        "")
    : selectedDevice?.uniqueId || "";

  const historyUrl = targetHistoryId
    ? `/dashboard/reports/history-report?uniqueId=${encodeURIComponent(
        String(targetHistoryId)
      )}&deviceCategory=${isBle ? "BLE" : (selectedDevice?.category || "CAR")}`
    : `/dashboard/reports/history-report?deviceCategory=${isBle ? "BLE" : "CAR"}`;

  const targetLiveId = isBle
    ? (selectedDevice?.sn ||
        rawBle?.sn ||
        (typeof selectedDevice?.uniqueId === "string" &&
        selectedDevice.uniqueId.startsWith("GeoTag")
          ? selectedDevice.uniqueId
          : null) ||
        rawBle?.deviceId ||
        selectedDevice?.deviceId ||
        selectedDevice?.uniqueId ||
        selectedDevice?._id)
    : selectedDevice?.uniqueId;

  const handleTrackClick = () => {
    const finalTrackId = targetLiveId || selectedDevice?.name || "GeoTag";
    setIsDrawerOpen(false);
    handleOpenLiveTrack(
      finalTrackId,
      selectedDevice?.name || String(finalTrackId),
      selectedDevice?.routeName,
      selectedDevice?.routeId || selectedDevice?.routeObjId,
      selectedDevice?.schoolId,
      selectedDevice?.branchId,
      selectedDevice
    );
  };

  const { distance, isLoading } = useDistance(
    isBle ? undefined : selectedDevice?.uniqueId
  );
  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerPortal>
        <DrawerOverlay className="bg-transparent" />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex justify-between items-center">
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-1.5">
                  {isBle && (
                    <img
                      src="/geotag-icon/crtag.png"
                      alt="GeoTag"
                      className="w-5 h-5 object-contain inline-block shrink-0"
                    />
                  )}
                  <span>{selectedDevice && selectedDevice.name}</span>
                </div>

                {(() => {
                  const snOrImei = isBle
                    ? selectedDevice?.sn ||
                      rawBle?.sn ||
                      (typeof selectedDevice?.uniqueId === "string" &&
                      selectedDevice.uniqueId.startsWith("GeoTag")
                        ? selectedDevice.uniqueId
                        : null) ||
                      selectedDevice?.uniqueId
                    : selectedDevice?.uniqueId;
                  if (!snOrImei) return null;
                  return (
                    <span className="text-xs text-gray-500 mt-1">
                      {isBle ? "SN" : "IMEI"}: {snOrImei}
                    </span>
                  );
                })()}

                {(() => {
                  const rawBle = selectedDevice?.rawBleDevice;
                  const childObj =
                    typeof rawBle?.childId === "object"
                      ? rawBle?.childId
                      : typeof selectedDevice?.childId === "object"
                      ? selectedDevice?.childId
                      : null;
                  const childName = selectedDevice?.childName || childObj?.childName;
                  if (!childName) return null;
                  return (
                    <span className="text-xs font-semibold text-blue-600 mt-0.5">
                      Child: {childName}
                    </span>
                  );
                })()}

                {/* Address display below the device name */}
                <div className="mt-1 text-left text-sm text-gray-600 ">
                  {selectedDevice &&
                    (() => {
                      const deviceId = selectedDevice.deviceId;
                      const address = addresses[deviceId] || selectedDevice.address;
                      const isLoading = loadingAddresses[deviceId];

                      if (isLoading) {
                        return (
                          <div className="flex items-center space-x-2 text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                            <span>Loading...</span>
                          </div>
                        );
                      }

                      if (address) {
                        return <span>{address}</span>;
                      }

                      if (selectedDevice.latitude && selectedDevice.longitude) {
                        return (
                          <span>
                            {selectedDevice.latitude.toFixed(6)},{" "}
                            {selectedDevice.longitude.toFixed(6)}
                          </span>
                        );
                      }

                      return <span>Address not available</span>;
                    })()}
                </div>
              </div>

              <div
                className="min-w-max flex gap-1 items-center"
                data-vaul-no-drag
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  data-vaul-no-drag
                  className="rounded-sm text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTrackClick();
                  }}
                >
                  Track
                </button>
                <Link
                  data-vaul-no-drag
                  href={historyUrl}
                  className="rounded-sm mr-1 text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer inline-flex items-center"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDrawerOpen(false);
                  }}
                >
                  History
                </Link>
                {!isBle && (
                  <button
                    type="button"
                    data-vaul-no-drag
                    className="rounded-sm mr-1 text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedDevice?.uniqueId !== undefined) {
                        onOpenRouteTimeline(
                          selectedDevice.uniqueId,
                          selectedDevice.name,
                          selectedDevice.routeId
                        );
                      }
                    }}
                  >
                    Timeline
                  </button>
                )}
                <DrawerClose
                  data-vaul-no-drag
                  className="rounded-sm text-white border border-black px-2 py-1 bg-black cursor-pointer"
                  aria-label="Close"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  X
                </DrawerClose>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          <div className="h-px bg-primary"></div>
          <div className="p-3 sm:p-4 space-y-4">
            {selectedDevice ? (
              <>
                {isBle ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <label className="flex items-center gap-2">
                        <span className="text-stone-600 font-medium text-sm">Battery</span>
                      </label>
                      <p className="font-semibold text-green-600 text-sm mt-1">
                        {selectedDevice?.batteryLevel ??
                          selectedDevice?.rawBleDevice?.battery ??
                          100}
                        %
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <span className="text-stone-600 font-medium text-sm">Status</span>
                      </label>
                      <p className="font-semibold capitalize text-sm mt-1">
                        {selectedDevice?.status || "Active"}
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/coordinate.svg"
                          className="w-5"
                          alt=""
                        />{" "}
                        <span className="text-stone-600 text-sm">Co-ordinates</span>
                      </label>
                      {selectedDevice?.latitude && selectedDevice?.longitude ? (
                        <Link
                          href={`https://www.google.com/maps?q=${selectedDevice.latitude},${selectedDevice.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          <p className="text-blue-700 text-sm mt-1">
                            {selectedDevice.latitude.toFixed(6)},{" "}
                            {selectedDevice.longitude.toFixed(6)}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm mt-1 text-gray-500">N/A</p>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/last-update.svg"
                          className="w-5"
                          alt=""
                        />{" "}
                        <span className="text-stone-600 text-sm">Last Update</span>
                      </label>
                      <p className="text-sm mt-1">
                        {selectedDevice.lastUpdate
                          ? new Date(selectedDevice.lastUpdate).toLocaleString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              }
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/speed.svg"
                          className="w-6"
                          alt=""
                        />{" "}
                        <span className="text-stone-600">Speed</span>
                      </label>
                      <p className="ml-8">
                        {selectedDevice?.speed != null
                          ? `${selectedDevice.speed.toFixed(2)} km/h`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/odometer.svg"
                          className="w-6"
                          alt=""
                        />{" "}
                        <span className="text-stone-600">Odometer</span>
                      </label>
                      <p className="ml-8">
                        {isLoading
                          ? "Loading..."
                          : `${
                              (distance as any)?.totalDistance
                                ? (distance as any)?.totalDistance
                                : 0
                            } km`}
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/coordinate.svg"
                          className="w-6"
                          alt=""
                        />{" "}
                        <span className="text-stone-600">Co-ordinates</span>
                      </label>
                      <Link
                        href={`https://www.google.com/maps?q=${selectedDevice?.latitude},${selectedDevice?.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        <p className="ml-8 text-blue-700">
                          {selectedDevice?.latitude && selectedDevice?.longitude
                            ? `${selectedDevice.latitude}, ${selectedDevice.longitude}`
                            : "N/A"}
                        </p>
                      </Link>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <img
                          src="/dashboard-icons/last-update.svg"
                          className="w-6"
                          alt=""
                        />{" "}
                        <span className="text-stone-600">Last Update</span>
                      </label>

                      <p className="ml-8 ">
                        {selectedDevice?.lastUpdate
                          ? new Date(selectedDevice.lastUpdate).toLocaleString(
                              "en-GB",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                                timeZone: "UTC",
                              }
                            )
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p>No device selected</p>
            )}
          </div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
};
