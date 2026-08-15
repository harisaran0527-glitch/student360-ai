"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/dashboard/Header";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Bus,
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  UserCheck,
  MapPin,
  Navigation,
} from "lucide-react";

interface StudentOption {
  id: string;
  fullName: string;
  registerNo: string;
  rollNo: string;
  residenceType?: string;
}

interface BusRecordItem {
  id: string;
  studentId: string;
  resident: string;
  busNo: string;
  route: string;
  boardingPoint: string;
  createdAt: string;
  updatedAt: string;
  student: StudentOption;
}

export default function AdminBusManagementPage() {
  const [busRecords, setBusRecords] = useState<BusRecordItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Server-side Pagination & Filter State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [uniqueBusNos, setUniqueBusNos] = useState<string[]>([]);
  const [uniqueRoutes, setUniqueRoutes] = useState<string[]>([]);
  const [uniqueBoardingPoints, setUniqueBoardingPoints] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBusNoFilter, setSelectedBusNoFilter] = useState<string>("ALL");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("ALL");
  const [selectedBoardingFilter, setSelectedBoardingFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<BusRecordItem | null>(null);

  // Form State - Starts completely empty as per guidelines
  const [formStudentId, setFormStudentId] = useState<string>("");
  const [formResident, setFormResident] = useState<string>("");
  const [formBusNo, setFormBusNo] = useState<string>("");
  const [formRoute, setFormRoute] = useState<string>("");
  const [formBoardingPoint, setFormBoardingPoint] = useState<string>("");

  // Modal student search
  const [modalStudentSearch, setModalStudentSearch] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fetch Bus Records with server-side filters and pagination
  const fetchBusRecords = async (page = 1) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "10",
        search: searchQuery,
        busNo: selectedBusNoFilter,
        route: selectedRouteFilter,
        boardingPoint: selectedBoardingFilter,
      });
      const res = await fetch(`/api/bus?${query.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Failed to load bus records");
      
      const payload = data.data || data;
      setBusRecords(payload.busRecords || []);
      setTotalPages(payload.totalPages || 1);
      setTotalCount(payload.total || 0);
      setCurrentPage(page);

      // Set filter dropdown options computed dynamically by the server
      setUniqueBusNos(payload.uniqueBusNos || []);
      setUniqueRoutes(payload.uniqueRoutes || []);
      setUniqueBoardingPoints(payload.uniqueBoardingPoints || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load bus records");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Students for dropdown
  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students?limit=500");
      const data = await res.json();
      const list = data.data?.students || data.students || [];
      setStudents(list);
    } catch (err) {
      console.error("Failed to load students list", err);
    }
  };

  // Sequential loading helper on initial mount to respect connection_limit=1
  const loadInitialData = async () => {
    setLoading(true);
    await fetchBusRecords(1);
    await fetchStudents();
    setLoading(false);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounced search/filter trigger to prevent query storms
  useEffect(() => {
    if (loading) return; // skip initial mount
    const handler = setTimeout(() => {
      fetchBusRecords(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedBusNoFilter, selectedRouteFilter, selectedBoardingFilter]);

  // Rename variables to keep downstream rendering functional
  const filteredRecords = busRecords;

  // Filter students for modal dropdown
  const filteredStudentsForModal = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.toLowerCase().trim();
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.registerNo?.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q)
    );
  }, [students, modalStudentSearch]);

  // Open modal for creating
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setFormStudentId("");
    setFormResident("");
    setFormBusNo("");
    setFormRoute("");
    setFormBoardingPoint("");
    setModalStudentSearch("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (rec: BusRecordItem) => {
    setEditingRecord(rec);
    setFormStudentId(rec.studentId);
    setFormResident(rec.resident);
    setFormBusNo(rec.busNo);
    setFormRoute(rec.route);
    setFormBoardingPoint(rec.boardingPoint);
    setModalStudentSearch("");
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId || !formResident || !formBusNo || !formRoute || !formBoardingPoint) {
      alert("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingRecord) {
        // Edit record
        const res = await fetch(`/api/bus/${editingRecord.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resident: formResident,
            busNo: formBusNo,
            route: formRoute,
            boardingPoint: formBoardingPoint,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Update failed");
        alert("Bus record updated successfully!");
      } else {
        // Add record
        const res = await fetch("/api/bus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: formStudentId,
            resident: formResident,
            busNo: formBusNo,
            route: formRoute,
            boardingPoint: formBoardingPoint,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Creation failed");
        alert("Bus record created successfully!");
      }

      setIsModalOpen(false);
      fetchBusRecords();
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Permanent Delete Bus Record
  const handleDelete = async (id: string, studentName: string) => {
    if (!confirm(`Are you sure you want to permanently delete the bus record for ${studentName}?\nThis action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/bus/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || "Delete failed");
      alert("Bus record permanently deleted!");
      fetchBusRecords();
    } catch (err: any) {
      alert(err.message || "Failed to delete bus record");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Header
        title="Bus Management"
        subtitle="Manage Institutional Transport Allocations & Routes"
      />

      <main className="flex-1 p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Top Control Panel */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Transport Records Directory</h2>
              <p className="text-xs text-slate-400">
                Total Bus Allotments: <span className="text-indigo-400 font-bold">{busRecords.length}</span>
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bus Record</span>
          </button>
        </div>

        {/* Search & Filters Bar */}
        <div className="glass-card p-4 rounded-2xl border border-slate-800 bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Search by Student Name or Register No */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search Student Name / Reg No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter by Bus No */}
          <div>
            <select
              value={selectedBusNoFilter}
              onChange={(e) => setSelectedBusNoFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Bus Numbers</option>
              {uniqueBusNos.map((bNo) => (
                <option key={bNo} value={bNo}>
                  Bus No: {bNo}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Route */}
          <div>
            <select
              value={selectedRouteFilter}
              onChange={(e) => setSelectedRouteFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Routes</option>
              {uniqueRoutes.map((rt) => (
                <option key={rt} value={rt}>
                  Route: {rt}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Boarding Point */}
          <div>
            <select
              value={selectedBoardingFilter}
              onChange={(e) => setSelectedBoardingFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Boarding Points</option>
              {uniqueBoardingPoints.map((bp) => (
                <option key={bp} value={bp}>
                  Boarding: {bp}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60">
          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full bg-slate-800/60 rounded-xl" />
              <Skeleton className="h-12 w-full bg-slate-800/40 rounded-xl" />
              <Skeleton className="h-12 w-full bg-slate-800/40 rounded-xl" />
              <Skeleton className="h-12 w-full bg-slate-800/40 rounded-xl" />
            </div>
          ) : errorMsg ? (
            <div className="p-8 text-center text-xs text-rose-400">
              <p>{errorMsg}</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12">
              <EmptyState
                title="No Bus Records Found"
                description={
                  searchQuery || selectedBusNoFilter !== "ALL" || selectedRouteFilter !== "ALL" || selectedBoardingFilter !== "ALL"
                    ? "No transport records match the current filter criteria."
                    : "No bus transport details have been created yet. Click '+ Add Bus Record' to add one."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Resident</th>
                    <th className="py-3.5 px-4">BusNo</th>
                    <th className="py-3.5 px-4">Route</th>
                    <th className="py-3.5 px-4">Boarding Point</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{rec.student?.fullName || "N/A"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Reg: {rec.student?.registerNo || "N/A"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {rec.resident}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-400">
                        {rec.busNo}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {rec.route}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {rec.boardingPoint}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            title="Edit Bus Record"
                            className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec.id, rec.student?.fullName || "Student")}
                            title="Permanent Delete"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/40 text-xs">
                  <div className="text-slate-400">
                    Showing page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span> ({totalCount} total records)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fetchBusRecords(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-50 disabled:hover:text-slate-300 transition"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchBusRecords(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white disabled:opacity-50 disabled:hover:text-slate-300 transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Bus Record Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? "Edit Bus Record" : "Add Bus Record"}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Student Name & Register No selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Student Name *
            </label>
            {editingRecord ? (
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold">
                {editingRecord.student?.fullName} ({editingRecord.student?.registerNo})
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search student by name or reg no..."
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <select
                  required
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Student</option>
                  {filteredStudentsForModal.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.registerNo})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Resident Dropdown */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Resident *
            </label>
            <select
              required
              value={formResident}
              onChange={(e) => setFormResident(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select Resident Type</option>
              <option value="Day Scholar">Day Scholar</option>
              <option value="Hosteller">Hosteller</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* BusNo Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              BusNo *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bus 12, B-04"
              value={formBusNo}
              onChange={(e) => setFormBusNo(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Route Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Route *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tambaram - Campus, Gandhipuram Route"
              value={formRoute}
              onChange={(e) => setFormRoute(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Boarding Point Input */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Boarding Point *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chromepet Signal, Crosscut Road"
              value={formBoardingPoint}
              onChange={(e) => setFormBoardingPoint(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold shadow-md transition"
            >
              {submitting ? "Saving..." : editingRecord ? "Save Changes" : "Create Bus Record"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
