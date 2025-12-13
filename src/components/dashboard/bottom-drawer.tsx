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

interface BottomDrawerProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  selectedDevice: any;
  addresses: any;
  loadingAddresses: any;
  handleOpenLiveTrack: (imei: string, name: string) => void;

  onOpenRouteTimeline: (uniqueId: string, deviceName: string) => void;
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
  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} modal={false}>
      <DrawerPortal>
        <DrawerOverlay className="pointer-events-none bg-transparent" />
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex justify-between items-center">
              <div className="flex flex-col items-start">
                {selectedDevice && selectedDevice.name}

                {selectedDevice?.uniqueId && (
                  <span className="text-xs text-gray-500 mt-1">
                    IMEI: {selectedDevice?.uniqueId}
                  </span>
                )}

                {/* Address display below the device name */}
                <div className="mt-1 text-left text-sm text-gray-600 ">
                  {selectedDevice &&
                    (() => {
                      const deviceId = selectedDevice.deviceId;
                      const address = addresses[deviceId];
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

              <div className="min-w-max flex gap-1 items-center">
                <button
                  className="rounded-sm text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                  onClick={() => {
                    if (selectedDevice?.uniqueId) {
                      handleOpenLiveTrack(
                        selectedDevice?.uniqueId,
                        selectedDevice?.name
                      );
                    }
                  }}
                >
                  Track
                </button>
                <button
                  className="rounded-sm mr-1 text-black border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors duration-200 cursor-pointer"
                  onClick={() =>
                    selectedDevice?.deviceId !== undefined &&
                    onOpenRouteTimeline(
                      selectedDevice.uniqueId,
                      selectedDevice.name
                    )
                  }
                >
                  History
                </button>
                <DrawerClose
                  className="rounded-sm text-white border border-black px-2 py-1 bg-black cursor-pointer"
                  aria-label="Close"
                >
                  X
                </DrawerClose>
              </div>
            </DrawerTitle>
          </DrawerHeader>
          <div className="h-px bg-primary"></div>
          <div className="p-4 space-y-4">
            {selectedDevice ? (
              <>
                <div className="grid grid-cols-5 gap-4">
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
                      {selectedDevice?.speed.toFixed(2) + " km/h" || "N/A"}
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
                      {(
                        selectedDevice?.attributes?.totalDistance / 1000
                      ).toFixed(2) + " km/h" || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <img
                        src="/dashboard-icons/todays-distance.svg"
                        className="w-6"
                        alt=""
                      />{" "}
                      <span className="text-stone-600">Today's Distance</span>
                    </label>
                    <p className="ml-8">
                      {(
                        selectedDevice?.attributes?.todayDistance / 1000
                      ).toFixed(2) + " km/h" || "N/A"}
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
                        {`${selectedDevice?.latitude}, ${selectedDevice?.longitude}` ||
                          "N/A"}
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
                      {`${new Date(
                        selectedDevice.lastUpdate
                      ).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}` || "N/A"}
                    </p>
                  </div>
                </div>
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
