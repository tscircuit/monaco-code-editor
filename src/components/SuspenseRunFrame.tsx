import { RunFrame } from "@tscircuit/runframe/runner"

export type SuspenseRunFrameProps = React.ComponentProps<typeof RunFrame> & {
  className?: string
}

export function SuspenseRunFrame({
  className,
  ...props
}: SuspenseRunFrameProps) {
  return (
    <div className={`h-full ${className ?? ""}`}>
      <RunFrame {...props} />
    </div>
  )
}
