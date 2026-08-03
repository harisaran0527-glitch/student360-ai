"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Award, Plus, Trophy } from "lucide-react";

export default function StudentAchievementsPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Hackathon",
    eventName: "",
    organizer: "",
    position: "First Place",
    date: new Date().toISOString().split("T")[0],
  });

  const fetchAchievements = async () => {
    const res = await fetch("/api/achievements");
    const data = await res.json();
    setAchievements(data.achievements || []);
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to add achievement");
      setIsModalOpen(false);
      fetchAchievements();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Co-Curricular Achievements & Awards"
        subtitle="Hackathons, research paper publications, coding contests, and sports accolades"
      />

      <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">My Academic & Extra-Curricular Badges</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Achievement</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {achievements.map((a) => (
            <div key={a.id} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="purple">{a.category}</Badge>
                <Badge variant="success">{a.position}</Badge>
              </div>
              <h3 className="text-base font-bold text-white">{a.title}</h3>
              <p className="text-xs text-slate-400">Organized by: <span className="text-indigo-300 font-semibold">{a.organizer}</span> ({a.eventName})</p>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Co-Curricular Achievement" maxWidth="md">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Achievement Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              placeholder="e.g. Winner - National AI Hackathon 2026"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-1">Event Name & Organizer *</label>
            <input
              type="text"
              required
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value, eventName: e.target.value })}
              className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
              placeholder="e.g. IIT Madras Techfest"
            />
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl">
              Save Achievement
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
