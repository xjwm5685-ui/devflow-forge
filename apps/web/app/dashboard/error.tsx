"use client"

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-sm">
        <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-zinc-100 mb-1">出错了</h2>
        <p className="text-sm text-zinc-500 mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors text-sm font-medium">重试</button>
      </div>
    </div>
  )
}
