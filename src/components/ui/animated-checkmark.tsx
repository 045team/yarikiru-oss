"use client";

import { motion } from "motion/react";

export function AnimatedCheckmark({ className = "w-10 h-10" }: { className?: string }) {
    return (
        <div className="flex items-center justify-center relative">
            <motion.svg
                viewBox="0 0 50 50"
                className={`absolute text-green-500 ${className}`}
                initial="hidden"
                animate="visible"
            >
                <motion.circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    variants={{
                        hidden: { pathLength: 0, opacity: 0 },
                        visible: {
                            pathLength: 1,
                            opacity: 1,
                            transition: { duration: 0.4, ease: "easeOut" }
                        }
                    }}
                />
                <motion.path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16 26l6 6 12-14"
                    variants={{
                        hidden: { pathLength: 0, opacity: 0 },
                        visible: {
                            pathLength: 1,
                            opacity: 1,
                            transition: { duration: 0.3, delay: 0.3, ease: "easeOut" }
                        }
                    }}
                />
                {/* スパークルエフェクト */}
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <motion.line
                        key={i}
                        x1="25"
                        y1="5"
                        x2="25"
                        y2="0"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        transform={`rotate(${i * 45} 25 25)`}
                        variants={{
                            hidden: { pathLength: 0, opacity: 0 },
                            visible: {
                                pathLength: 1,
                                opacity: [0, 1, 0],
                                y: [0, -5],
                                transition: { duration: 0.6, delay: 0.5 + i * 0.05, ease: "easeOut" }
                            }
                        }}
                    />
                ))}
            </motion.svg>
        </div>
    );
}
