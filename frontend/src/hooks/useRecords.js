import { useCallback, useEffect, useState } from 'react';
import { createRecord, deleteRecord, listRecords, updateRecord } from '../services/api.js';

export function useRecords(module) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!module) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await listRecords(module);
      setRecords(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load records');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [module]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function add(payload) {
    const { data } = await createRecord(module, payload);
    setRecords((current) => [data, ...current]);
    return data;
  }

  async function edit(id, payload) {
    const { data } = await updateRecord(module, id, payload);
    setRecords((current) => current.map((record) => (record.id === id ? data : record)));
    return data;
  }

  async function remove(id) {
    await deleteRecord(module, id);
    setRecords((current) => current.filter((record) => record.id !== id));
  }

  return { records, loading, error, reload, add, edit, remove };
}
