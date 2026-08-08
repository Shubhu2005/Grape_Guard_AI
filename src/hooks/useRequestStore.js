import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const mapStatusToUi = (status) => {
  if (status === 'verified') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'waiting';
};

const imageUrlWithBase = (url) => {
  if (!url) return '/placeholder.svg';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
  return url;
};

const summarizeLlmOutput = (text) => {
  if (!text) return 'AI analysis generated. Open request details for full recommendation.';
  return String(text).trim();
};

const splitPesticides = (recommendations) => {
  const organic = [];
  const chemical = [];
  const recs = Array.isArray(recommendations) ? recommendations : [];

  recs.forEach((rec) => {
    const name = rec?.pesticide_name || rec?.name || 'Unknown pesticide';
    const dosage = rec?.dosage || rec?.schedule || '-';
    const precautions = rec?.notes || rec?.source || '-';
    const entry = { name, dosage, precautions };

    const haystack = `${name} ${precautions}`.toLowerCase();
    const looksOrganic = ['neem', 'bio', 'organic', 'botanical', 'baking soda'].some((w) => haystack.includes(w));
    if (looksOrganic) {
      organic.push(entry);
    } else {
      chemical.push(entry);
    }
  });

  if (!organic.length && !chemical.length) {
    return {
      organic: [],
      chemical: [{ name: 'No recommendation yet', dosage: '-', precautions: 'Awaiting expert validation' }],
    };
  }
  return { organic, chemical };
};

const normalizeReport = (report, detail = null) => {
  const sourceReport = detail?.report || report || {};
  const ai = detail?.ai_output || {};
  const status = mapStatusToUi(sourceReport.status);

  return {
    request_id: sourceReport.id,
    farmer_id: sourceReport.farmer_id || ai.farmer_id || '',
    farmer_name: sourceReport.farmer_name || report?.farmer_name || 'Farmer',
    status,
    disease_name: sourceReport.disease_name || ai.disease_name || 'Unknown',
    description: summarizeLlmOutput(ai.llm_output),
    symptoms_by_farmer: ai.farmer_note || '',
    image_url: imageUrlWithBase(sourceReport.image_url || ai.image_url),
    pesticides: splitPesticides(ai.recommendations),
    expert_validation: status === 'approved' ? 'valid' : status === 'rejected' ? 'invalid' : 'pending',
    expert_remarks: sourceReport.expert_comment || '',
    created_at: sourceReport.created_at || new Date().toISOString(),
    updated_at: sourceReport.updated_at || sourceReport.created_at || new Date().toISOString(),
  };
};

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const authHeaders = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  return { Authorization: `Bearer ${token}` };
};

const storedRole = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    return u.role;
  } catch {
    return undefined;
  }
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

export const useRequestStore = (farmerId) => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isFarmerMode = Boolean(farmerId);
  const storageKey = isFarmerMode ? 'cache_requests_farmer' : 'cache_requests_expert';
  const storageTsKey = `${storageKey}_ts`;
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadFarmerReports = useCallback(async () => {
    if (storedRole() !== 'farmer') return [];
    const headers = authHeaders();
    if (!headers) return [];

    const listResp = await fetch(`${API_BASE_URL}/farmer/reports`, { headers });
    const listBody = await safeJson(listResp);
    if (!listResp.ok) {
      throw new Error(listBody.detail || 'Failed to fetch farmer reports');
    }
    const reports = listBody.reports || [];
    const details = await mapWithConcurrency(
      reports,
      3,
      async (r) => {
        try {
          const detailResp = await fetch(`${API_BASE_URL}/farmer/reports/${r.id}`, { headers });
          const detailBody = await safeJson(detailResp);
          return detailResp.ok ? normalizeReport(r, detailBody) : normalizeReport(r);
        } catch {
          return normalizeReport(r);
        }
      }
    );
    return details;
  }, []);

  const loadExpertReports = useCallback(async () => {
    if (storedRole() !== 'expert') return [];
    const headers = authHeaders();
    if (!headers) return [];

    const [pendingResp, historyResp] = await Promise.all([
      fetch(`${API_BASE_URL}/expert/pending`, { headers }),
      fetch(`${API_BASE_URL}/expert/history`, { headers }),
    ]);

    const pendingBody = await safeJson(pendingResp);
    const historyBody = await safeJson(historyResp);
    if (!pendingResp.ok) throw new Error(pendingBody.detail || 'Failed to fetch pending reports');
    if (!historyResp.ok) throw new Error(historyBody.detail || 'Failed to fetch reviewed reports');

    const allReports = [...(pendingBody.reports || []), ...(historyBody.reports || [])];
    const details = await mapWithConcurrency(
      allReports,
      3,
      async (r) => {
        try {
          const detailResp = await fetch(`${API_BASE_URL}/expert/reports/${r.id}`, { headers });
          const detailBody = await safeJson(detailResp);
          return detailResp.ok ? normalizeReport(r, detailBody) : normalizeReport(r);
        } catch {
          return normalizeReport(r);
        }
      }
    );
    return details.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = isFarmerMode ? await loadFarmerReports() : await loadExpertReports();
      setRequests(data);
      sessionStorage.setItem(storageKey, JSON.stringify(data));
      const now = Date.now();
      sessionStorage.setItem(storageTsKey, `${now}`);
      setLastUpdated(new Date(now).toISOString());
    } catch (err) {
      setError(err?.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [isFarmerMode, loadFarmerReports, loadExpertReports, storageKey, storageTsKey]);

  useEffect(() => {
    // Fast hydration: show cached data instantly, then refresh in background.
    const cached = sessionStorage.getItem(storageKey);
    const cachedTs = sessionStorage.getItem(storageTsKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setRequests(parsed);
        if (cachedTs) setLastUpdated(new Date(Number(cachedTs)).toISOString());
      } catch {
        // ignore parse errors
      }
    }
    refresh();
  }, [refresh, storageKey, storageTsKey]);

  const addRequest = useCallback(
    async ({ imageFile, symptom_note }) => {
      const headers = authHeaders();
      if (!headers) throw new Error('Not authenticated');
      if (!imageFile) throw new Error('Please upload an image');

      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('symptom_note', symptom_note || '');

      const response = await fetch(`${API_BASE_URL}/farmer/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const body = await safeJson(response);
      if (!response.ok) {
        throw new Error(body.detail || 'Failed to create report');
      }

      const created = normalizeReport(body.report, body);
      setRequests((prev) => {
        const next = [created, ...prev];
        sessionStorage.setItem(storageKey, JSON.stringify(next));
        const now = Date.now();
        sessionStorage.setItem(storageTsKey, `${now}`);
        setLastUpdated(new Date(now).toISOString());
        return next;
      });
      return created;
    },
    [storageKey, storageTsKey]
  );

  const updateRequest = useCallback(async (requestId, updates) => {
    const headers = authHeaders();
    if (!headers) throw new Error('Not authenticated');

    const targetStatus = updates?.status;
    const expertComment = updates?.expert_remarks || '';
    let endpoint = '';
    if (targetStatus === 'approved') {
      endpoint = `${API_BASE_URL}/expert/reports/${requestId}/verify?expert_comment=${encodeURIComponent(expertComment)}`;
    } else if (targetStatus === 'rejected') {
      endpoint = `${API_BASE_URL}/expert/reports/${requestId}/reject?expert_comment=${encodeURIComponent(expertComment)}`;
    } else {
      throw new Error('Unsupported status update');
    }

    const response = await fetch(endpoint, { method: 'PUT', headers });
    const body = await safeJson(response);
    if (!response.ok) {
      throw new Error(body.detail || 'Failed to update report');
    }

    await refresh();
    return body.report;
  }, [refresh]);

  const farmerRequests = useMemo(
    () => (farmerId ? requests.filter((r) => r.farmer_id === farmerId) : requests),
    [requests, farmerId]
  );
  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'waiting'), [requests]);
  const completedRequests = useMemo(
    () => requests.filter((r) => r.status === 'approved' || r.status === 'rejected'),
    [requests]
  );

  return {
    requests,
    farmerRequests,
    pendingRequests,
    completedRequests,
    addRequest,
    updateRequest,
    refresh,
    isLoading,
    error,
    lastUpdated,
  };
};
