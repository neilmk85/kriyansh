import { useState, useEffect, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const styles = {
  page: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #0F0F23 0%, #0D1B2A 40%, #0F2027 100%)',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: '#F8FAFC',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(12px)',
    flexShrink: 0,
  },
  salonName: {
    fontSize: '1.75rem',
    fontWeight: 700,
    background: 'linear-gradient(90deg, #0D9488, #14B8A6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
  },
  clock: {
    fontSize: '2rem',
    fontWeight: 300,
    color: '#94A3B8',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.05em',
  },
  columnsWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    padding: '32px 48px 48px',
    flex: 1,
    minHeight: 0,
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: 0,
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    flexShrink: 0,
  },
  columnDot: (color) => ({
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 12px ${color}`,
    flexShrink: 0,
  }),
  columnTitle: (color) => ({
    fontSize: '1.1rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: color,
  }),
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    overflowY: 'auto',
    flex: 1,
    paddingRight: '4px',
  },
  card: (glowColor) => ({
    background: 'rgba(255,255,255,0.07)',
    backdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: `1px solid rgba(255,255,255,0.1)`,
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)`,
    transition: 'transform 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  }),
  cardAccent: (color) => ({
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    background: color,
    borderRadius: '16px 0 0 16px',
    boxShadow: `0 0 16px ${color}`,
  }),
  cardLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    paddingLeft: '12px',
  },
  cardName: {
    fontSize: '1.875rem',
    fontWeight: 700,
    color: '#F1F5F9',
    lineHeight: 1,
    letterSpacing: '-0.02em',
  },
  cardServices: {
    fontSize: '1.05rem',
    color: '#94A3B8',
    lineHeight: 1.3,
  },
  numberBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'rgba(245,158,11,0.15)',
    border: '2px solid rgba(245,158,11,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#F59E0B',
    flexShrink: 0,
    marginRight: '4px',
  },
  waitPill: (color, bg) => ({
    background: bg,
    border: `1px solid ${color}40`,
    borderRadius: '100px',
    padding: '6px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: color,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  }),
  emptyState: (color) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '12px',
    color: color,
    opacity: 0.4,
    padding: '40px 20px',
  }),
  emptyIcon: {
    fontSize: '3rem',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: 500,
    textAlign: 'center',
  },
  refreshDot: (active) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: active ? '#10B981' : '#334155',
    transition: 'background 0.3s ease',
    boxShadow: active ? '0 0 8px #10B981' : 'none',
  }),
  footer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    color: '#475569',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
}

function formatWait(mins) {
  if (mins < 1) return 'Just arrived'
  if (mins === 1) return '1 min'
  if (mins < 60) return `${mins} mins`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function useQueue() {
  const [queue, setQueue] = useState([])
  const [refreshFlash, setRefreshFlash] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/public/queue`)
      if (!res.ok) return
      const data = await res.json()
      setQueue(Array.isArray(data) ? data : [])
      setRefreshFlash(true)
      setTimeout(() => setRefreshFlash(false), 600)
    } catch {
      // silently ignore network errors on TV display
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 20_000)
    return () => clearInterval(interval)
  }, [load])

  return { queue, refreshFlash }
}

function useClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return time
}

export default function TVDisplay() {
  const { queue, refreshFlash } = useQueue()
  const time = useClock()

  const serving = queue.filter(e => e.status === 'in_service')
  const waiting = queue.filter(e => e.status === 'waiting')

  const timeStr = time.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <span style={styles.salonName}>Kriyansh Beauty Bar</span>
        <span style={styles.clock}>{timeStr}</span>
      </div>

      {/* Columns */}
      <div style={styles.columnsWrapper}>
        {/* Now Serving */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <div style={styles.columnDot('#0D9488')} />
            <span style={styles.columnTitle('#0D9488')}>Now Serving</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              {serving.length} {serving.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
          <div style={styles.cardsList}>
            {serving.length === 0 ? (
              <div style={styles.emptyState('#0D9488')}>
                <div style={styles.emptyIcon}>✂️</div>
                <div style={styles.emptyText}>No one being served right now</div>
              </div>
            ) : (
              serving.map(entry => (
                <div key={entry.id} style={styles.card('#0D9488')}>
                  <div style={styles.cardAccent('#0D9488')} />
                  <div style={styles.cardLeft}>
                    <div style={styles.cardName}>{entry.first_name}</div>
                    {entry.service_names && (
                      <div style={styles.cardServices}>{entry.service_names}</div>
                    )}
                  </div>
                  <span style={styles.waitPill('#0D9488', 'rgba(13,148,136,0.12)')}>
                    {formatWait(entry.wait_minutes)} in service
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Waiting */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>
            <div style={styles.columnDot('#F59E0B')} />
            <span style={styles.columnTitle('#F59E0B')}>Waiting</span>
            <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
              {waiting.length} {waiting.length === 1 ? 'client' : 'clients'}
            </span>
          </div>
          <div style={styles.cardsList}>
            {waiting.length === 0 ? (
              <div style={styles.emptyState('#F59E0B')}>
                <div style={styles.emptyIcon}>🌸</div>
                <div style={styles.emptyText}>Queue is empty</div>
              </div>
            ) : (
              waiting.map((entry, idx) => (
                <div key={entry.id} style={styles.card('#F59E0B')}>
                  <div style={styles.cardAccent('#F59E0B')} />
                  <div style={{ ...styles.numberBadge }}>{idx + 1}</div>
                  <div style={styles.cardLeft}>
                    <div style={styles.cardName}>{entry.first_name}</div>
                    {entry.service_names && (
                      <div style={styles.cardServices}>{entry.service_names}</div>
                    )}
                  </div>
                  <span style={styles.waitPill('#F59E0B', 'rgba(245,158,11,0.12)')}>
                    {formatWait(entry.wait_minutes)} wait
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.refreshDot(refreshFlash)} />
        <span>Auto-refreshes every 20 seconds</span>
      </div>
    </div>
  )
}
