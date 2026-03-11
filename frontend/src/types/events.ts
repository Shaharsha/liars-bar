export interface ServerEvent {
  event: string
  data: Record<string, any>
}

export interface ClientEvent {
  event: string
  data: Record<string, any>
}
