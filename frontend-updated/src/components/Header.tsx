<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LogOut, Bell, Search, Menu, History, Settings, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  buildStaticHeaderSearchResults,
  loadDynamicHeaderSearchResults,
  searchHeaderResults,
  type HeaderSearchResult,
} from '../lib/headerSearch';
=======
import { LogOut, Bell, Search, Menu, History, Settings } from 'lucide-react';
import { User } from '../types';
import { Link } from 'react-router-dom';
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onMenuClick: () => void;
}

export default function Header({ user, onLogout, onMenuClick }: HeaderProps) {
<<<<<<< HEAD
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
  const staticResults = useMemo(
    () => buildStaticHeaderSearchResults(userRole),
    [userRole],
  );
  const allResults = useMemo(
    () => [...staticResults, ...dynamicResults],
    [dynamicResults, staticResults],
  );
  const matchingResults = useMemo(
    () => searchHeaderResults(allResults, query),
    [allResults, query],
  );

  const loadDynamicResults = useCallback(async () => {
    if (hasLoadedDynamicResults || isSearchLoading) {
      return;
    }

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
    if (query.trim().length < 2) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void loadDynamicResults();
    }, 150);

    return () => window.clearTimeout(timeoutId);
  }, [loadDynamicResults, query]);

  useEffect(() => {
    setIsSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  function getCategoryClasses(category: HeaderSearchResult['category']) {
    switch (category) {
      case 'User':
        return 'bg-blue-50 text-blue-700';
      case 'Device':
        return 'bg-amber-50 text-amber-700';
      case 'Notification':
        return 'bg-emerald-50 text-emerald-700';
      case 'Audit':
        return 'bg-violet-50 text-violet-700';
      case 'Attendance':
        return 'bg-sky-50 text-sky-700';
      case 'Leave':
        return 'bg-rose-50 text-rose-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  }

  function handleSelectResult(result: HeaderSearchResult) {
    const trimmedQuery = query.trim();

    if (trimmedQuery) {
      const encodedQuery = encodeURIComponent(trimmedQuery);
      const separator = result.route.includes('?') ? '&' : '?';
      navigate(`${result.route}${separator}search=${encodedQuery}`);
    } else {
      navigate(result.route);
    }

    setQuery('');
    setIsSearchOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && matchingResults.length > 0) {
      event.preventDefault();
      handleSelectResult(matchingResults[0]);
      return;
    }

    if (event.key === 'Escape') {
      setIsSearchOpen(false);
      return;
    }
  }

=======
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-30">
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

<<<<<<< HEAD
        <div ref={searchRef} className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              setIsSearchOpen(true);
              void loadDynamicResults();
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search records..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {isSearchOpen && query.trim() ? (
            <div className="absolute top-full left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Search Results
              </div>

              {matchingResults.length > 0 ? (
                <div className="max-h-96 overflow-y-auto py-2">
                  {matchingResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={cn(
                          'mt-0.5 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
                          getCategoryClasses(result.category),
                        )}
                      >
                        {result.category}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {result.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {result.subtitle}
                        </p>
                      </div>
                    </button>
                  ))}
                  {isSearchLoading ? (
                    <div className="px-4 py-3 text-xs text-slate-400">
                      Loading more live records...
                    </div>
                  ) : null}
                </div>
              ) : isSearchLoading ? (
                <div className="px-4 py-4 text-sm text-slate-500">Loading live records...</div>
              ) : searchError ? (
                <div className="px-4 py-4 text-sm text-amber-700">{searchError}</div>
              ) : (
                <div className="px-4 py-4 text-sm text-slate-500">
                  No matching records found.
                </div>
              )}
            </div>
          ) : null}
=======
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search records..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden md:flex items-center gap-2">
<<<<<<< HEAD
          {isAdmin ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              title="Refresh Overall System"
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          ) : (
            <Link 
              to="/hr/reports"
              title="System Logs"
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <History className="w-5 h-5" />
            </Link>
          )}
          <Link 
            to={userRole === 'admin' ? "/admin/policies" : "/hr/dashboard"}
=======
          <Link 
            to={user.role === 'admin' ? "/admin/audit" : "/hr/reports"}
            title="System Logs"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <History className="w-5 h-5" />
          </Link>
          <Link 
            to={user.role === 'admin' ? "/admin/policies" : "/hr/dashboard"}
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
            title="Global Settings"
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>

        <div className="hidden md:block h-8 w-px bg-slate-200 mx-1"></div>

        <Link 
<<<<<<< HEAD
          to={`/${userRole}/notifications`}
=======
          to={`/${user.role}/notifications`}
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </Link>
        
        <div className="h-8 w-px bg-slate-200 mx-1 md:mx-2"></div>

        <Link 
<<<<<<< HEAD
          to={`/${userRole}/profile`}
=======
          to={`/${user.role}/profile`}
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
          className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-100 rounded-full transition-colors"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user.name.charAt(0)}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
<<<<<<< HEAD
            <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{userRole}</p>
=======
            <p className="text-[10px] text-slate-500 font-medium leading-tight capitalize">{user.role}</p>
>>>>>>> 5b011c722a6b59e8a016ee8f0dc221343adf2d1e
          </div>
        </Link>

        <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1"></div>

        <button 
          onClick={onLogout}
          className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
