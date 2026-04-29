import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Lead } from '../../types';
import { Search, Trash2, Filter, ExternalLink, MessageCircle, MoreVertical, Users } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const leadStatuses = ['New', 'Contacted', 'Interested', 'Ordered', 'Not Ready', 'Follow Up Later'];

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        const leadsRef = collection(db, 'leads');
        const q = query(leadsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
        setLeads(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'leads');
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
      setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l));
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
      setLeads(leads.filter(l => l.id !== leadId));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          l.whatsappNumber.includes(searchTerm) ||
                          l.productInterested.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-serif">Customer Leads</h1>
            <p className="text-brand-grey">Manage and follow up with interested customers.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-6 bg-white shadow-sm space-y-6">
           <div className="flex flex-col lg:flex-row gap-6 items-center">
              <div className="relative flex-grow">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" size={18} />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search by name, phone or product..."
                   className="w-full pl-10 pr-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl text-sm"
                 />
              </div>
              <div className="flex items-center gap-3 w-full lg:w-auto">
                 <Filter size={18} className="text-brand-grey" />
                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="flex-grow lg:w-48 px-4 py-3 bg-brand-ivory border border-brand-champagne/30 rounded-xl text-sm outline-none"
                 >
                    <option value="all">All Statuses</option>
                    {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
           </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden bg-white shadow-sm">
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-brand-mist/50 text-[10px] font-bold uppercase tracking-widest text-brand-grey border-b border-brand-champagne/20">
                    <tr>
                       <th className="px-6 py-4">Customer Details</th>
                       <th className="px-6 py-4">Interest</th>
                       <th className="px-6 py-4">Submission</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-brand-champagne/10">
                    {loading ? (
                       [1, 2, 3, 4, 5].map(i => (
                          <tr key={i} className="animate-pulse">
                             <td colSpan={5} className="px-6 py-10 bg-white/50"></td>
                          </tr>
                       ))
                    ) : filteredLeads.length > 0 ? (
                       filteredLeads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-brand-mist/10">
                             <td className="px-6 py-6">
                                <div className="font-bold text-brand-emerald text-lg">{lead.fullName}</div>
                                <div className="flex items-center gap-2 text-sm text-brand-grey mt-1">
                                   <MessageCircle size={14} className="text-emerald-500" />
                                   {lead.whatsappNumber}
                                </div>
                                <div className="text-[10px] text-brand-grey/60 mt-1 flex items-center gap-1">
                                   <MapPin size={10} /> {lead.location}
                                </div>
                             </td>
                             <td className="px-6 py-6">
                                <span className="inline-block px-3 py-1 bg-brand-gold/10 text-brand-gold rounded-full text-xs font-bold">
                                   {lead.productInterested}
                                </span>
                                <div className="text-[10px] text-brand-grey mt-2 italic font-medium">Source: {lead.sourcePage}</div>
                             </td>
                             <td className="px-6 py-6 text-sm text-brand-grey">
                                {formatDate(lead.createdAt.toDate())}
                             </td>
                             <td className="px-6 py-6">
                                <select 
                                  value={lead.status}
                                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold border-none outline-none cursor-pointer",
                                    lead.status === 'New' ? "bg-emerald-100 text-emerald-700" :
                                    lead.status === 'Contacted' ? "bg-blue-100 text-blue-700" :
                                    lead.status === 'Ordered' ? "bg-brand-gold/20 text-brand-gold" : "bg-gray-100 text-gray-700"
                                  )}
                                >
                                   {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                             </td>
                             <td className="px-6 py-6 text-right">
                                <div className="flex justify-end gap-2">
                                   <a 
                                     href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${lead.fullName}, thank you for your interest in ${lead.productInterested} on EMutex Nig.`)}`}
                                     target="_blank"
                                     className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                                     title="Contact on WhatsApp"
                                   >
                                      <MessageCircle size={18} />
                                   </a>
                                   <button 
                                     onClick={() => handleDeleteLead(lead.id)}
                                     className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                     title="Delete Lead"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))
                    ) : (
                       <tr>
                          <td colSpan={5} className="px-6 py-24 text-center">
                             <div className="flex flex-col items-center gap-4 text-brand-grey">
                                <Users size={48} className="opacity-20" />
                                <p className="italic">No leads matching your criteria.</p>
                             </div>
                          </td>
                       </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function MapPin({ size, className }: { size?: number, className?: string }) {
   return <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
