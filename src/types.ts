/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'staff' | 'viewer';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'suspended';
  avatarUrl?: string;
  createdAt: string;
}

export interface TankerRecord {
  sn: number;
  aramcoTankNumber: string; // e.g. '259038', 'Dammam for Company', '****'
  newTankNumber: string;    // e.g. 'TN-2-110'
  classification: 'STEEL' | 'ALUMINUM';
  model: string;            // Year, e.g., '2023' or '****' or 'New Tanker'
  product: string;          // e.g. 'DIESEL', 'PETROL', 'WATER', 'MIXED', 'FUEL OIL', 'New Tanker'
  quantity: number;         // volume capacity in liters
  authorizedVehicle: string;// e.g. 'T-R-1-137 / GRA - 1617 - ق ر أ'
  region: string;           // e.g. 'DAMMAM', 'NAJRAN', 'MAKKAH'
  status: string;           // e.g. 'OPERATIONAL', 'STANDBY DUE SEVERE DAMAGE', etc.
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'SETTINGS';
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  allowPublicSharing: boolean;
  enableAuditTrails: boolean;
  defaultPaginationSize: number;
  maintenanceMode: boolean;
  activeEngine?: 'JSON' | 'Supabase';
  recordsCount?: number;
}
