// import { DatePicker } from "./datePicker";

// interface ProtectedDateInputProps {
//   value: Date | null;
//   onChange: (date: Date | null) => void;
//   onVerify: () => void;
//   verified: boolean;
// }

// const ProtectedDateInput: React.FC<ProtectedDateInputProps> = ({
//   value,
//   onChange,
//   onVerify,
//   verified,
// }) => {
//   return (
//     <div className="relative">
//       <DatePicker
//         selected={value}
//         onChange={onChange}
//         dateFormat="dd/MM/yyyy"
//         disabled={!verified}
//         className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
//       />
//       {!verified && (
//         <div
//           className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50 rounded-md cursor-pointer"
//           onClick={onVerify}
//         >
//           <CalendarDays className="h-5 w-5 text-gray-600" />
//           <span className="ml-2 text-sm text-gray-600">Click to unlock</span>
//         </div>
//       )}
//     </div>
//   );
// };
