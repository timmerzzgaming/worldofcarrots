'use client'

import { createContext, useContext, useMemo } from 'react'
import { usePathname } from 'next/navigation'

interface BasePathContextValue {
  /** '/test' or '' */
  basePath: string
  /** Prefix a path with the base path: prefixPath('/game/flag') → '/test/game/flag' */
  prefixPath: (path: string) => string
}

const BasePathContext = createContext<BasePathContextValue>({
  basePath: '',
  prefixPath: (p) => p,
})

export function BasePathProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isTest = pathname.startsWith('/test')

  const value = useMemo<BasePathContextValue>(() => {
    const basePath = isTest ? '/test' : ''
    return {
      basePath,
      prefixPath: (path: string) => {
        if (!basePath) return path
        // Don't double-prefix
        if (path.startsWith(basePath)) return path
        // Handle paths like '/?cat=mapGames' → '/test/?cat=mapGames'
        // and '/game/flag' → '/test/game/flag'
        return `${basePath}${path}`
      },
    }
  }, [isTest])

  return (
    <BasePathContext.Provider value={value}>
      {children}
    </BasePathContext.Provider>
  )
}

export function useBasePath() {
  return useContext(BasePathContext)
}
