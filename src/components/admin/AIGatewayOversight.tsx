import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemStats } from '@/hooks/useSystemAdmin';
import {
  Brain, Zap, DollarSign, Clock, BarChart3, TrendingUp, AlertTriangle,
  Activity, Shield, Settings, Server, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

const MODEL_USAGE = [
  { model: 'gemini-3-flash', requests: 12847, tokens: 4520000, cost: 45.20, color: '#3b82f6' },
  { model: 'gemini-2.5-flash', requests: 8234, tokens: 2890000, cost: 28.90, color: '#8b5cf6' },
  { model: 'gemini-2.5-pro', requests: 3421, tokens: 6200000, cost: 186.00, color: '#f59e0b' },
  { model: 'gpt-5-mini', requests: 2156, tokens: 1540000, cost: 46.20, color: '#10b981' },
  { model: 'gpt-5', requests: 891, tokens: 2100000, cost: 126.00, color: '#ef4444' },
];

const DAILY_USAGE = Array.from({ length: 14 }, (_, i) => ({
  date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  requests: Math.floor(1500 + Math.random() * 3000),
  tokens: Math.floor(500000 + Math.random() * 2000000),
  cost: parseFloat((15 + Math.random() * 60).toFixed(2)),
}));

const TOP_CONSUMERS = [
  { org: 'Hope Foundation', requests: 5420, cost: 162.60, model: 'gemini-2.5-pro' },
  { org: 'Children First Kenya', requests: 4210, cost: 42.10, model: 'gemini-3-flash' },
  { org: 'Youth Empowerment', requests: 3890, cost: 38.90, model: 'gemini-2.5-flash' },
  { org: 'Rural Health Initiative', requests: 2740, cost: 82.20, model: 'gpt-5-mini' },
  { org: 'Education Alliance', requests: 2100, cost: 21.00, model: 'gemini-3-flash' },
];

const RATE_LIMIT_EVENTS = [
  { org: 'Hope Foundation', count: 12, lastAt: '2 hours ago', status: 'warning' },
  { org: 'Test Org Beta', count: 48, lastAt: '30 min ago', status: 'critical' },
  { org: 'Dev Sandbox', count: 6, lastAt: '1 day ago', status: 'info' },
];

export function AIGatewayOversight() {
  const [activeView, setActiveView] = useState<'usage' | 'models' | 'limits' | 'config'>('usage');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [defaultModel, setDefaultModel] = useState('google/gemini-3-flash-preview');
  const [globalRateLimit, setGlobalRateLimit] = useState(60);
  const [maxTokensPerRequest, setMaxTokensPerRequest] = useState(4096);

  const totalRequests = MODEL_USAGE.reduce((sum, m) => sum + m.requests, 0);
  const totalTokens = MODEL_USAGE.reduce((sum, m) => sum + m.tokens, 0);
  const totalCost = MODEL_USAGE.reduce((sum, m) => sum + m.cost, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">AI Gateway Oversight</h2>
          <p className="text-sm text-slate-400">Monitor Lovable AI usage, costs, and rate limits across all tenants</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${aiEnabled ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className={`h-2 w-2 rounded-full ${aiEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className={`text-xs ${aiEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
              {aiEnabled ? 'AI Gateway Active' : 'AI Gateway Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: Zap, accent: 'text-blue-400' },
          { label: 'Total Tokens', value: `${(totalTokens / 1000000).toFixed(1)}M`, icon: Cpu, accent: 'text-purple-400' },
          { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, icon: DollarSign, accent: 'text-emerald-400' },
          { label: 'Avg Latency', value: '340ms', icon: Clock, accent: 'text-amber-400' },
          { label: 'Rate Limit Hits', value: RATE_LIMIT_EVENTS.reduce((s, e) => s + e.count, 0), icon: AlertTriangle, accent: 'text-red-400' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">{label}</span>
              <Icon className={`h-4 w-4 ${accent}`} />
            </div>
            <div className="text-xl font-bold text-slate-100 font-mono">{value}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'usage', label: 'Usage Analytics', icon: BarChart3 },
          { key: 'models', label: 'Model Distribution', icon: Brain },
          { key: 'limits', label: 'Rate Limits', icon: Shield },
          { key: 'config', label: 'Configuration', icon: Settings },
        ].map(({ key, label, icon: Icon }) => (
          <Button key={key} variant={activeView === key ? 'default' : 'outline'} size="sm"
            onClick={() => setActiveView(key as any)}
            className={activeView === key
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
              : 'border-slate-600 text-slate-400 hover:bg-slate-700'
            }>
            <Icon className="h-4 w-4 mr-1" /> {label}
          </Button>
        ))}
      </div>

      {activeView === 'usage' && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100 text-sm">Daily AI Requests & Cost (14 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={DAILY_USAGE}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="requests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Requests" />
                  <Area yAxisId="right" type="monotone" dataKey="cost" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Cost ($)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100 text-sm">Top Consumers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {TOP_CONSUMERS.map((org, i) => (
                <div key={org.org} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                  <span className="text-xs font-mono text-slate-500 w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{org.org}</div>
                    <div className="text-xs text-slate-500">{org.requests.toLocaleString()} req · {org.model}</div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs font-mono">${org.cost}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'models' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100 text-sm">Request Distribution by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={MODEL_USAGE} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="requests" nameKey="model" stroke="none">
                    {MODEL_USAGE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-slate-100 text-sm">Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={MODEL_USAGE} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="model" stroke="#64748b" fontSize={11} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }}
                    formatter={(value: number) => [`$${value}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'limits' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-sm">Rate Limit Events</CardTitle>
            <CardDescription className="text-slate-400">Organizations hitting rate limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RATE_LIMIT_EVENTS.map(event => (
                <div key={event.org} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${event.status === 'critical' ? 'text-red-400' : event.status === 'warning' ? 'text-amber-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-sm text-slate-200">{event.org}</div>
                      <div className="text-xs text-slate-500">{event.count} hits · Last: {event.lastAt}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={
                    event.status === 'critical' ? 'border-red-500/30 text-red-400' :
                    event.status === 'warning' ? 'border-amber-500/30 text-amber-400' :
                    'border-slate-500/30 text-slate-400'
                  }>
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeView === 'config' && (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-slate-100 text-sm">AI Gateway Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-600/30 bg-slate-700/20">
              <div>
                <div className="text-sm font-medium text-slate-200">Enable AI Gateway</div>
                <div className="text-xs text-slate-400">Toggle AI features platform-wide</div>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Default Model</label>
                <Select value={defaultModel} onValueChange={setDefaultModel}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Default)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                    <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Global Rate Limit (req/min)</label>
                <Input type="number" value={globalRateLimit} onChange={e => setGlobalRateLimit(parseInt(e.target.value))}
                  className="bg-slate-700/50 border-slate-600 text-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">Max Tokens per Request</label>
                <Input type="number" value={maxTokensPerRequest} onChange={e => setMaxTokensPerRequest(parseInt(e.target.value))}
                  className="bg-slate-700/50 border-slate-600 text-slate-200" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
