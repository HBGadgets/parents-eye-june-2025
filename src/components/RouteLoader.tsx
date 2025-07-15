// // components/RouteLoader.tsx
// export default function RouteLoader() {
//   return (
//     <div className="fixed top-0 left-0 w-full h-1 bg-blue-600 animate-pulse z-[9999]" />
//   );
// }
// components/RouteLoader.tsx
export default function RouteLoader() {
  return (
   <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent">
  <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>



  );
}
