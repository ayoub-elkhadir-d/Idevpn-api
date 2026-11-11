import { ArrowUpRight, Plus, Search, SlidersHorizontal } from "lucide-react";

export function SectionPage({ section }: { section: string }) {
  return (
    <div className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> INFRASTRUCTURE</div><h1>{section}<span className="text-accent">.</span></h1><p>Manage and monitor your {section.toLowerCase()} across the network.</p></div></div>
      <div className="stats-grid section-stats">
        <div className="stat-card"><div className="section-stat-label">Total {section.toLowerCase()}<span className="stat-icon purple"><SlidersHorizontal size={17} /></span></div><div className="section-stat-value">—</div><div className="section-stat-hint">Ready for integration</div></div>
        <div className="stat-card"><div className="section-stat-label">Active<span className="stat-icon green"><ArrowUpRight size={17} /></span></div><div className="section-stat-value">—</div><div className="section-stat-hint">Live data will appear here</div></div>
      </div>
      <section className="panel section-empty">
        <div className="section-empty-icon"><SlidersHorizontal size={20} /></div>
        <div className="panel-title mt-5">{section} management is ready to build</div>
        <p className="mt-2 max-w-md text-[12px] leading-6 text-muted">This protected workspace is scaffolded for the next integration phase. Connect your infrastructure APIs to manage {section.toLowerCase()} here.</p>
        <div className="mt-6 flex items-center gap-3">
          <button className="select-small"><Search size={14} /> Search</button>
          <button className="select-small"><SlidersHorizontal size={14} /> Filters</button>
          <button className="select-small ml-auto"><Plus size={14} /> Add new</button>
        </div>
      </section>
    </div>
  );
}
