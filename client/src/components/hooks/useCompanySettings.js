// src/hooks/useCompanySettings.js
import { useState, useEffect, useRef } from "react";
import { getCompanySettings } from "../../services/companySettingsService";

// Simple in-memory cache so multiple components don't refetch on every mount
let _cache = null;
let _listeners = [];

export function invalidateCompanySettingsCache() {
  _cache = null;
  _listeners.forEach((fn) => fn());
}

export function useCompanySettings() {
  const [data,    setData]    = useState(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error,   setError]   = useState(null);
  const mounted = useRef(true);

  const refetch = async () => {
    try {
      setLoading(true);
      const res  = await getCompanySettings();
      const fresh = res.data?.data || null;
      _cache = fresh;
      if (mounted.current) { setData(fresh); setError(null); }
    } catch (err) {
      if (mounted.current) setError(err.response?.data?.message || "Failed to load settings");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (!_cache) refetch();
    else { setData(_cache); setLoading(false); }

    _listeners.push(refetch);
    return () => {
      mounted.current = false;
      _listeners = _listeners.filter((fn) => fn !== refetch);
    };
  }, []);

  return { data, loading, error, refetch };
}
