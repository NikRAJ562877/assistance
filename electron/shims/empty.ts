// Shim for optional Node modules (ws, bufferutil, utf-8-validate)
export class WebSocket {
  constructor(..._args: unknown[]) {}
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  readyState = WebSocket.CLOSED
  close() {}
  send(_data: unknown) {}
  addEventListener(_event: string, _listener: (...args: any[]) => void) {}
  removeEventListener(_event: string, _listener: (...args: any[]) => void) {}
}

const empty: any = {}
export default empty
