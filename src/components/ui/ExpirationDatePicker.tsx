// // components/ExpirationDatePicker.tsx
// import React, { forwardRef } from 'react';
// import DatePicker from 'react-datepicker';
// import { CalendarDays } from 'lucide-react';
// import 'react-datepicker/dist/react-datepicker.css';
// interface ExpirationDatePickerProps {
//   value: Date | null;
//   onChange: (date: Date | null) => void;
//   showLabel?: boolean;
// }

// const CustomInput = forwardRef(({ value, onClick, placeholder }: any, ref) => (
//   <div
//     onClick={onClick}
//     ref={ref}
//     className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 pr-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-[oklch(.8423_.1655_91.33)] cursor-pointer"
//   >
//     <input
//       type="text"
//       readOnly
//       value={value}
//       placeholder={placeholder}
//       className="w-full bg-transparent outline-none cursor-pointer"
//     />
//     <CalendarDays className="ml-2 text-gray-400" size={18} />
//   </div>
// ));

// CustomInput.displayName = 'CustomInput';

// export default function ExpirationDatePicker({
//   value,
//   onChange,
// }: {
//   value: Date | null;
//   onChange: (date: Date | null) => void;
// }) {
//   return (
//     <div className="grid gap-2">
//       <label htmlFor="subscriptionExpirationDate" className="text-sm font-medium">
//         Expiration Date
//       </label>

//       <DatePicker
//         id="subscriptionExpirationDate"
//         selected={value}
//         onChange={onChange}
//         placeholderText="Enter date"
//         dateFormat="yyyy-MM-dd"
//         customInput={<CustomInput />}
//       />
//     </div>
//   );
// }
// components/ExpirationDatePicker.tsx
import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { CalendarDays } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';

interface ExpirationDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  showLabel?: boolean;
}


const CustomInput = forwardRef(
  ({ value, onClick, placeholder }: any, ref) => (
    <div
      onClick={onClick}
      ref={ref}
      className="flex items-center w-full rounded-md border border-input bg-background px-3 py-2 pr-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-[oklch(.8423_.1655_91.33)] cursor-pointer"
    >
      <input
        type="text"
        readOnly
        value={value}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none cursor-pointer"
      />
      <CalendarDays className="ml-2 text-gray-400" size={18} />
    </div>
  )
);

CustomInput.displayName = 'CustomInput';

export default function ExpirationDatePicker({
  value,
  onChange,
  showLabel = true,
}: ExpirationDatePickerProps) {
  return (
    <div className="grid gap-2">
      {showLabel && (
        <label
          htmlFor="subscriptionExpirationDate"
          className="text-sm font-medium"
        >
          Expiration Date
        </label>
      )}

      <DatePicker
        id="subscriptionExpirationDate"
        selected={value}
        onChange={onChange}
        placeholderText="Enter date"
        dateFormat="yyyy-MM-dd"
        customInput={<CustomInput />} 
       />
    

    </div>
  );
}
