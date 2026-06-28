/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  Copy, 
  Check, 
  Database, 
  Info, 
  Trash2, 
  Clock, 
  Download, 
  Table, 
  ChevronRight,
  Code,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../lib/api';
import { User } from '../types';
import { useTranslation } from '../lib/LanguageContext';

interface SqlEditorProps {
  user: User;
}

export default function SqlEditor({ user }: SqlEditorProps) {
  const { t, isRtl } = useTranslation();
  const [query, setQuery] = useState('SELECT * FROM capacity_categories;\n\n-- Try also:\n-- SELECT * FROM special_standby_ledger;\n-- SELECT * FROM tanker_records LIMIT 5;');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [rowsAffected, setRowsAffected] = useState<number | null>(null);
  const [isMod, setIsMod] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'setup-script'>('editor');
  const [copiedMigration, setCopiedMigration] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [history, setHistory] = useState<string[]>([
    'SELECT * FROM capacity_categories;',
    'SELECT * FROM special_standby_ledger;',
    'SELECT * FROM tanker_records LIMIT 5;',
    'SELECT classification, COUNT(*) as count FROM tanker_records GROUP BY classification;',
    'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;'
  ]);

  const [schema] = useState([
    {
      name: 'capacity_categories',
      description: 'Categories for tanker volumes (e.g. DAYNA, SIX, TN-2)',
      columns: [
        { name: 'id', type: 'SERIAL (PK)' },
        { name: 'name', type: 'TEXT (UNIQUE)' },
        { name: 'min_capacity', type: 'INTEGER' },
        { name: 'max_capacity', type: 'INTEGER' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'special_standby_ledger',
      description: 'Tankers with exception/standby status or SAIF Custody tags',
      columns: [
        { name: 'id', type: 'SERIAL (PK)' },
        { name: 'sn', type: 'TEXT (UNIQUE)' },
        { name: 'product', type: 'TEXT' },
        { name: 'capacity', type: 'INTEGER' },
        { name: 'status', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'tanker_records',
      description: 'Main registry of transport tankers',
      columns: [
        { name: 'sn', type: 'SERIAL (PK)' },
        { name: 'aramco_tank_number', type: 'TEXT' },
        { name: 'new_tank_number', type: 'TEXT (UNIQUE)' },
        { name: 'classification', type: 'TEXT (STEEL/ALUMINUM)' },
        { name: 'model', type: 'TEXT' },
        { name: 'product', type: 'TEXT' },
        { name: 'quantity', type: 'INTEGER' },
        { name: 'authorized_vehicle', type: 'TEXT' },
        { name: 'plate_number', type: 'TEXT' },
        { name: 'region', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'profiles',
      description: 'User access levels (aliased to "profiles" & "users")',
      columns: [
        { name: 'id', type: 'UUID (PK)' },
        { name: 'username', type: 'TEXT (UNIQUE)' },
        { name: 'email', type: 'TEXT' },
        { name: 'name', type: 'TEXT' },
        { name: 'role', type: 'TEXT (admin/staff/viewer)' },
        { name: 'status', type: 'TEXT (active/suspended)' },
        { name: 'avatar_url', type: 'TEXT' },
        { name: 'created_at', type: 'TIMESTAMP' }
      ]
    },
    {
      name: 'audit_logs',
      description: 'Telemetry logs detailing database mutations',
      columns: [
        { name: 'id', type: 'UUID (PK)' },
        { name: 'user_id', type: 'UUID' },
        { name: 'username', type: 'TEXT' },
        { name: 'user_role', type: 'TEXT' },
        { name: 'action', type: 'TEXT' },
        { name: 'details', type: 'TEXT' },
        { name: 'timestamp', type: 'TIMESTAMP' }
      ]
    }
  ]);

  const handleRunQuery = async (sqlToRun: string = query) => {
    if (!sqlToRun.trim()) return;
    setExecuting(true);
    setError(null);
    setSuccessMsg(null);
    setResults(null);
    setRowsAffected(null);

    try {
      const data = await api.executeSql(sqlToRun);
      if (data.success) {
        setResults(data.result);
        setIsMod(data.isModification);
        setRowsAffected(data.rowsAffected);
        
        if (data.isModification) {
          setSuccessMsg(`SQL executed successfully! ${data.rowsAffected} row(s) updated in the local database. Since anonymous web clients cannot perform raw DDL/DML on remote production tables directly (for security), please execute this SQL in your Supabase SQL Editor if you want to sync it permanently to the cloud.`);
        } else {
          setSuccessMsg(`Query returned ${data.result ? data.result.length : 0} row(s).`);
        }

        // Add to history if not duplicate
        if (!history.includes(sqlToRun)) {
          setHistory(prev => [sqlToRun, ...prev.slice(0, 19)]);
        }
      } else {
        setError('Unknown execution outcome.');
      }
    } catch (err: any) {
      console.error('SQL query failure:', err);
      setError(err.message || 'Error occurred while executing SQL.');
    } finally {
      setExecuting(false);
    }
  };

  const copyMigrationScript = () => {
    const migrationSql = `-- ====================================================================
-- AL NOOR UNITED TRANSPORTATION - SUPABASE SETUP MIGRATION SCRIPT
-- ====================================================================

-- Create Capacity Application Categories Table
CREATE TABLE IF NOT EXISTS public.capacity_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Special Standby / Exception Ledger Table
CREATE TABLE IF NOT EXISTS public.special_standby_ledger (
    id SERIAL PRIMARY KEY,
    sn TEXT UNIQUE NOT NULL,
    product TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.capacity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_standby_ledger ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone
CREATE POLICY "Allow select capacity_categories" ON public.capacity_categories FOR SELECT USING (true);
CREATE POLICY "Allow select special_standby_ledger" ON public.special_standby_ledger FOR SELECT USING (true);

-- Allow full write to authenticated managers/admins
CREATE POLICY "Allow write capacity_categories for admins" ON public.capacity_categories
    FOR ALL USING (public.is_active_user() AND public.get_current_user_role() IN ('super_admin', 'admin', 'manager'));

CREATE POLICY "Allow write special_standby_ledger for admins" ON public.special_standby_ledger
    FOR ALL USING (public.is_active_user() AND public.get_current_user_role() IN ('super_admin', 'admin', 'manager', 'staff'));

-- Pre-seed initial default categories
INSERT INTO public.capacity_categories (name, min_capacity, max_capacity)
VALUES 
('DAYNA', 5000, 12000),
('SIX', 14000, 22000),
('TN-2', 30000, 42000)
ON CONFLICT (name) DO NOTHING;

-- Pre-seed initial default special standby ledger entries
INSERT INTO public.special_standby_ledger (sn, product, capacity, status)
VALUES 
('275747', 'PETROL', 36000, 'NOT USE'),
('275749', 'PETROL', 36000, 'NOT USE'),
('277068', 'DIESEL', 36000, 'NOT USE'),
('277038', 'DIESEL', 36000, 'NOT USE'),
('277039', 'DIESEL', 36000, 'NOT USE'),
('273521', 'PETROL', 36000, 'SAIF CUSTODY'),
('276948', 'FUEL OIL', 36000, 'NOT USE'),
('156776', 'PETROL', 36000, 'FOR UPDATES'),
('269866', 'DIESEL', 36000, 'IN WORKSHOP'),
('272549', 'PETROL', 36000, 'IN WORKSHOP')
ON CONFLICT (sn) DO NOTHING;`;

    navigator.clipboard.writeText(migrationSql);
    setCopiedMigration(true);
    setTimeout(() => setCopiedMigration(false), 2000);
  };

  const copyQueryText = () => {
    navigator.clipboard.writeText(query);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleExportCSV = () => {
    if (!results || results.length === 0) return;
    const headers = Object.keys(results[0]);
    const csvRows = [
      headers.join(','), // headers row
      ...results.map(row => 
        headers.map(fieldName => JSON.stringify(row[fieldName] ?? '')).join(',')
      )
    ].join('\r\n');

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderResultTable = () => {
    if (!results || results.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 px-4 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
          <Table className="w-10 h-10 text-slate-600 mb-2.5 animate-pulse" />
          <p className="text-sm font-medium">No results or empty set returned.</p>
        </div>
      );
    }

    const columns = Object.keys(results[0]);

    return (
      <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950 max-h-96">
        <table className="w-full text-left text-sm text-slate-300 border-collapse">
          <thead className="text-2xs font-bold uppercase tracking-wider bg-slate-900 border-b border-slate-800 text-slate-400 font-mono">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="px-4 py-3 border-r border-slate-800 last:border-0">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
            {results.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                {columns.map((col, cIdx) => {
                  const val = row[col];
                  let displayVal = '';
                  if (typeof val === 'object' && val !== null) {
                    displayVal = JSON.stringify(val);
                  } else {
                    displayVal = String(val ?? '');
                  }
                  return (
                    <td key={cIdx} className="px-4 py-2.5 border-r border-slate-800/50 last:border-0 truncate max-w-xs" title={displayVal}>
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className={`p-4 md:p-8 space-y-6 ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-blue-500" />
            <span>SQL Database Console</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Write and execute standard SQL queries directly against the Al Noor system registry using a built-in SQL compilation layer.
          </p>
        </div>
        
        {/* Tab switchers */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'editor' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            SQL Editor
          </button>
          <button
            onClick={() => setActiveTab('setup-script')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'setup-script' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Supabase Setup SQL
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Schema and templates */}
          <div className="lg:col-span-1 space-y-5">
            {/* Database Explorer */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 font-mono">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Schema Explorer</span>
              </h2>
              
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {schema.map((table, tIdx) => (
                  <div key={tIdx} className="space-y-1.5 pb-2 border-b border-slate-800/60 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono text-blue-300">{table.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight pl-5">{table.description}</p>
                    <div className="pl-5 space-y-0.5 pt-1">
                      {table.columns.map((col, cIdx) => (
                        <div key={cIdx} className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-400">{col.name}</span>
                          <span className="text-slate-600 text-[9px]">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Templates */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
              <h2 className="text-xs font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 font-mono">
                <Code className="w-4 h-4 text-blue-400" />
                <span>Templates</span>
              </h2>
              <div className="space-y-1.5">
                {history.map((hist, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(hist)}
                    className="w-full text-left font-mono text-[10px] bg-slate-950/40 hover:bg-slate-950 hover:border-slate-700 p-2 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-all truncate"
                    title={hist}
                  >
                    {hist}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Code Editor and Results Area */}
          <div className="lg:col-span-3 space-y-5">
            {/* Editor panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Interactive SQL Terminal</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyQueryText}
                    className="p-1.5 bg-slate-900/80 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    title="Copy query text"
                  >
                    {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setQuery('')}
                    className="p-1.5 bg-slate-900/80 hover:bg-rose-500/10 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Clear editor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Textarea editor */}
              <div className="relative font-mono text-sm leading-relaxed">
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="-- Write your SQL query here..."
                  className="w-full min-h-[160px] max-h-[300px] p-4 bg-slate-950 text-emerald-400 focus:outline-none focus:ring-0 placeholder-slate-600 resize-y border-0 font-mono"
                  spellCheck={false}
                />
              </div>

              {/* Action buttons footer */}
              <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-3 flex justify-between items-center gap-4">
                <div className="flex items-center gap-1.5 text-2xs text-slate-500 font-mono">
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                  <span>Write INSERT / UPDATE to modify; SELECT to search.</span>
                </div>
                
                <button
                  onClick={() => handleRunQuery()}
                  disabled={executing || !query.trim()}
                  className={`px-5 py-2 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all cursor-pointer ${
                    executing || !query.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-600/20 active:scale-[0.98]'
                  }`}
                >
                  {executing ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Running Query...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current text-white" />
                      <span>Execute Query (⚡)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Console Log */}
            {(successMsg || error || results) && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400 font-mono flex items-center gap-2">
                    <Table className="w-4 h-4 text-blue-400" />
                    <span>Query Results Console</span>
                  </h3>
                  
                  {results && results.length > 0 && (
                    <button
                      onClick={handleExportCSV}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-2xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>

                {/* Info / Alert messages */}
                {error && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs leading-relaxed font-mono">
                    <strong>[SQL Engine Error]:</strong> {error}
                  </div>
                )}

                {successMsg && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs leading-relaxed">
                    <div className="font-mono font-bold">[Success Output]:</div>
                    <div className="mt-1 font-sans text-slate-300 text-2xs leading-normal">{successMsg}</div>
                  </div>
                )}

                {/* Table Data */}
                {results && renderResultTable()}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Setup / Migration instruction view */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-5 justify-between items-start">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <span>Supabase Database Schema Setup</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                If you see warning logs about missing remote Supabase tables (e.g., <code>public.capacity_categories</code> or <code>public.special_standby_ledger</code>), paste this migration script directly inside your <strong>Supabase SQL Editor</strong> to automatically construct the tables and pre-populate them with official Saudi transport data!
              </p>
            </div>
            <button
              onClick={copyMigrationScript}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              {copiedMigration ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Migration Script Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-white" />
                  <span>Copy SQL Setup Script</span>
                </>
              )}
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-400 leading-relaxed max-h-[460px] overflow-y-auto">
            <div className="text-slate-500 select-none pb-2 border-b border-slate-800 mb-2">-- AL NOOR TRANSPORTATION - SUPABASE DATABASE MIGRATION SCRIPT</div>
            <pre className="text-emerald-500 font-mono">
{`-- Create Capacity Application Categories Table
CREATE TABLE IF NOT EXISTS public.capacity_categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    min_capacity INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Special Standby / Exception Ledger Table
CREATE TABLE IF NOT EXISTS public.special_standby_ledger (
    id SERIAL PRIMARY KEY,
    sn TEXT UNIQUE NOT NULL,
    product TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.capacity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_standby_ledger ENABLE ROW LEVEL SECURITY;

-- Allow select to everyone
CREATE POLICY "Allow select capacity_categories" ON public.capacity_categories FOR SELECT USING (true);
CREATE POLICY "Allow select special_standby_ledger" ON public.special_standby_ledger FOR SELECT USING (true);

-- Allow full write to authenticated managers/admins
CREATE POLICY "Allow write capacity_categories for admins" ON public.capacity_categories
    FOR ALL USING (public.is_active_user() AND public.get_current_user_role() IN ('super_admin', 'admin', 'manager'));

CREATE POLICY "Allow write special_standby_ledger for admins" ON public.special_standby_ledger
    FOR ALL USING (public.is_active_user() AND public.get_current_user_role() IN ('super_admin', 'admin', 'manager', 'staff'));

-- Pre-seed initial default categories
INSERT INTO public.capacity_categories (name, min_capacity, max_capacity)
VALUES 
('DAYNA', 5000, 12000),
('SIX', 14000, 22000),
('TN-2', 30000, 42000)
ON CONFLICT (name) DO NOTHING;

-- Pre-seed initial default special standby ledger entries
INSERT INTO public.special_standby_ledger (sn, product, capacity, status)
VALUES 
('275747', 'PETROL', 36000, 'NOT USE'),
('275749', 'PETROL', 36000, 'NOT USE'),
('277068', 'DIESEL', 36000, 'NOT USE'),
('277038', 'DIESEL', 36000, 'NOT USE'),
('277039', 'DIESEL', 36000, 'NOT USE'),
('273521', 'PETROL', 36000, 'SAIF CUSTODY'),
('276948', 'FUEL OIL', 36000, 'NOT USE'),
('156776', 'PETROL', 36000, 'FOR UPDATES'),
('269866', 'DIESEL', 36000, 'IN WORKSHOP'),
('272549', 'PETROL', 36000, 'IN WORKSHOP')
ON CONFLICT (sn) DO NOTHING;`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
