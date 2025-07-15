// // components/RouteTransitionWrapper.tsx
// "use client";

// import { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import RouteLoader from "./RouteLoader";

// export default function RouteTransitionWrapper({ children }: { children: React.ReactNode }) {
//   const pathname = usePathname();
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     setLoading(true);
//     const timeout = setTimeout(() => {
//       setLoading(false);
//     }, 500); // Customize delay

//     return () => clearTimeout(timeout);
//   }, [pathname]);

//   return (
//     <>
//       {loading && <RouteLoader />}
//       {children}
//     </>
//   );
// }
"use client";

import RouteLoader from "./RouteLoader";
import { useRouteLoader } from "../components/useRouteLoader"; // adjust import path

export default function RouteTransitionWrapper({ children }: { children: React.ReactNode }) {
  const loading = useRouteLoader();

  return (
    <>
      {loading && <RouteLoader />}
      {children}
    </>
  );
}
