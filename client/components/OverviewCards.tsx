import React from "react";

export interface OverviewStat {
  title: string;
  value: string;
  change: string;
  lastMonth: string;
  icon?: React.ReactNode;
}

interface OverviewCardsProps {
  stats: OverviewStat[];
}

export default function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-150"
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-600 text-sm mb-2">{stat.title}</p>
              <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-lg">{stat.icon ?? "\u2197"}</div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`${stat.change.includes("+") ? "text-green-600" : "text-red-600"} font-medium`}
            >
              {stat.change}
            </span>
            <span className="text-gray-500">{stat.lastMonth}</span>
          </div>
        </div>
      ))}
    </section>
  );
}


