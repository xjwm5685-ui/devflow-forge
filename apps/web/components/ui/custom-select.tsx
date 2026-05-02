"use client"

import { Check, ChevronDown } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

export interface CustomSelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface CustomSelectProps {
  value: string
  options: CustomSelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "选择",
  disabled = false,
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  function selectOption(option: CustomSelectOption) {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`custom-select ${open ? "custom-select-open" : ""} ${className}`}>
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? "custom-select-value" : "custom-select-placeholder"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={15} className="custom-select-chevron" />
      </button>

      {open && (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
            const active = option.value === value
            return (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={active}
                disabled={option.disabled}
                className={`custom-select-option ${active ? "custom-select-option-active" : ""}`}
                onClick={() => selectOption(option)}
              >
                <span className="custom-select-option-copy">
                  <span>{option.label}</span>
                  {option.description && <small>{option.description}</small>}
                </span>
                {active && <Check size={14} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
