"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FolderGit2, Github, ExternalLink, Star } from "lucide-react";

export default function StudentProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects || []);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Student Projects Portfolio"
        subtitle="Capstone projects, software repositories, hardware prototypes, and faculty evaluation logs"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Showcased Projects</h2>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No Projects Available"
            description="No projects have been added."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map((p) => (
              <div key={p.id} className="ui-card p-6 space-y-3 relative flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={p.projectType === "HARDWARE" ? "warning" : "purple"}>
                      {p.projectType || "SOFTWARE"}
                    </Badge>
                    <Badge variant="info">{p.completionStatus || "COMPLETED"}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">{p.description}</p>

                  {p.techStack && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {p.techStack.split(",").map((tech: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-indigo-600 dark:text-indigo-300 font-mono">
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-slate-500">Advisor: {p.guideName || "N/A"}</span>
                  <div className="flex items-center gap-3">
                    {p.githubUrl && (
                      <a href={p.githubUrl} target="_blank" className="text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-semibold">
                        <Github className="w-4 h-4" /> Code
                      </a>
                    )}
                    {p.liveUrl && (
                      <a href={p.liveUrl} target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                        <ExternalLink className="w-4 h-4" /> Live Demo
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
