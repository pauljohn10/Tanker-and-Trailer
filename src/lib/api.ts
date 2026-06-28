/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TankerRecord, User, AuditLog, SystemSettings } from '../types';

const API_BASE = '/api';

function getHeaders() {
  const token = sessionStorage.getItem('al_noor_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let errorMessage = `HTTP error ${res.status}`;
    if (contentType.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      if (errData.error) errorMessage = errData.error;
    } else {
      // Consume the text/html response body safely without throwing
      await res.text().catch(() => '');
    }
    throw new Error(errorMessage);
  }
  if (!contentType.includes('application/json')) {
    await res.text().catch(() => '');
    throw new Error('Unexpected non-JSON response from server.');
  }
  return res.json();
}

export const api = {
  // 1. Auth API
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse(res);
    sessionStorage.setItem('al_noor_token', data.token);
    sessionStorage.setItem('al_noor_user', JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateProfile(data: { name?: string; avatarUrl?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const updated = await handleResponse(res);
    // Sync sessionStorage local copy
    const localUser = sessionStorage.getItem('al_noor_user');
    if (localUser) {
      const parsed = JSON.parse(localUser);
      const syncedUser = { ...parsed, ...updated };
      sessionStorage.setItem('al_noor_user', JSON.stringify(syncedUser));
    }
    return updated;
  },

  logout() {
    sessionStorage.removeItem('al_noor_token');
    sessionStorage.removeItem('al_noor_user');
  },

  // 2. Records API
  async getRecords(params: {
    q?: string;
    classification?: string;
    product?: string;
    region?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ records: TankerRecord[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.classification) query.append('classification', params.classification);
    if (params.product) query.append('product', params.product);
    if (params.region) query.append('region', params.region);
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const res = await fetch(`${API_BASE}/records?${query.toString()}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createRecord(record: Partial<TankerRecord>): Promise<TankerRecord> {
    const res = await fetch(`${API_BASE}/records`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    return handleResponse(res);
  },

  async updateRecord(sn: number, record: Partial<TankerRecord>): Promise<TankerRecord> {
    const res = await fetch(`${API_BASE}/records/${sn}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(record),
    });
    return handleResponse(res);
  },

  async deleteRecord(sn: number): Promise<{ message: string; deletedSn: number }> {
    const res = await fetch(`${API_BASE}/records/${sn}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async bulkDeleteRecords(sns: number[]): Promise<{ message: string; deletedSns: number[] }> {
    const res = await fetch(`${API_BASE}/records/bulk-delete`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sns }),
    });
    return handleResponse(res);
  },

  // 3. User Management API
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async createUser(user: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    return handleResponse(res);
  },

  async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // 4. Audit Trail API
  async getLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/logs`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // 5. Reports & Stats API
  async getStatistics(): Promise<{
    totalRecords: number;
    totalVolume: number;
    productDist: Record<string, number>;
    regionDist: Record<string, number>;
    classificationDist: Record<'STEEL' | 'ALUMINUM', number>;
    capacityCategories: {
      DAYNA: { count: number; capacities: Record<number, number> };
      SIX: { count: number; capacities: Record<number, number> };
      'TN-2': { count: number; capacities: Record<number, number> };
    };
  }> {
    const res = await fetch(`${API_BASE}/reports/statistics`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // 6. Share Record API (Public)
  async getShareRecord(newTankNumber: string): Promise<TankerRecord> {
    const res = await fetch(`${API_BASE}/share/${newTankNumber}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse(res);
  },

  // 7. Settings API
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  // Excel Operations (Admin only)
  async importExcel(file: File): Promise<{ success: boolean; message: string; count: number }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = sessionStorage.getItem('al_noor_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/records/import`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const err = new Error(errData.error || `HTTP error ${res.status}`) as any;
      err.details = errData.details;
      throw err;
    }
    return res.json();
  },

  async exportExcel(): Promise<Blob> {
    const token = sessionStorage.getItem('al_noor_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/records/export`, {
      headers,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }
    return res.blob();
  },

  // 8. Gemini Assistant API
  async askAssistant(prompt: string): Promise<{ response: string }> {
    const res = await fetch(`${API_BASE}/ai/assistant`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt }),
    });
    return handleResponse(res);
  },

  // 9. Capacity Classification Categories CRUD
  async getCapacityCategories(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/capacity-categories`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async addCapacityCategory(cat: { name: string; min_capacity: number; max_capacity: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/capacity-categories`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cat),
    });
    return handleResponse(res);
  },

  async updateCapacityCategory(id: number, cat: { name: string; min_capacity: number; max_capacity: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/capacity-categories/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(cat),
    });
    return handleResponse(res);
  },

  async deleteCapacityCategory(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/capacity-categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // 10. Special Standby Ledger CRUD
  async getSpecialStandbyLedger(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/special-standby-ledger`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async addSpecialStandbyLedger(entry: { sn: string; product: string; capacity: number; status: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/special-standby-ledger`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(entry),
    });
    return handleResponse(res);
  },

  async updateSpecialStandbyLedger(id: number, entry: { sn: string; product: string; capacity: number; status: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/special-standby-ledger/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(entry),
    });
    return handleResponse(res);
  },

  async deleteSpecialStandbyLedger(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/special-standby-ledger/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // 11. Custom SQL Query Execution
  async executeSql(sql: string): Promise<{ success: boolean; isModification: boolean; rowsAffected: number; result: any[] }> {
    const res = await fetch(`${API_BASE}/sql/execute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ sql }),
    });
    return handleResponse(res);
  }
};
