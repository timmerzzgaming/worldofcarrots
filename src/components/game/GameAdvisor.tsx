interface GameAdvisorProps {
  text: string
}

export default function GameAdvisor({ text }: GameAdvisorProps) {
  return (
    <div className="w-[220px]">
      {/* Speech balloon with tail pointing left toward menu */}
      <div className="relative">
        <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-[8px] border-b-[8px] border-r-[8px] border-t-transparent border-b-transparent border-r-white/90" />
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-white/40">
          <p className="text-xs text-slate-700 font-body leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  )
}
