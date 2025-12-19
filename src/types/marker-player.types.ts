import type { LatLngExpression } from "leaflet";

export interface Point {
  latlng: LatLngExpression;
  course?: number; // heading in degrees
}

export type Duration = number | number[];

export enum PlayerState {
  NOT_STARTED = 0,
  ENDED = 1,
  PAUSED = 2,
  RUNNING = 3,
}
