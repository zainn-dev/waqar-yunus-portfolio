import { useEffect, useState } from 'react';

/** Live clock for a time zone via Intl.DateTimeFormat. Updates every 15s. */
export function useLocalTime(timeZone: string) {
  const format = () =>
    new Intl.DateTimeFormat('en-IN', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = window.setInterval(() => setTime(format()), 15_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeZone]);
  return time;
}
