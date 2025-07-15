// // components/RouteLoader.tsx
export  function ResponseLoader() {
  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-blue-600 animate-pulse z-[9999]" />
  );
}
// components/RouteLoader.tsx
// export default function FullScreenSpinner() {
//   return (
//     <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70">
//       <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
//     </div>
//   );
// }

export default function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80">
      <div className="flex items-center gap-3 px-6 py-3 rounded-xl border border-yellow-400 bg-[#ffdc00] text-black font-semibold shadow-lg">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent" />
        <span>Loading...</span>
      </div>
    </div>
  );
}

