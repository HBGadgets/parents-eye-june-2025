import { latLng } from "leaflet";
import type { Point } from "./marker-player.types";

export function downsamplePoints(
  points: Point[],
  minDistanceMeters = 5
): Point[] {
  if (points.length < 2) return points;

  const result: Point[] = [points[0]];
  let last = latLng(points[0].latlng);

  for (let i = 1; i < points.length; i++) {
    const current = latLng(points[i].latlng);
    if (current.distanceTo(last) >= minDistanceMeters) {
      result.push(points[i]);
      last = current;
    }
  }

  // Always keep last point
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }

  return result;
}
