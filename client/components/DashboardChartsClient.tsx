"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

export interface ActivityPoint { day: string; visitors: number }
export interface InterestPoint { name: string; value: number; color: string }

type FlexibleRecord = Record<string, any>;

interface DashboardChartsClientProps {
  activityData: ActivityPoint[] | FlexibleRecord[];
  interestData: InterestPoint[] | FlexibleRecord[];
}

export default function DashboardChartsClient({ activityData, interestData }: DashboardChartsClientProps) {
  return (
    <>
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Activity Graph (Daily Footfall)</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData as any}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip contentStyle={{ background: "#fff", borderRadius: "8px" }} />
                <Bar dataKey="visitors" fill="#8B9F7E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">Interest by Category</h2>
            <a href="/admin/categories" className="text-sm text-blue-600 hover:text-blue-800">See Details</a>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={interestData as any} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {(interestData as any[]).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-2">Top Category</p>
            {(() => {
              const data = (interestData as any[]);
              if (!data || data.length === 0) return <p className="text-gray-500">No data</p>;
              const top = data.reduce((a, b) => (a.value > b.value ? a : b));
              return (
                <p className="text-3xl font-bold text-gray-900">{top.name} ({top.value}%)</p>
              );
            })()}
          </div>
          <div className="mt-4 space-y-2">
            {interestData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}


