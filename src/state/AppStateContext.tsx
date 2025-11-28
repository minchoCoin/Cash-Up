import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api';
import { Coupon, Festival, Shop, Summary, TrashBin, User } from '../types';

type AppStateValue = {
  user?: User;
  token?: string;
  festival?: Festival;
  summary?: Summary;
  bins: TrashBin[];
  coupons: Coupon[];
  shops: Shop[];
  loading: boolean;
  login: (nickname: string) => Promise<void>;
  logout: () => void;
  refreshSummary: () => Promise<void>;
  refreshBins: () => Promise<void>;
  refreshCoupons: () => Promise<void>;
  refreshShops: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

const loadAuth = (): { user?: User; token?: string } => {
  const raw = localStorage.getItem('cashup_user');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.user && parsed?.token) return parsed as { user: User; token: string };
    if (parsed?.id) return { user: parsed as User }; // backward compatibility
    return {};
  } catch (e) {
    console.error(e);
    return {};
  }
};

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
  const loaded = loadAuth();
  const [user, setUser] = useState<User | undefined>(() => loaded.user);
  const [token, setToken] = useState<string | undefined>(() => loaded.token);
  const [festival, setFestival] = useState<Festival | undefined>();
  const [summary, setSummary] = useState<Summary | undefined>();
  const [bins, setBins] = useState<TrashBin[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) setAuthToken(token);
    if (user && !token) {
      setUser(undefined);
      setSummary(undefined);
      setCoupons([]);
      localStorage.removeItem('cashup_user');
    }
  }, [token, user]);

  const pickFestival = async () => {
    try {
      const list = await api.listFestivals();
      const target = list[0];
      if (target) {
        setFestival(target);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    pickFestival();
  }, []);

  useEffect(() => {
    if (festival) {
      refreshBins();
      refreshShops();
    }
  }, [festival?.id]);

  useEffect(() => {
    if (user && festival) {
      refreshSummary();
      refreshCoupons();
    }
  }, [user?.id, festival?.id]);

  const login = async (nickname: string) => {
    setLoading(true);
    try {
      const session = await api.login(nickname);
      setUser(session.user);
      setToken(session.token);
      setAuthToken(session.token);
      localStorage.setItem('cashup_user', JSON.stringify(session));
      if (festival) {
        await refreshSummary(session.user);
        await refreshCoupons(session.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(undefined);
    setToken(undefined);
    setSummary(undefined);
    setCoupons([]);
    localStorage.removeItem('cashup_user');
    setAuthToken(undefined);
  };

  const refreshSummary = async (targetUser?: User) => {
    if (!festival || !(targetUser ?? user)) return;
    try {
      const currentUser = targetUser ?? user;
      const data = await api.getSummary(currentUser.id, festival.id);
      setFestival(data.festival);
      setSummary({
        totalActive: data.summary.totalActive,
        totalPending: data.summary.totalPending,
        totalConsumed: data.summary.totalConsumed,
        cap: data.festival.perUserDailyCap
      });
    } catch (err) {
      console.error(err);
    }
  };

  const refreshBins = async () => {
    if (!festival) return;
    try {
      const list = await api.listBins(festival.id);
      setBins(list);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCoupons = async (targetUser?: User) => {
    if (!festival || !(targetUser ?? user)) return;
    try {
      const currentUser = targetUser ?? user;
      const list = await api.listCoupons(currentUser.id, festival.id);
      setCoupons(list);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshShops = async () => {
    if (!festival) return;
    try {
      const list = await api.listShops(festival.id);
      setShops(list);
    } catch (err) {
      console.error(err);
    }
  };

  const value = useMemo(
    () => ({
      user,
      token,
      festival,
      summary,
      bins,
      coupons,
      shops,
      loading,
      login,
      logout,
      refreshSummary,
      refreshBins,
      refreshCoupons,
      refreshShops
    }),
    [user, token, festival, summary, bins, coupons, shops, loading]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
};
