import { createContext, useContext, useState } from 'react'

type QrContextType = {
  open: boolean | null
  setOpen: React.Dispatch<React.SetStateAction<boolean | null>>
}
const QrContext = createContext<QrContextType | null>(null)

export const QrProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState<boolean | null>(null)

  return (
    <QrContext.Provider value={{ open, setOpen }}>
      {children}
    </QrContext.Provider>
  )
}

export const useQr = () => {
  const context = useContext(QrContext)

  if (!context) {
    throw new Error('useQr must be used within QrProvider')
  }

  return context
}
