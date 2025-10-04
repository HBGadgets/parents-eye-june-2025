import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Navigation, Fuel, X } from "lucide-react";
import { DeviceHistoryItem } from "@/data/sampleData";

interface Trip {
  id: number;
  startTime: string;
  endTime: string;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  distance: number;
  duration: number;
  maxSpeed: number;
  avgSpeed: number;
}

interface Stoppage {
  id: number;
  startTime: string;
  endTime: string;
  location: { lat: number; lng: number };
  duration: number;
  reason: string;
}

interface TripsSidebarProps {
  data: DeviceHistoryItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

const TripsSidebar: React.FC<TripsSidebarProps> = ({
  data,
  // currentIndex,
  isOpen,
  onClose,
}) => {
  // Process data to identify trips and stoppages
  const processData = () => {
    const trips: Trip[] = [];
    const stoppages: Stoppage[] = [];

    let currentTrip: Partial<Trip> | null = null;
    let currentStoppage: Partial<Stoppage> | null = null;

    data.forEach((item, index) => {
      if (item.attributes.ignition && item.speed > 5) {
        // Vehicle is moving - part of a trip
        if (currentStoppage) {
          // End current stoppage
          stoppages.push({
            ...currentStoppage,
            id: stoppages.length + 1,
            endTime: data[index - 1]?.createdAt || item.createdAt,
            duration: currentStoppage.duration || 0,
            reason: "Engine Off",
          } as Stoppage);
          currentStoppage = null;
        }

        if (!currentTrip) {
          // Start new trip
          currentTrip = {
            startTime: item.createdAt,
            startLocation: { lat: item.latitude, lng: item.longitude },
            distance: 0,
            maxSpeed: item.speed,
            avgSpeed: item.speed,
          };
        } else {
          // Update trip stats
          currentTrip.maxSpeed = Math.max(
            currentTrip.maxSpeed || 0,
            item.speed
          );
          currentTrip.distance = item.attributes.distance;
        }
      } else if (!item.attributes.ignition || item.speed <= 5) {
        // Vehicle is stopped
        if (currentTrip) {
          // End current trip
          trips.push({
            ...currentTrip,
            id: trips.length + 1,
            endTime: item.createdAt,
            endLocation: { lat: item.latitude, lng: item.longitude },
            duration:
              new Date(item.createdAt).getTime() -
              new Date(currentTrip.startTime!).getTime(),
            avgSpeed: (currentTrip.maxSpeed || 0) * 0.7, // Rough calculation
          } as Trip);
          currentTrip = null;
        }

        if (!currentStoppage) {
          // Start new stoppage
          currentStoppage = {
            startTime: item.createdAt,
            location: { lat: item.latitude, lng: item.longitude },
            duration: 0,
          };
        }
      }
    });

    return { trips, stoppages };
  };

  const { trips, stoppages } = processData();

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 animate-fade-in" onClick={onClose} />
      )}

      {/* Sidebar */}
      <div
        className={`
    fixed top-12 right-0 h-[calc(100vh-7rem)] w-80 bg-background border-l border-border shadow-[var(--shadow-intense)] z-[9999]
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? "translate-x-0" : "translate-x-full"}
  `}
      >
        <Card className="h-full bg-[var(--gradient-panel)] border-0 rounded-none shadow-none pr-6">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Journey Analysis
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Tabs defaultValue="trips" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                <TabsTrigger value="trips">Trips</TabsTrigger>
                <TabsTrigger value="stoppages">Stoppages</TabsTrigger>
              </TabsList>

              <TabsContent value="trips" className="px-4 pb-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {trips.length > 0 ? (
                    trips.map((trip) => (
                      <Card
                        key={trip.id}
                        className="p-3 bg-card/50 border-border/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            Trip {trip.id}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs text-primary"
                          >
                            {formatDuration(trip.duration)}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTime(trip.startTime)} -{" "}
                              {formatTime(trip.endTime)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{trip.distance.toFixed(1)} km</span>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">
                              Max Speed: {trip.maxSpeed.toFixed(0)} km/h
                            </span>
                            <span className="text-muted-foreground">
                              Avg Speed: {trip.avgSpeed.toFixed(0)} km/h
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No trips detected</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="stoppages" className="px-4 pb-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stoppages.length > 0 ? (
                    stoppages.map((stoppage) => (
                      <Card
                        key={stoppage.id}
                        className="p-3 bg-card/50 border-border/50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="destructive" className="text-xs">
                            Stop {stoppage.id}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs text-orange-500"
                          >
                            {formatDuration(stoppage.duration)}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTime(stoppage.startTime)} -{" "}
                              {formatTime(stoppage.endTime)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Fuel className="w-3 h-3" />
                            <span>{stoppage.reason}</span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Location: {stoppage.location.lat.toFixed(4)},{" "}
                            {stoppage.location.lng.toFixed(4)}
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No stoppages detected</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default TripsSidebar;
