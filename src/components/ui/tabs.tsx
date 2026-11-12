import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { LayoutGroup, motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { EASE_SPRING } from "@/lib/motion"

/** Per-root context so each Tabs group gets its own sliding indicator. */
type TabsCtx = { id: string; value: string | undefined }
const TabsContext = React.createContext<TabsCtx | null>(null)

const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ value, defaultValue, onValueChange, ...props }, ref) => {
  const id = React.useId()
  const [internal, setInternal] = React.useState(defaultValue)
  const current = value ?? internal
  const handleChange = React.useCallback(
    (v: string) => {
      setInternal(v)
      onValueChange?.(v)
    },
    [onValueChange]
  )
  const ctx = React.useMemo(() => ({ id, value: current }), [id, current])
  return (
    <TabsContext.Provider value={ctx}>
      <LayoutGroup id={id}>
        <TabsPrimitive.Root
          ref={ref}
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleChange}
          {...props}
        />
      </LayoutGroup>
    </TabsContext.Provider>
  )
})
Tabs.displayName = TabsPrimitive.Root.displayName

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null)
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref]
  )

  // Edge fade only when content is actually cut off.
  React.useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      el.dataset.fadeLeft = String(el.scrollLeft > 2)
      el.dataset.fadeRight = String(max - el.scrollLeft > 2)
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null
    ro?.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      ro?.disconnect()
    }
  }, [])

  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "tabs-scroll inline-flex h-auto max-w-full items-center overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx?.value !== undefined && ctx.value === value
  const innerRef = React.useRef<HTMLButtonElement | null>(null)
  const setRefs = React.useCallback(
    (node: HTMLButtonElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
    },
    [ref]
  )

  // Keep the active tab visible inside a scrolling strip (horizontal only).
  React.useEffect(() => {
    const el = innerRef.current
    const list = el?.parentElement
    if (!active || !el || !list || list.scrollWidth <= list.clientWidth) return
    const left = el.offsetLeft - list.offsetLeft
    const right = left + el.offsetWidth
    if (left < list.scrollLeft) list.scrollLeft = left - 8
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 8
  }, [active])

  return (
    <TabsPrimitive.Trigger
      ref={setRefs}
      value={value}
      className={cn(
        "relative isolate inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-[color,background-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground",
        className
      )}
      {...props}
    >
      {active && ctx && (
        <motion.span
          aria-hidden="true"
          layoutId={`tab-indicator-${ctx.id}`}
          transition={EASE_SPRING}
          className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] bg-background shadow-sm"
        />
      )}
      {children}
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:animate-tab-enter",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
