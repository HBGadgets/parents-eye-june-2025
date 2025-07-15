// export default function ResponseLoader() {
//   return (
//     <div className="fixed top-0 left-0 w-full h-1 bg-blue-600 animate-pulse z-[9999]" />
//   );
// }
export default function ResponseLoader() {
  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] bg-transparent">
      <div className="h-full bg-blue-700 animate-stepProgress infinite"
 />
    </div>
  );
}



