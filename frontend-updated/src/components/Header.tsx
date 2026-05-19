import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LogOut, Bell, Search, Menu, History, Settings, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useLanguage } from '../lib/translations';
import {
  buildStaticHeaderSearchResults,
  loadDynamicHeaderSearchResults,
  searchHeaderResults,
  type HeaderSearchResult,
} from '../lib/headerSearch';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick: () => void;
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
  const { t } = useLanguage();
  const userRole = user.role ?? 'employee';
  const isAdmin = userRole === 'admin';
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dynamicResults, setDynamicResults] = useState<HeaderSearchResult[]>([]);
  const [hasLoadedDynamicResults, setHasLoadedDynamicResults] = useState(false);

  const staticResults = useMemo(() => buildStaticHeaderSearchResults(userRole), [userRole]);
  const allResults = useMemo(() => [...staticResults, ...dynamicResults], [dynamicResults, staticResults]);
  const matchingResults = useMemo(() => searchHeaderResults(allResults, query), [allResults, query]);

  const loadDynamicResults = useCallback(async () => {
    if (hasLoadedDynamicResults || isSearchLoading) return;
    try {
      setIsSearchLoading(true);
      setSearchError(null);
      const results = await loadDynamicHeaderSearchResults(userRole);
      setDynamicResults(results);
      setHasLoadedDynamicResults(true);
    } catch {
      setSearchError('Unable to load live search records right now.');
    } finally {
      setIsSearchLoading(false);
    }
  }, [hasLoadedDynamicResults, isSearchLoading, userRole]);

  useEffect(() => {
    setDynamicResults([]);
    setHasLoadedDynamicResults(false);
    setSearchError(null);
    setQuery('');
    setIsSearchOpen(false);
  }, [userRole]);

  useEffect(() => {
    if (query.trim().length < 2) return undefined;
    const id = window.setTimeout(() => void loadDynamicResults(), 150);
    return () => window.clearTimeout(id);
  }, [loadDynamicResults, query]);

  useEffect(() => { setIsSearchOpen(false); }, [location.pathname, location.search]);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (!searchRef.current?.contains(e.target as Node)) setIsSearchOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function getCategoryClasses(category: HeaderSearchResult['category']) {
    const map: Record<string, string> = {
      User:         'bg-blue-100 text-blue-700',
      Device:       'bg-amber-100 text-amber-700',
      Notification: 'bg-emerald-100 text-emerald-700',
      Audit:        'bg-violet-100 text-violet-700',
      Attendance:   'bg-sky-100 text-sky-700',
      Leave:        'bg-rose-100 text-rose-700',
    };
    return map[category] ?? 'bg-surface-accent text-surface-muted';
  }

  function handleSelectResult(result: HeaderSearchResult) {
    const q = query.trim();
    if (q) {
      const sep = result.route.includes('?') ? '&' : '?';
      navigate(`${result.route}${sep}search=${encodeURIComponent(q)}`);
    } else {
      navigate(result.route);
    }
    setQuery('');
    setIsSearchOpen(false);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && matchingResults.length > 0) { e.preventDefault(); handleSelectResult(matchingResults[0]); return; }
    if (e.key === 'Escape') { setIsSearchOpen(false); }
  }

  const iconBtn = 'p-2 rounded-full transition-colors text-surface-muted hover:bg-surface-hover hover:text-surface-text';

  return (
    <header className="h-16 bg-surface-card border-b border-surface-border flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4 flex-1">
        <button onClick={onMenuClick} className={cn(iconBtn, 'lg:hidden')}>
          <Menu className="w-6 h-6" />
        </button>

        {/* Search */}
        <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-muted" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setIsSearchOpen(true); }}
            onFocus={() => { setIsSearchOpen(true); void loadDynamicResults(); }}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("Search records...")}
            className="w-full pl-10 pr-4 py-2 bg-surface-bg border border-surface-border rounded-2xl text-sm outline-none text-surface-text placeholder:text-surface-muted focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
            style={{ '--tw-ring-color': '#0073CE' } as React.CSSProperties}
          />

          {isSearchOpen && query.trim() ? (
            <div className="absolute top-full left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-xl">
              <div className="border-b border-surface-divider px-4 py-3 text-xs font-semibold uppercase tracking-widest text-surface-muted">
                {t("Search Results")}
              </div>
              {matchingResults.length > 0 ? (
                <div className="max-h-96 overflow-y-auto py-2">
                  {matchingResults.map(result => (
                    <button key={result.id} type="button" onClick={() => handleSelectResult(result)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-hover">
                      <span className={cn('mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest', getCategoryClasses(result.category))}>
                        {result.category}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-surface-text">{result.title}</p>
                        <p className="mt-1 text-xs text-surface-muted">{result.subtitle}</p>
                      </div>
                    </button>
                  ))}
                  {isSearchLoading && <div className="px-4 py-3 text-xs text-surface-muted">{t("Loading live records...")}</div>}
                </div>
              ) : isSearchLoading ? (
                <div className="px-4 py-4 text-sm text-surface-muted">{t("Loading live records...")}</div>
              ) : searchError ? (
                <div className="px-4 py-4 text-sm text-amber-600">{searchError}</div>
              ) : (
                <div className="px-4 py-4 text-sm text-surface-muted">{t("No matching records found.")}</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden md:flex items-center gap-1">
          {isAdmin ? (
            <button type="button" onClick={() => window.location.reload()} title={t("Refresh System")} className={iconBtn}>
              <RefreshCw className="w-5 h-5" />
            </button>
          ) : (
            <Link to="/hr/reports" title="System Logs" className={iconBtn}>
              <History className="w-5 h-5" />
            </Link>
          )}

          <Link to={isAdmin ? '/admin/policies' : '/hr/dashboard'} title={t("Settings")} className={iconBtn}>
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        <div className="hidden md:block h-6 w-px bg-surface-border mx-1" />

        {/* Bell */}
        <Link to={`/${userRole}/notifications`} className={cn(iconBtn, 'relative')}>
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-surface-card" />
        </Link>

        <div className="h-6 w-px bg-surface-border mx-1" />

        {/* Profile */}
        <Link to={`/${userRole}/profile`} className="flex items-center gap-2.5 p-1 pr-3 rounded-full hover:bg-surface-hover transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0"
            style={{ backgroundColor: '#0073CE' }}>
            {user.profilePhoto
              ? <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
              : (user.name || user.username).charAt(0).toUpperCase()}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-surface-text leading-tight">{user.name}</p>
            <p className="text-[10px] text-surface-muted font-medium leading-tight capitalize">{userRole}</p>
          </div>
        </Link>

        <div className="hidden sm:block h-6 w-px bg-surface-border mx-1" />

        {/* Logout */}
        <button onClick={onLogout}
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-surface-muted hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:inline">{t("Sign Out")}</span>
        </button>
      </div>
    </header>
  );
}
