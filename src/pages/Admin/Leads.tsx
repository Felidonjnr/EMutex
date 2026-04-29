import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import AdminLayout from '../../components/layout/AdminLayout';
import { Lead } from '../../types';
import { Search, Trash2, Filter, MessageCircle, Users, CheckCircle2, ShoppingCart, Clock, Phone, MapPin, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LeadRowSkeleton } from '../../components/Skeleton';

const leadStatuses = ['New', 'Contacted', 'Interested', 'Ordered', 'Not Ready', 'Follow Up Later'];

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const leadsRef = collection(db, 'leads');
    const q = query(leadsRef, orderBy('createdAt', 'desc'));
    
    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      setLeads(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'leads');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `leads/${leadId}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `leads/${leadId}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple toast would be better here, but for now just the action
  };

  const filteredLeads = leads.filter(l => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      l.fullName.toLowerCase().includes(searchLower) || 
      l.whatsappNumber.includes(searchTerm) ||
      l.productInterested.toLowerCase().includes(searchLower) ||
      (l.location && l.location.toLowerCase().includes(searchLower));
    
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-serif text-[#0E3B2E]">Customer Leads</h1>
            <p className="text-brand-grey font-medium">Real-time inquiries and purchase interests.</p>
          </div>
          <div className="flex items-center gap-3 bg-brand-emerald/5 px-4 py-2 rounded-2xl border border-brand-emerald/10">
            <div className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse" />
            <span className="text-xs font-bold text-brand-emerald uppercase tracking-widest">
              Live: {leads.length} Active Leads
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-[28px] shadow-sm border border-brand-champagne/20 space-y-6">
           <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-grow w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold" size={18} />
                 <input 
                   type="text" 
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   placeholder="Search name, phone, product or location..."
                   className="w-full pl-12 pr-6 py-4 bg-brand-ivory/50 border border-brand-champagne/30 rounded-2xl text-sm focus:ring-2 focus:ring-brand-gold/20 outline-none transition-all"
                 />
              </div>
              <div className="flex items-center gap-3 w-full lg:w-72">
                 <Filter size={18} className="text-brand-gold shrink-0" />
                 <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-5 py-4 bg-brand-ivory/50 border border-brand-champagne/30 rounded-2xl text-sm font-bold text-[#0E3B2E] outline-none cursor-pointer"
                 >
                    <option value="all">All Statuses</option>
                    {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
           </div>
           
           <div className="flex flex-wrap gap-2 border-t border-brand-mist/50 pt-4">
              {['all', ...leadStatuses].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === status 
                      ? 'bg-brand-emerald text-white shadow-lg' 
                      : 'bg-brand-mist/30 text-brand-grey hover:bg-brand-mist'
                  }`}
                >
                  {status} ({status === 'all' ? leads.length : leads.filter(l => l.status === status).length})
                </button>
              ))}
           </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-brand-emerald/5 border border-brand-champagne/20">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-[#FAF7F0] text-[10px] font-black uppercase tracking-[0.2em] text-[#0E3B2E] border-b border-brand-champagne/20">
                    <tr>
                       <th className="px-8 py-5">Customer Profile</th>
                       <th className="px-8 py-5">Inquiry Details</th>
                       <th className="px-8 py-5">Timeline</th>
                       <th className="px-8 py-5">Status Stage</th>
                       <th className="px-8 py-5 text-right whitespace-nowrap">Follow Up Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-brand-champagne/10">
                    <AnimatePresence mode="popLayout">
                    {loading ? (
                       [1, 2, 3, 4, 5, 6].map(i => <LeadRowSkeleton key={i} />)
                    ) : filteredLeads.length > 0 ? (
                       filteredLeads.map((lead) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={lead.id} 
                            className="hover:bg-brand-mist/10 transition-colors group"
                          >
                             <td className="px-8 py-7">
                                <div className="space-y-2">
                                  <div className="font-serif text-xl text-[#0E3B2E]">{lead.fullName}</div>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 text-xs font-bold text-brand-emerald group-hover:bg-brand-emerald/5 w-fit rounded-lg px-2 py-0.5 -ml-2 transition-colors">
                                       <Phone size={14} />
                                       {lead.whatsappNumber}
                                       <button onClick={() => copyToClipboard(lead.whatsappNumber)} title="Copy number">
                                          <Copy size={12} className="opacity-40 hover:opacity-100 transition-opacity" />
                                       </button>
                                    </div>
                                    <div className="text-[11px] text-brand-grey font-medium flex items-center gap-1.5 opacity-70">
                                       <MapPin size={12} className="text-brand-gold" /> {lead.location}
                                    </div>
                                  </div>
                                </div>
                             </td>
                             <td className="px-8 py-7">
                                <div className="space-y-3">
                                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-gold/5 text-brand-gold rounded-xl border border-brand-gold/10 shadow-sm">
                                     <ShoppingCart size={14} />
                                     <span className="text-[11px] font-black uppercase tracking-widest">{lead.productInterested}</span>
                                  </div>
                                  <div className="text-[10px] text-brand-grey font-bold flex items-center gap-1.5 opacity-60">
                                    <ExternalLink size={10} /> Origin: {lead.sourcePage}
                                  </div>
                                </div>
                             </td>
                             <td className="px-8 py-7">
                                <div className="flex items-center gap-2 text-xs font-medium text-brand-grey">
                                  <Clock size={14} className="text-brand-gold opacity-60" />
                                  {formatDate(lead.createdAt?.toDate())}
                                </div>
                             </td>
                             <td className="px-8 py-7">
                                <select 
                                  value={lead.status}
                                  onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer shadow-sm transition-all hover:scale-105",
                                    lead.status === 'New' ? "bg-emerald-500 text-white" :
                                    lead.status === 'Contacted' ? "bg-blue-500 text-white" :
                                    lead.status === 'Ordered' ? "bg-brand-gold text-[#0E3B2E]" : "bg-brand-mist/50 text-[#0E3B2E]"
                                  )}
                                >
                                   {leadStatuses.map(s => <option key={s} value={s} className="bg-white text-[#0E3B2E]">{s}</option>)}
                                </select>
                             </td>
                             <td className="px-8 py-7 text-right">
                                <div className="flex justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                   <button 
                                     onClick={() => handleStatusChange(lead.id, 'Ordered')}
                                     className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl hover:bg-brand-gold hover:text-white transition-all"
                                     title="Mark as Ordered"
                                   >
                                      <CheckCircle2 size={18} />
                                   </button>
                                   <a 
                                     href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${lead.fullName}, this is EMutex Nig. Following up on your interest in ${lead.productInterested}...`)}`}
                                     target="_blank"
                                     className="p-3 bg-brand-emerald text-white rounded-xl hover:bg-[#0a2b22] shadow-lg shadow-brand-emerald/10 transition-all"
                                     title="Open WhatsApp Chat"
                                     onClick={() => handleStatusChange(lead.id, 'Contacted')}
                                   >
                                      <MessageCircle size={18} />
                                   </a>
                                   <button 
                                     onClick={() => handleDeleteLead(lead.id)}
                                     className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                     title="Remove Lead"
                                   >
                                      <Trash2 size={18} />
                                   </button>
                                </div>
                             </td>
                          </motion.tr>
                       ))
                    ) : (
                       <tr>
                          <td colSpan={5} className="px-8 py-32 text-center bg-brand-ivory/20">
                             <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
                                <div className="w-20 h-20 bg-brand-mist/50 rounded-full flex items-center justify-center text-brand-gold opacity-30">
                                   <Users size={40} />
                                </div>
                                <div className="space-y-2">
                                  <h3 className="text-2xl font-serif text-[#0E3B2E]">No Leads Found</h3>
                                  <p className="text-brand-grey text-sm font-medium leading-relaxed">We couldn't find any leads matching your current search or filter criteria.</p>
                                </div>
                                <button 
                                  onClick={() => {setSearchTerm(''); setStatusFilter('all');}}
                                  className="flex items-center gap-2 text-brand-gold font-bold uppercase tracking-widest text-xs hover:opacity-70 transition-opacity"
                                >
                                  <RefreshCw size={14} /> Clear all filters
                                </button>
                             </div>
                          </td>
                       </tr>
                    )}
                    </AnimatePresence>
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
