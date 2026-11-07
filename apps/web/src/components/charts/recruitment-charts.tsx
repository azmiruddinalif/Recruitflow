'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface FunnelChartItem {
  stage: string;
  count: number;
  fill?: string;
}

export interface VelocityChartItem {
  month: string;
  applications: number;
  interviews: number;
  hired: number;
}

export interface SourceChartItem {
  source: string;
  candidates: number;
  hires: number;
}

const STAGE_COLORS = [
  '#64748B',
  '#4F46E5',
  '#0EA5E9',
  '#2563EB',
  '#D97706',
  '#7C3AED',
  '#15803D',
];

export function RecruitmentFunnelChart({ data }: { data: FunnelChartItem[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]} barSize={36}>
            {data.map((entry, idx) => (
              <Cell
                key={entry.stage}
                fill={entry.fill || STAGE_COLORS[idx % STAGE_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HiringVelocityChart({ data }: { data: VelocityChartItem[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={{ stroke: '#E2E8F0' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area
            type="monotone"
            dataKey="applications"
            name="Applications"
            stroke="#4F46E5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorApps)"
          />
          <Area
            type="monotone"
            dataKey="interviews"
            name="Interviews"
            stroke="#0EA5E9"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInterviews)"
          />
          <Area
            type="monotone"
            dataKey="hired"
            name="Hires"
            stroke="#15803D"
            strokeWidth={2}
            fillOpacity={0.08}
            fill="#15803D"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBreakdownChart({ data }: { data: SourceChartItem[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} />
          <YAxis
            dataKey="source"
            type="category"
            width={110}
            tick={{ fontSize: 12, fill: '#475569' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="candidates" name="Total Candidates" fill="#4F46E5" radius={[0, 4, 4, 0]} />
          <Bar dataKey="hires" name="Hired" fill="#15803D" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
