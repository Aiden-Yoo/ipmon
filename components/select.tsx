import type { UseFormRegisterReturn } from "react-hook-form";
import { cls } from "@libs/client/utils";

interface SelectProps {
  label: string;
  name: string;
  register: UseFormRegisterReturn;
  required: boolean;
  disabled?: boolean;
  value?: string;
  options: string[];
}

export default function Select({
  label,
  name,
  register,
  required,
  disabled,
  value,
  options,
}: SelectProps) {
  return (
    <div>
      <label
        className={cls(`mb-1 block text-sm font-medium text-gray-700`)}
        htmlFor={name}
      >
        {label}
      </label>
      <div className="rounded-md relative flex  items-center shadow-sm">
        <select
          id={name}
          required={required}
          {...register}
          className={cls(
            `appearance-none w-full px-3 py-1 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-gray-500 focus:border-gray-500 ${
              disabled ? `bg-slate-200` : ``
            }`
          )}
          disabled={disabled}
          value={value}
        >
          {options.map((option, i) => (
            <option key={i} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
