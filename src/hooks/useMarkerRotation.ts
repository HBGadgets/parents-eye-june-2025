import { useEffect, useRef } from "react";
import L from "leaflet";

const getShortestRotation = (from: number, to: number): number => {
  const delta = ((((to - from) % 360) + 540) % 360) - 180;
  return from + delta;
};

export const useMarkerRotation = (
  markerRef: React.RefObject<L.Marker | null>,
  latitude: number,
  longitude: number,
  course: number,
  imageUrl: string,
  busIcon: L.DivIcon
) => {
  const prevPositionRef = useRef<[number, number] | null>(null);
  const prevRotationRef = useRef<number>(0);
  const prevImageUrlRef = useRef<string>("");
  const isZoomingRef = useRef(false);

  useEffect(() => {
    if (!markerRef.current) return;

    const newPosition: [number, number] = [latitude, longitude];
    const targetRotation = course || 0;
    const prevPosition = prevPositionRef.current;
    const currentRotation = prevRotationRef.current;
    const prevImageUrl = prevImageUrlRef.current;

    const positionChanged =
      !prevPosition ||
      prevPosition[0] !== newPosition[0] ||
      prevPosition[1] !== newPosition[1];

    const shortestRotation = getShortestRotation(
      currentRotation,
      targetRotation
    );
    const rotationChanged = currentRotation !== shortestRotation;
    const imageChanged = prevImageUrl !== imageUrl;

    let markerElement = markerRef.current.getElement();

    if (imageChanged) {
      markerRef.current.setIcon(busIcon);
      prevImageUrlRef.current = imageUrl;
      markerElement = markerRef.current.getElement();
    }

    if (markerElement) {
      const imgElement = markerElement.querySelector(
        ".vehicle-marker-img"
      ) as HTMLElement;

      if (positionChanged) {
        if (!isZoomingRef.current) {
          markerElement.classList.add("smooth-marker");
        }
        markerRef.current.setLatLng(newPosition);
        prevPositionRef.current = newPosition;
      }

      if (imgElement) {
        if (rotationChanged && !isZoomingRef.current) {
          imgElement.classList.add("smooth-rotation");
        }
        imgElement.style.transform = `rotate(${shortestRotation}deg)`;
        if (rotationChanged) {
          prevRotationRef.current = shortestRotation;
        }
      }
    }
  }, [latitude, longitude, course, busIcon, imageUrl, markerRef]);
};
