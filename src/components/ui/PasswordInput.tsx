"use client";

import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
  labelClassName?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      value,
      onChange,
      name,
      id,
      placeholder = "••••••••",
      required = false,
      error,
      hint,
      disabled = false,
      autoComplete = "current-password",
      className = "",
      inputClassName = "",
      labelClassName = "",
      containerClassName = "",
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsVisible((prev) => !prev);
    };

    const inputId = id || name || "password-input";

    return (
      <div className={`space-y-1 w-full ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-xs font-bold text-slate-700 dark:text-slate-300 ${labelClassName}`}
          >
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={isVisible ? "text" : "password"}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`ui-input w-full pr-10 py-2.5 px-3 text-xs font-mono tracking-wide transition-all focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
              error ? "border-rose-500 focus:border-rose-500" : ""
            } ${inputClassName} ${className}`}
            {...props}
          />

          <button
            type="button"
            onClick={toggleVisibility}
            disabled={disabled}
            aria-label={isVisible ? "Hide password" : "Show password"}
            title={isVisible ? "Hide password" : "Show password"}
            className="absolute right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition cursor-pointer"
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
            )}
          </button>
        </div>

        {hint && !error && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{hint}</p>
        )}
        {error && (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
