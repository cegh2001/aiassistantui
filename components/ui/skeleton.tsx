import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 rounded-lg p-2">
          <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-700"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-zinc-200 rounded animate-pulse dark:bg-zinc-700" style={{ width: `${60 + Math.random() * 40}%` }}></div>
            <div className="h-2 bg-zinc-200 rounded animate-pulse dark:bg-zinc-700" style={{ width: `${40 + Math.random() * 30}%` }}></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-xs space-y-2 rounded-lg p-3 ${
            i % 2 === 0 
              ? 'bg-zinc-100 dark:bg-zinc-800' 
              : 'bg-blue-500/10 dark:bg-blue-500/20'
          }`}>
            <div className="h-3 bg-zinc-200 rounded animate-pulse dark:bg-zinc-600" style={{ width: `${50 + Math.random() * 50}%` }}></div>
            <div className="h-3 bg-zinc-200 rounded animate-pulse dark:bg-zinc-600" style={{ width: `${30 + Math.random() * 40}%` }}></div>
            {Math.random() > 0.5 && (
              <div className="h-3 bg-zinc-200 rounded animate-pulse dark:bg-zinc-600" style={{ width: `${60 + Math.random() * 30}%` }}></div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export { Skeleton, ConversationSkeleton, MessageSkeleton }
