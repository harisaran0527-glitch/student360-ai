"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/dashboard/Header";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  MessageSquareText,
  Plus,
  Sparkles,
  CheckCircle2,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Award,
  FileCheck,
} from "lucide-react";

export default function StudentPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [postForm, setPostForm] = useState({
    title: "",
    content: "",
    category: "Hackathon Win",
    skills: "",
  });

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts?status=PUBLISHED");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      console.error("Failed to load posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit post");

      alert("Institutional activity post submitted for faculty moderation review.");
      setIsPostModalOpen(false);
      setPostForm({ title: "", content: "", category: "Hackathon Win", skills: "" });
      fetchPosts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Header
        title="Institutional Campus Portfolio Feed"
        subtitle="Showcase verified hackathon wins, course certifications & academic milestone posts"
      />

      <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
        {/* Create Post Action Banner */}
        <div className="ui-card p-6 border-l-4 border-l-indigo-600 bg-gradient-to-r from-indigo-50/50 dark:from-indigo-950/30 to-slate-50 dark:to-slate-900 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Official Campus Achievement Showcase
            </span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              Share Your Verified Co-Curricular & Project Milestones
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Posts pass faculty moderation to appear on the official institutional student dossier feed.
            </p>
          </div>

          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Create Activity Post</span>
          </button>
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            title="No Published Activity Posts Yet"
            description="Be the first student to publish your verified achievement post on the institutional feed!"
          />
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="ui-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base">
                      {post.user?.fullName?.[0] || "S"}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        {post.user?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Dept: {post.student?.department?.code || "CS"} | Reg: {post.student?.registerNo || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="purple">{post.category}</Badge>
                    <Badge variant="success">★ Verified Institutional Post</Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {post.skills && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.skills.split(",").map((s: string) => (
                        <span key={s} className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[10px] border border-indigo-200 dark:border-indigo-800">
                          #{s.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 hover:text-rose-600 cursor-pointer">
                      <Heart className="w-4 h-4" /> {post.likesCount || 0} Likes
                    </span>
                    <span className="flex items-center gap-1 hover:text-indigo-600 cursor-pointer">
                      <MessageCircle className="w-4 h-4" /> {post.comments?.length || 0} Comments
                    </span>
                  </div>
                  <span className="text-[10px] font-mono">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Activity Post Modal */}
      <Modal isOpen={isPostModalOpen} onClose={() => setIsPostModalOpen(false)} title="Create Institutional Activity Post" maxWidth="lg">
        <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Post Headline *</label>
            <input
              type="text"
              required
              value={postForm.title}
              onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
              placeholder="e.g. Won 2nd Prize at National Level Hackathon 2026!"
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category *</label>
            <select
              value={postForm.category}
              onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
              className="ui-input w-full p-2 font-semibold"
            >
              <option value="Hackathon Win">Hackathon Win</option>
              <option value="Certification Complete">Certification Complete</option>
              <option value="Internship Milestone">Internship Milestone</option>
              <option value="Paper Presentation">Paper Presentation</option>
              <option value="Project Expo">Project Expo</option>
              <option value="Sports / Cultural">Sports / Cultural</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Activity Description *</label>
            <textarea
              required
              rows={4}
              value={postForm.content}
              onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
              placeholder="Describe your achievement, key learning, or project details..."
              className="ui-input w-full p-2"
            />
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Skills & Tags</label>
            <input
              type="text"
              value={postForm.skills}
              onChange={(e) => setPostForm({ ...postForm, skills: e.target.value })}
              placeholder="e.g. React, Nextjs, AI, MachineLearning"
              className="ui-input w-full p-2"
            />
          </div>

          <div className="pt-3 border-t flex justify-end gap-2">
            <button type="button" onClick={() => setIsPostModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-semibold">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md">
              {submitting ? "Submitting..." : "Submit for Moderation"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
