// MarkerPlayer.ts
import L, { Marker, latLng, Util } from "leaflet";
import type { Map, MarkerOptions, LatLng } from "leaflet";
import { PlayerState, Point, Duration } from "@/types/marker-player.types";

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
  private currentLine: Point[] = [];

  private startTimestamp = 0;
  private pauseStartTime = 0;

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

    [this.durations, this.accDurations, this.totalDuration] =
      this.createDurations(this.points, duration);
  }

  /* ---------------- PUBLIC API ---------------- */

  start() {
    if (this.state === PlayerState.RUNNING) return;

    if (this.state === PlayerState.PAUSED) {
      this.resume();
      return;
    }

    this.currentIndex = 0;
    this.startTimestamp = 0;

    this.state = PlayerState.RUNNING;
    this.animRequested = true;
    this.animId = Util.requestAnimFrame(this.animate, this);
  }

  pause() {
    if (this.state !== PlayerState.RUNNING) return;
    this.state = PlayerState.PAUSED;
    this.pauseStartTime = performance.now();
    Util.cancelAnimFrame(this.animId);
    this.animRequested = false;
  }

  resume() {
    if (this.state !== PlayerState.PAUSED) return;

    const pausedFor = performance.now() - this.pauseStartTime;
    this.startTimestamp += pausedFor;

    this.state = PlayerState.RUNNING;
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
    this.onComplete?.();
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

    const prevAcc = index > 0 ? this.accDurations[index - 1] : 0;
    const elapsed = targetTime - prevAcc;

    this.loadLine(index);
    this.startTimestamp = performance.now() - elapsed;

    const pos = this.interpolatePosition(
      latLng(this.currentLine[0].latlng),
      latLng(this.currentLine[1].latlng),
      this.currentDuration,
      elapsed
    );

    this.marker.setLatLng(pos);
    this.onUpdate?.(pos, this.currentIndex);
  }

  setDuration(newDurations: number[]) {
    if (!newDurations || newDurations.length === 0) return;

    const wasRunning = this.state === PlayerState.RUNNING;
    const progress = this.getProgress();

    if (wasRunning) this.pause();

    this.durations = newDurations;
    this.accDurations = [];
    let sum = 0;
    newDurations.forEach((d) => this.accDurations.push((sum += d)));
    this.totalDuration = sum;

    this.startTimestamp = 0;
    this.setProgress(progress);

    if (wasRunning) this.resume();
  }

  getProgress(): number {
    const acc =
      this.currentIndex > 0 ? this.accDurations[this.currentIndex - 1] : 0;
    const elapsed = this.startTimestamp
      ? performance.now() - this.startTimestamp
      : 0;

    const total = acc + Math.min(elapsed, this.currentDuration);
    return Math.min(100, (total / this.totalDuration) * 100);
  }

  remove() {
    Util.cancelAnimFrame(this.animId);
    this.marker.remove();
  }

  /* ---------------- ANIMATION CORE ---------------- */

  private animate = (timestamp: number) => {
    if (!this.animRequested || this.state !== PlayerState.RUNNING) return;

    if (!this.startTimestamp) {
      this.startTimestamp = timestamp;
      this.loadLine(this.currentIndex);
    }

    const elapsed = this.updateLine(timestamp);

    if (elapsed !== null && this.currentLine.length === 2) {
      const pos = this.interpolatePosition(
        latLng(this.currentLine[0].latlng),
        latLng(this.currentLine[1].latlng),
        this.currentDuration,
        elapsed
      );

      this.marker.setLatLng(pos);
      this.onUpdate?.(pos, this.currentIndex);
    }

    this.animRequested = true;
    this.animId = Util.requestAnimFrame(this.animate, this);
  };

  private loadLine(index: number) {
    this.currentIndex = index;
    this.currentDuration = this.durations[index];
    this.currentLine = this.points.slice(index, index + 2);
  }

  private updateLine(timestamp: number): number | null {
    let elapsed = timestamp - this.startTimestamp;

    if (elapsed <= this.currentDuration) return elapsed;

    let idx = this.currentIndex;
    let dur = this.currentDuration;

    while (elapsed > dur) {
      elapsed -= dur;
      idx++;

      if (idx >= this.points.length - 1) {
        this.marker.setLatLng(this.points[this.points.length - 1].latlng);
        this.stop();
        return null;
      }

      this.marker.setLatLng(this.points[idx].latlng);
      this.loadLine(idx);
      dur = this.currentDuration;
    }

    this.startTimestamp = timestamp - elapsed;
    return elapsed;
  }

  private interpolatePosition(
    p1: LatLng,
    p2: LatLng,
    duration: number,
    t: number
  ): LatLng {
    let r = t / duration;
    r = Math.max(0, Math.min(1, r));

    return latLng(
      p1.lat + r * (p2.lat - p1.lat),
      p1.lng + r * (p2.lng - p1.lng)
    );
  }

  /* ---------------- DURATION UTILS ---------------- */

  private createDurations(points: Point[], duration: Duration) {
    if (Array.isArray(duration)) {
      const acc: number[] = [];
      let sum = 0;
      duration.forEach((d) => acc.push((sum += d)));
      return [duration, acc, sum];
    }

    let totalDistance = 0;
    const distances: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const d = latLng(points[i].latlng).distanceTo(points[i + 1].latlng);
      distances.push(d);
      totalDistance += d;
    }

    const ratio = duration / totalDistance;
    const durs = distances.map((d) => Math.max(d * ratio, 0.1));

    const acc: number[] = [];
    let sum = 0;
    durs.forEach((d) => acc.push((sum += d)));

    return [durs, acc, duration];
  }
}
