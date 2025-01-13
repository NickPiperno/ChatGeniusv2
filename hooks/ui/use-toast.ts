'use client'

import * as React from 'react'

/**
 * Type definitions for toast messages and actions
 */
export interface Toast {
  id: string
  title?: string
  description?: string
  action?: ToastAction
  type?: ToastType
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export type ToastType = 'default' | 'success' | 'error' | 'warning'

interface State {
  toasts: Toast[]
}

/**
 * Available toast actions that can be dispatched
 */
type Action =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; toastId?: string }

interface ToastContext {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (toastId: string) => void
}

const ToastContext = React.createContext<ToastContext | undefined>(undefined)

/**
 * Reducer to manage toast state
 */
function toastReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }

    case 'DISMISS_TOAST': {
      const { toastId } = action

      // Dismiss all toasts if no ID is provided
      if (toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }

      // Dismiss single toast
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== toastId),
      }
    }
  }
}

/**
 * Provider component for toast functionality
 */
export function ToastProvider({
  children,
}: {
  children: React.ReactNode
}): JSX.Element {
  const [state, dispatch] = React.useReducer(toastReducer, {
    toasts: [],
  })

  const addToast = React.useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2)

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          ...toast,
          id,
        },
      })

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        dispatch({
          type: 'DISMISS_TOAST',
          toastId: id,
        })
      }, 5000)
    },
    [dispatch]
  )

  const dismissToast = React.useCallback(
    (toastId: string) => {
      dispatch({
        type: 'DISMISS_TOAST',
        toastId,
      })
    },
    [dispatch]
  )

  return React.createElement(ToastContext.Provider, {
    value: {
      toasts: state.toasts,
      addToast,
      dismissToast,
    },
    children,
  })
}

/**
 * Hook to use toast functionality
 * @returns Object containing toast state and methods
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { addToast } = useToast()
 *   
 *   const handleClick = () => {
 *     addToast({
 *       title: 'Success',
 *       description: 'Operation completed',
 *       type: 'success'
 *     })
 *   }
 *   
 *   return <button onClick={handleClick}>Show Toast</button>
 * }
 * ```
 */
export function useToast(): {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (toastId: string) => void
} {
  const context = React.useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
} 