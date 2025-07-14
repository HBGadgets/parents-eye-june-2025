"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  FileSpreadsheet,
  LogOut,
  X,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface FloatingActionMenuProps {
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onLogout?: () => void;
  className?: string;
}

export function FloatingMenu({
  onExportPdf,
  onExportExcel,
  onLogout,
  className = "",
}: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleAction = (action: () => void | undefined, label: string) => {
    if (action) {
      toast.success(`Action: ${label}`, { duration: 1500 });
      action();
    }
    setIsOpen(false);
  };

  const menuItems = [
    {
      icon: FileText,
      action: onExportPdf,
      label: "Export PDF",
    },
    {
      icon: FileSpreadsheet,
      action: onExportExcel,
      label: "Export Excel",
    },
    {
      icon: LogOut,
      action: onLogout,
      label: "Logout",
    },
    {
      icon: ArrowUp,
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      label: "Scroll to Top",
    },
  ];

  return (
    <TooltipProvider>
      <div ref={menuRef} className={`fixed bottom-6 right-6 z-50 ${className}`}>
        <div className="flex flex-col items-center">
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3 mb-3"
              >
                {menuItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    transition={{
                      delay: index * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="lg"
                          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all bg-[#F3C623] hover:bg-[#FFB823] border-0"
                          onClick={() => handleAction(item.action, item.label)}
                        >
                          <item.icon className="h-5 w-5 text-white" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className="bg-gray-900 text-white border-gray-700"
                      >
                        <p className="text-sm font-medium">{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main FAB Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  className={`h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all border-0 ${
                    isOpen
                      ? "bg-black hover:bg-gray-800"
                      : "bg-[#F3C623] hover:bg-[#FFB823]"
                  }`}
                  onClick={toggleMenu}
                >
                  <motion.div
                    animate={{ rotate: isOpen ? 0 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    {isOpen ? (
                      <X className="h-6 w-6 text-white" />
                    ) : (
                      <Plus className="h-6 w-6 text-white" />
                    )}
                  </motion.div>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="bg-gray-900 text-white border-gray-700"
              >
                <p className="text-sm font-medium">
                  {isOpen ? "Close Menu" : "Open Menu"}
                </p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
