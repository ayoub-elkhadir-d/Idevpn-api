import { useEffect, useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Globe2, MoreHorizontal, Radio, Server, Users } from "lucide-react";
import { api, type DashboardData } from "../api/client";

const statIcons = [Radio, Server, Users, Activity];
const statColors = ["purple", "blue", "green", "orange"];

function UsageChart({ points }: { points: number[] }) {
  const width = 720;
  const height = 220;
  const coordinates = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - (point / 100) * (height - 20) - 10;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height} ${coordinates} ${width},${height}`;

  return (
    <div className="chart-wrap">
      <div className="chart-y-labels"><span>80k</span><span>60k</span><span>40k</span><span>20k</span></div>
      <div className="chart-main">
        <div className="chart-grid-lines"><i /><i /><i /><i /></div>
        <svg className="usage-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Network traffic trend over the last 12 hours">
          <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#8b7bff" stopOpacity=".24" /><stop offset="100%" stopColor="#8b7bff" stopOpacity="0" /></linearGradient></defs>
          <polygon points={area} fill="url(#chartFill)" />
          <polyline points={coordinates} fill="none" stroke="#9587ff" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((point, index) => index === points.length - 2 && <circle key={index} cx={(index / (points.length - 1)) * width} cy={height - (point / 100) * (height - 20) - 10} r="5" fill="#9587ff" stroke="#151925" strokeWidth="3" vectorEffect="non-scaling-stroke" />)}
        </svg>
        <div className="chart-x-labels"><span>12:00 AM</span><span>2:00 AM</span><span>4:00 AM</span><span>6:00 AM</span><span>8:00 AM</span><span>10:00 AM</span><span>12:00 PM</span></div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load dashboard."));
  }, []);

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line" /> OVERVIEW</div><h1>Good morning<span className="text-accent">.</span></h1><p>Here’s what’s happening across your network today.</p></div>
        <button className="date-filter"><span className="date-dot" /> Last 24 hours <span className="date-chevron">⌄</span></button>
      </div>

      {error && <div className="form-error mb-5" role="alert">{error}</div>}
      <div className="stats-grid">
        {(data?.stats ?? [
          { label: "Active configurations", value: "—", change: "Loading", tone: "neutral" as const },
          { label: "Online servers", value: "—", change: "Loading", tone: "neutral" as const },
          { label: "Connected users", value: "—", change: "Loading", tone: "neutral" as const },
          { label: "Bandwidth this month", value: "—", change: "Loading", tone: "neutral" as const }
        ]).map((stat, index) => {
          const Icon = statIcons[index];
          return <div className="stat-card" key={stat.label}>
            <div className="flex items-start justify-between"><div className={`stat-icon ${statColors[index]}`}><Icon size={17} strokeWidth={1.8} /></div><button className="subtle-icon" aria-label={`More about ${stat.label}`}><MoreHorizontal size={18} /></button></div>
            <div className="mt-5 text-[12px] text-muted">{stat.label}</div>
            <div className="mt-1 flex items-end justify-between gap-2"><div className="stat-value">{stat.value}</div><div className={`stat-change ${stat.tone}`}><ArrowUpRight size={13} />{stat.change}</div></div>
          </div>;
        })}
      </div>

      <div className="dashboard-grid">
        <section className="panel traffic-panel">
          <div className="panel-heading"><div><div className="panel-title">Network traffic</div><div className="panel-subtitle">Total bandwidth used across all servers</div></div><button className="select-small">Today <span>⌄</span></button></div>
          <div className="traffic-summary"><span className="traffic-total">42.8 <small>TB</small></span><span className="traffic-compare"><ArrowUpRight size={13} /> 8.4% <span>vs. last period</span></span></div>
          <UsageChart points={data?.chart ?? [24, 31, 28, 42, 37, 49, 45, 59, 52, 68, 61, 76]} />
        </section>
        <section className="panel regions-panel">
          <div className="panel-heading"><div><div className="panel-title">Server regions</div><div className="panel-subtitle">Live network coverage</div></div><button className="subtle-icon" aria-label="More server region options"><MoreHorizontal size={18} /></button></div>
          <div className="world-map"><Globe2 size={112} strokeWidth={0.65} /><div className="map-pulse pulse-a" /><div className="map-pulse pulse-b" /><div className="map-pulse pulse-c" /></div>
          <div className="region-row"><div><span className="region-flag">🇺🇸</span><span>North America</span></div><strong>12 <small>servers</small></strong></div>
          <div className="region-row"><div><span className="region-flag">🇪🇺</span><span>Europe</span></div><strong>9 <small>servers</small></strong></div>
          <div className="region-row"><div><span className="region-flag">🌏</span><span>Asia Pacific</span></div><strong>7 <small>servers</small></strong></div>
        </section>
      </div>

      <section className="panel activity-panel">
        <div className="panel-heading"><div><div className="panel-title">Recent activity</div><div className="panel-subtitle">The latest changes across your infrastructure</div></div><button className="view-all">View logs <ArrowRight size={14} /></button></div>
        <div className="activity-list">
          {(data?.recentActivity ?? []).map((item) => <div className="activity-row" key={item.id}>
            <div className={`activity-symbol ${item.status}`}>{item.status === "warning" ? <ArrowDownRight size={14} /> : item.status === "info" ? <Radio size={14} /> : <Server size={14} />}</div>
            <div className="min-w-0 flex-1"><div className="activity-title">{item.title}</div><div className="activity-detail">{item.detail}</div></div>
            <span className="activity-time">{item.time}</span>
          </div>)}
          {!data && !error && <div className="activity-row text-[12px] text-muted">Loading recent activity…</div>}
        </div>
      </section>
      <div className="dashboard-note"><span className="note-icon"><Activity size={14} /></span> Metrics refresh automatically <span className="note-separator">·</span> Last updated just now</div>
    </div>
  );
}
