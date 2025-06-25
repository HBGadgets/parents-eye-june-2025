"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronUp } from "lucide-react"

interface Item {
  icon: React.ElementType
  label: string
  onClick: () => void
}

export default function IconDropdown({ items }: { items: Item[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const toggleDropdown = () => setIsOpen(!isOpen)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col items-center"
      ref={dropdownRef}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mb-3 flex flex-col items-center gap-3"
          >
            {items.map((item, index) => (
              <motion.div
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: { delay: (items.length - index - 1) * 0.05 },
                }}
              >
                <motion.button
                  onClick={() => {
                    item.onClick()
                    setIsOpen(false)
                  }}
                  className="rounded-full w-12 h-12 flex items-center justify-center shadow-md border-none"
                  style={{ backgroundColor: "#FFE58A" }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {React.createElement(item.icon, {
                    size: 20,
                    color: "black",
                  })}
                </motion.button>

                <AnimatePresence>
                  {hoveredIndex === index && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute right-full top-1/2 transform -translate-y-1/2 mr-2 bg-[#FFE58A] text-black text-sm px-2 py-1 rounded shadow"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleDropdown}
        className="rounded-full w-12 h-12 flex items-center justify-center border-none shadow-md"
        style={{ backgroundColor: "#FFE58A" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <ChevronUp size={20} color="black" />
        </motion.div>
      </motion.button>
    </div>
  )
}
