import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { auth } from './auth'

/**
 * Single shared SignalR connection. Module-level singleton so every page
 * subscribes to the same socket — no fan-out, no multiple WebSockets.
 *
 * The connection is best-effort: if it can't establish or drops, the app
 * still works via normal REST. Pages that subscribe will simply not get
 * push updates until reconnect.
 */

let connection: HubConnection | null = null
let startPromise: Promise<void> | null = null

function build(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl('/hubs/orders', {
      accessTokenFactory: () => auth.getToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build()
}

export function connectRealtime(): HubConnection | null {
  // No token → no connection. (Pages call this defensively; logged-out users get nothing.)
  if (!auth.getToken()) return null

  if (connection && connection.state !== HubConnectionState.Disconnected) {
    return connection
  }

  if (!connection) connection = build()

  if (connection.state === HubConnectionState.Disconnected && !startPromise) {
    startPromise = connection.start()
      .catch(err => {
        // Best-effort: log once and let the page keep working with REST.
        console.warn('[realtime] failed to connect', err)
      })
      .finally(() => { startPromise = null })
  }

  return connection
}

export async function disconnectRealtime(): Promise<void> {
  if (!connection) return
  try {
    await connection.stop()
  } catch {
    // ignore — we're tearing down
  } finally {
    connection = null
    startPromise = null
  }
}

export function getRealtimeConnection(): HubConnection | null {
  return connection
}
