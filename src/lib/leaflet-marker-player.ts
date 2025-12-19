// MarkerPlayer.ts
import L, { Marker, latLng, Util } from "leaflet";
import type { Map, MarkerOptions, LatLng } from "leaflet";
import { PlayerState, Point, Duration } from "@/types/marker-player.types";
import { downsamplePoints } from "@/util/downsample";

export class MarkerPlayer {
  private marker: Marker;
  private map?: Map;

  private points: Point[];
  private durations: number[];
  private accDurations: number[];
  private totalDuration: number;

  private state = PlayerState.NOT_STARTED;

  private currentIndex = 0;
  private currentDuration = 0;
  private startTime = 0;
  private startTimestamp = 0;
  private pauseTimestamp = 0;
  private animId = 0;
  private animRequested = false;

  private onUpdate?: (latlng: L.LatLng, index: number) => void;
  private onComplete?: () => void;
  setOnUpdate(cb: (latlng: L.LatLng, index: number) => void) {
    this.onUpdate = cb;
  }
  setOnComplete(cb: () => void) {
    this.onComplete = cb;
  }

  constructor(
    map: Map,
    rawPoints: Point[],
    duration: Duration,
    options?: MarkerOptions
  ) {
    this.map = map;

    this.points = rawPoints;

    this.marker = L.marker(this.points[0].latlng, options).addTo(map);

    // ✅ Create durations based on DOWNSAMPLED points
    [this.durations, this.accDurations, this.totalDuration] =
      this.createDurations(this.points, duration);

    console.log(
      "Points:",
      this.points.length,
      "Durations:",
      this.durations.length
    );
  }

  /* ---------------- PUBLIC API ---------------- */

  start() {
    if (this.state === PlayerState.RUNNING) return;

    if (this.state === PlayerState.PAUSED) {
      this.resume();
      return;
    }

    this.state = PlayerState.RUNNING;
    this.currentIndex = 0;
    this.startTimestamp = 0;
    this.animRequested = true;

    this.animId = Util.requestAnimFrame(this.animate, this);
  }

  pause() {
    if (this.state !== PlayerState.RUNNING) return;
    this.state = PlayerState.PAUSED;
    this.pauseTimestamp = performance.now();
    Util.cancelAnimFrame(this.animId);
    this.animRequested = false;
  }

  resume() {
    if (this.state !== PlayerState.PAUSED) return;

    this.state = PlayerState.RUNNING;

    // Reset timestamp for smooth resume
    this.startTimestamp = 0;

    this.animRequested = true;
    this.animId = Util.requestAnimFrame(this.animate, this);
  }

  stop() {
    this.state = PlayerState.ENDED;
    Util.cancelAnimFrame(this.animId);
    this.animRequested = false;
    this.currentIndex = 0;
    this.startTimestamp = 0;
    this.marker.setLatLng(this.points[0].latlng);
    if (this.onComplete) {
      this.onComplete();
    }
  }

  setProgress(percent: number) {
    percent = Math.min(100, Math.max(0, percent));
    const targetTime = (this.totalDuration * percent) / 100;

    let index = 0;
    while (
      index < this.accDurations.length &&
      this.accDurations[index] < targetTime
    ) {
      index++;
    }

    this.currentIndex = Math.min(index, this.points.length - 1);
    this.startTimestamp = 0;
    this.marker.setLatLng(this.points[this.currentIndex].latlng);

    this.onUpdate?.(this.marker.getLatLng(), this.currentIndex);
  }

  setDuration(newDurations: number[]) {
    if (!newDurations || newDurations.length === 0) return;

    // ✅ Preserve running state
    const wasRunning = this.state === PlayerState.RUNNING;
    const currentProgressPercent = this.getProgress();

    // ✅ Pause if running
    if (wasRunning) {
      this.pause();
    }

    // Ensure durations match points length
    const expectedLength = this.points.length - 1;
    if (newDurations.length !== expectedLength) {
      console.warn(
        `Duration mismatch: expected ${expectedLength}, got ${newDurations.length}`
      );
      if (newDurations.length > expectedLength) {
        newDurations = newDurations.slice(0, expectedLength);
      }
    }

    this.durations = newDurations;

    // Rebuild accumulated durations
    this.accDurations = [];
    let sum = 0;
    for (let i = 0; i < newDurations.length; i++) {
      sum += newDurations[i];
      this.accDurations.push(sum);
    }

    this.totalDuration = sum;

    // Reset animation timing
    this.startTimestamp = 0;

    // ✅ Resume if it was playing
    if (wasRunning) {
      // Small delay to ensure state is updated
      setTimeout(() => {
        if (this.state === PlayerState.PAUSED) {
          this.resume();
        }
      }, 10);
    }
  }

  getProgress(): number {
    if (this.currentIndex === 0 && !this.startTimestamp) return 0;
    if (this.currentIndex >= this.points.length - 1) return 100;

    const accTime =
      this.currentIndex > 0 ? this.accDurations[this.currentIndex - 1] : 0;
    return (accTime / this.totalDuration) * 100;
  }

  remove() {
    Util.cancelAnimFrame(this.animId);
    this.marker.remove();
  }

  /* ---------------- ANIMATION ---------------- */

  private animate = (timestamp: number) => {
    if (!this.animRequested || this.state !== PlayerState.RUNNING) return;

    if (!this.startTimestamp) {
      this.startTimestamp = timestamp;
      this.startTime = Date.now();
    }

    const elapsed = timestamp - this.startTimestamp;

    // ✅ Add safety check for undefined duration
    const duration = this.durations[this.currentIndex];

    if (duration === undefined || duration === 0) {
      console.warn(`Invalid duration at index ${this.currentIndex}:`, duration);
      // Skip to next point
      this.currentIndex++;
      this.startTimestamp = timestamp;

      if (this.currentIndex >= this.points.length - 1) {
        this.stop();
        return;
      }

      this.marker.setLatLng(this.points[this.currentIndex].latlng);
      this.onUpdate?.(this.marker.getLatLng(), this.currentIndex);
      this.animId = Util.requestAnimFrame(this.animate, this);
      return;
    }

    if (elapsed >= duration) {
      this.currentIndex++;
      this.startTimestamp = timestamp;

      if (this.currentIndex >= this.points.length - 1) {
         if (this.onComplete) {
           this.onComplete();
         }
        this.stop();
        return;
      }

      this.marker.setLatLng(this.points[this.currentIndex].latlng);
      this.onUpdate?.(this.marker.getLatLng(), this.currentIndex);
    } else {
      // ✅ Add safety checks for interpolation
      const nextIndex = this.currentIndex + 1;
      if (nextIndex >= this.points.length) {
        this.stop();
        return;
      }

      const p1 = latLng(this.points[this.currentIndex].latlng);
      const p2 = latLng(this.points[nextIndex].latlng);

      const r = elapsed / duration;
      const pos = latLng(
        p1.lat + r * (p2.lat - p1.lat),
        p1.lng + r * (p2.lng - p1.lng)
      );

      this.marker.setLatLng(pos);
      this.onUpdate?.(this.marker.getLatLng(), this.currentIndex);
    }

    this.animId = Util.requestAnimFrame(this.animate, this);
  };

  /* ---------------- DURATION UTILS ---------------- */

  private createDurations(points: Point[], duration: Duration) {
    if (Array.isArray(duration)) {
      // ✅ Ensure duration array matches points length
      const expectedLength = points.length - 1;
      let adjustedDuration = duration;

      if (duration.length !== expectedLength) {
        console.warn(
          `Duration array length mismatch: expected ${expectedLength}, got ${duration.length}`
        );
        // Pad or trim to match
        if (duration.length < expectedLength) {
          const avgDuration =
            duration.reduce((a, b) => a + b, 0) / duration.length;
          adjustedDuration = [...duration];
          while (adjustedDuration.length < expectedLength) {
            adjustedDuration.push(avgDuration);
          }
        } else {
          adjustedDuration = duration.slice(0, expectedLength);
        }
      }

      const acc: number[] = [];
      let sum = 0;
      adjustedDuration.forEach((d) => acc.push((sum += d)));
      return [adjustedDuration, acc, sum];
    }

    let totalDistance = 0;
    const distances = [];

    for (let i = 0; i < points.length - 1; i++) {
      const d = latLng(points[i].latlng).distanceTo(points[i + 1].latlng);
      distances.push(d);
      totalDistance += d;
    }

    const ratio = totalDistance === 0 ? 0 : duration / totalDistance;

    const durs = distances.map((d) => Math.max(d * ratio, 0.1)); // ✅ Minimum 0.1s per segment
    const acc: number[] = [];
    let sum = 0;

    durs.forEach((d) => acc.push((sum += d)));

    return [durs, acc, duration];
  }
}
