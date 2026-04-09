import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useColorScheme as useNativeWindColorScheme } from "nativewind"
import { useColorScheme as useSystemColorScheme } from "react-native"

type ThemeMode = "light" | "dark" | "system"

type ThemeContextType = {
  mode: ThemeMode
  resolvedTheme: "light" | "dark"
  setMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { setColorScheme } = useNativeWindColorScheme()
  const systemTheme = useSystemColorScheme()
  const [mode, setModeState] = useState<ThemeMode>("system")

  const resolvedTheme: "light" | "dark" =
    mode === "system"
      ? systemTheme === "dark"
        ? "dark"
        : "light"
      : mode

  useEffect(() => {
    if (mode === "light" || mode === "dark") {
      setColorScheme(mode)
    }
  }, [mode, setColorScheme])

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode: (nextMode: ThemeMode) => {
        setModeState(nextMode)
      },
      toggleTheme: () => {
        setModeState((prev) => {
          const current = prev === "system" ? resolvedTheme : prev
          return current === "dark" ? "light" : "dark"
        })
      },
    }),
    [mode, resolvedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useAppTheme must be used inside ThemeProvider")
  return ctx
}