import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";
import { useAuth } from "@/contexts/AuthContext";

// COMMON FETCH
const fetchData = async (url: string) => {
  const res = await api.get(url);

  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.data?.events)) return res.data.events;

  return res.data || [];
};

/* ================= COMMON CONFIG ================= */

const baseConfig = {
  staleTime: 1000 * 60, // 1 min
  refetchOnMount: false,
  refetchOnWindowFocus: false,
};

/* ================= DASHBOARD ================= */

export const useMetrics = () =>
  useQuery({
    queryKey: ["metrics"],
    queryFn: () => fetchData("/dashboard/metrics"),
    ...baseConfig,
  });

export const useQuickStats = () =>
  useQuery({
    queryKey: ["quick-stats"],
    queryFn: () => fetchData("/dashboard/quick-stats"),
    ...baseConfig,
  });

export const useFacultyBudget = () =>
  useQuery({
    queryKey: ["faculty-budget"],
    queryFn: () => fetchData("/dashboard/faculty-budget"),
    ...baseConfig,
  });

export const useBudget = () => {
  return useQuery({
    queryKey: ["media-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/media-stats");
      console.log("MEDIA API:", res.data); // DEBUG
      return res.data;
    },
  });
};

export const useMonthlyEvents = () =>
  useQuery({
    queryKey: ["monthly-events"],
    queryFn: () => fetchData("/dashboard/monthly-events"),
    ...baseConfig,
  });

export const useCalendarEvents = (date?: string) =>
  useQuery({
    queryKey: ["calendar-events", date],
    queryFn: async () => {
      if (!date) return { events: [] };
      const res = await api.get(`/dashboard/calendar/${date}`);
      return res.data;
    },
    enabled: !!date,
    ...baseConfig,
  });

/* ================= CLUBS ================= */

export const useClubs = () =>
  useQuery({
    queryKey: ["clubs"],
    queryFn: () => fetchData("/clubs"),
    ...baseConfig,
  });

/* ================= EVENTS ================= */

export const useEvents = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["events"],
    queryFn: () => fetchData("/events"),
    enabled: !!user,
    ...baseConfig,
  });
};

/* ================= NOTIFICATIONS ================= */

export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchData("/notifications"),
    enabled: !!user,
    ...baseConfig,
  });
};

/* ================= FACULTY ================= */

export const useFacultyStats = () =>
  useQuery({
    queryKey: ["faculty-stats"],
    queryFn: () => fetchData("/faculty/stats"),
    ...baseConfig,
  });

export const useFacultyEvents = () =>
  useQuery({
    queryKey: ["faculty-events"],
    queryFn: () => fetchData("/faculty/events"),
    ...baseConfig,
  });

export const useFacultyClub = () =>
  useQuery({
    queryKey: ["faculty-club"],
    queryFn: () => fetchData("/faculty/my-club"),
    ...baseConfig,
  });

export const useFacultyRegistrations = () =>
  useQuery({
    queryKey: ["faculty-registrations"],
    queryFn: () => fetchData("/faculty/registrations"),
    ...baseConfig,
  });

export const useMyFeedback = () =>
  useQuery({
    queryKey: ["my-feedback"],
    queryFn: () => fetchData("/feedback"),
    ...baseConfig,
  });

export const useMediaStats = () =>
  useQuery({
    queryKey: ["media-stats"],
    queryFn: () => fetchData("/dashboard/media-stats"),
    ...baseConfig,
  });

/* ================= COMPLAINTS ================= */

export const useComplaints = () =>
  useQuery({
    queryKey: ["complaints-feed"],
    queryFn: () => fetchData("/dashboard/complaints-feed"),
    ...baseConfig,
  });

export const useFacultyList = () =>
  useQuery({
    queryKey: ["faculty-list"],
    queryFn: () => fetchData("/faculty"),
    ...baseConfig,
  });