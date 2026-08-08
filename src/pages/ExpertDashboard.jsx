import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import StatusBadge from '@/components/StatusBadge';
import PesticideSection from '@/components/PesticideSection';
import ReasoningBlock from '@/components/ReasoningBlock';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRequestStore } from '@/hooks/useRequestStore';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, XCircle, History, FileText, MessageSquare, User as UserIcon, Calendar, AlertTriangle, Edit3, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import './auth.css';
const ExpertDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isLoading: authLoading } = useAuth();
    // Persist active tab in sessionStorage
    const [activeTab, setActiveTab] = useState(() => {
        const saved = sessionStorage.getItem('expert_active_tab');
        return saved || 'pending';
    });
    // Request store
    const { pendingRequests, completedRequests, updateRequest, lastUpdated } = useRequestStore();
    const [selectedRequestId, setSelectedRequestId] = useState(null);
    const [historyApprovedId, setHistoryApprovedId] = useState(null);
    const [historyRejectedId, setHistoryRejectedId] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedPesticides, setEditedPesticides] = useState({
        organic: [],
        chemical: []
    });
    // Get selected request from store
    const selectedRequest = selectedRequestId
        ? [...pendingRequests, ...completedRequests].find(r => r.request_id === selectedRequestId)
        : null;
    // Persist active tab
    useEffect(() => {
        sessionStorage.setItem('expert_active_tab', activeTab);
    }, [activeTab]);
    useEffect(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        if (['pending', 'history'].includes(tab)) {
            setActiveTab(tab);
            setSelectedRequestId(null);
        }
    }, [location.search]);
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }
        if (!authLoading && user?.role !== 'expert') {
            navigate('/farmer-dashboard');
        }
    }, [user, authLoading, navigate]);
    const handleLogout = async () => {
        toast.success('Logged out successfully');
        await logout();
    };
    const openRequestDetail = (requestId) => {
        const request = [...pendingRequests, ...completedRequests].find(r => r.request_id === requestId);
        if (request) {
            setSelectedRequestId(requestId);
            setRemarks(request.expert_remarks || '');
            setEditedPesticides({
                organic: [...request.pesticides.organic],
                chemical: [...request.pesticides.chemical]
            });
            setIsEditing(false);
        }
    };
    const closeRequestDetail = () => {
        setSelectedRequestId(null);
        setRemarks('');
        setIsEditing(false);
    };
    const handleApprove = async () => {
        if (!selectedRequest)
            return;
        try {
            await updateRequest(selectedRequest.request_id, {
                status: 'approved',
                expert_validation: 'valid',
                expert_remarks: remarks,
                pesticides: editedPesticides,
            });
            toast.success('Request approved successfully');
            closeRequestDetail();
        }
        catch (error) {
            toast.error(error?.message || 'Failed to approve request');
        }
    };
    const handleReject = async () => {
        if (!selectedRequest)
            return;
        if (!remarks.trim()) {
            toast.error('Please provide remarks explaining the rejection');
            return;
        }
        try {
            await updateRequest(selectedRequest.request_id, {
                status: 'rejected',
                expert_validation: 'invalid',
                expert_remarks: remarks,
            });
            toast.success('Request rejected');
            closeRequestDetail();
        }
        catch (error) {
            toast.error(error?.message || 'Failed to reject request');
        }
    };
    const addPesticide = (type) => {
        const newPesticide = { name: '', dosage: '', precautions: '' };
        setEditedPesticides(prev => ({
            ...prev,
            [type]: [...prev[type], newPesticide]
        }));
    };
    const updatePesticide = (type, index, field, value) => {
        setEditedPesticides(prev => ({
            ...prev,
            [type]: prev[type].map((p, i) => i === index ? { ...p, [field]: value } : p)
        }));
    };
    const removePesticide = (type, index) => {
        setEditedPesticides(prev => ({
            ...prev,
            [type]: prev[type].filter((_, i) => i !== index)
        }));
    };
    if (authLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>);
    }
    return (<div className="auth-root auth-dashboard min-h-screen flex flex-col">
      <Header user={user} onLogout={handleLogout}/>

      <main className="auth-shell flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {lastUpdated && (<p className="text-[11px] text-muted-foreground text-right mb-2">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>)}
          {/* Tab Navigation */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button onClick={() => { setActiveTab('pending'); closeRequestDetail(); }} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'pending'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}`}>
              <FileText className="w-4 h-4"/>
              Pending Reviews
              {pendingRequests.length > 0 && (<span className="bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>)}
            </button>
            <button onClick={() => { setActiveTab('history'); closeRequestDetail(); setHistoryApprovedId(null); setHistoryRejectedId(null); }} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}`}>
              <History className="w-4 h-4"/>
              Review History
              {completedRequests.length > 0 && (<span className="bg-muted text-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {completedRequests.length}
                </span>)}
            </button>
          </div>

          {/* Pending Tab */}
          {activeTab === 'pending' && !selectedRequest && (<div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-accent">
                  Farmer Requests Awaiting Review
                </h3>
              </div>
              
              {pendingRequests.length > 0 ? (<div className="space-y-4">
                  {pendingRequests.map(request => (<div key={request.request_id} className="card-elevated cursor-pointer hover:shadow-md transition-shadow" onClick={() => openRequestDetail(request.request_id)}>
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          <img src={request.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">
                                {request.disease_name}
                              </h4>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <UserIcon className="w-3 h-3"/>
                                {request.farmer_name} • ID: {request.farmer_id}
                              </p>
                            </div>
                            <StatusBadge status={request.status} size="sm"/>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {request.description}
                          </p>
                          {request.symptoms_by_farmer && (<div className="p-2 bg-muted/50 rounded text-sm">
                              <span className="font-medium">Symptoms: </span>
                              {request.symptoms_by_farmer}
                            </div>)}
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <Calendar className="w-3 h-3"/>
                            {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>))}
                </div>) : (<div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-4"/>
                  <h3 className="text-lg font-medium text-foreground mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    No pending requests to review
                  </p>
                </div>)}
            </div>)}

          {/* Request Detail View */}
          {selectedRequest && (<div className="space-y-6">
              <Button variant="ghost" onClick={closeRequestDetail} className="mb-4">
                {'<-'} Back to list
              </Button>

              <div className="card-elevated">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    <img src={selectedRequest.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      {selectedRequest.disease_name}
                    </h3>
                    <ReasoningBlock
                      text={selectedRequest.description}
                      severity={selectedRequest.severity || 'Moderate'}
                      symptoms={selectedRequest.symptoms_by_farmer ? [selectedRequest.symptoms_by_farmer] : []}
                    />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="px-2 py-1 bg-muted rounded flex items-center gap-1">
                        <UserIcon className="w-3 h-3"/>
                        {selectedRequest.farmer_name}
                      </span>
                      <span className="px-2 py-1 bg-muted rounded flex items-center gap-1">
                        <Calendar className="w-3 h-3"/>
                        {format(new Date(selectedRequest.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Farmer's Symptoms */}
                {selectedRequest.symptoms_by_farmer && (<div className="p-4 bg-muted/30 rounded-lg mb-6">
                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning"/>
                      Symptoms Reported by Farmer
                    </h4>
                    <p className="text-foreground">{selectedRequest.symptoms_by_farmer}</p>
                  </div>)}

                {/* Pesticide Recommendations */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-accent">
                      System Recommendations
                    </h4>
                    {selectedRequest.status === 'waiting' && (<Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)} className="gap-1">
                        <Edit3 className="w-4 h-4"/>
                        {isEditing ? 'View Mode' : 'Edit'}
                      </Button>)}
                  </div>

                  {isEditing ? (<div className="space-y-6">
                      {/* Organic Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-success">Organic Pesticides</h5>
                          <Button variant="outline" size="sm" onClick={() => addPesticide('organic')} className="gap-1">
                            <Plus className="w-3 h-3"/> Add
                          </Button>
                        </div>
                        {editedPesticides.organic.map((p, i) => (<div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 border rounded-lg">
                            <input value={p.name} onChange={(e) => updatePesticide('organic', i, 'name', e.target.value)} placeholder="Name" className="input-base"/>
                            <input value={p.dosage} onChange={(e) => updatePesticide('organic', i, 'dosage', e.target.value)} placeholder="Dosage" className="input-base"/>
                            <input value={p.precautions} onChange={(e) => updatePesticide('organic', i, 'precautions', e.target.value)} placeholder="Precautions" className="input-base"/>
                            <Button variant="ghost" size="sm" onClick={() => removePesticide('organic', i)} className="text-destructive">
                              <X className="w-4 h-4"/>
                            </Button>
                          </div>))}
                      </div>

                      {/* Chemical Section */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium text-warning">Chemical Pesticides</h5>
                          <Button variant="outline" size="sm" onClick={() => addPesticide('chemical')} className="gap-1">
                            <Plus className="w-3 h-3"/> Add
                          </Button>
                        </div>
                        {editedPesticides.chemical.map((p, i) => (<div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2 p-3 border rounded-lg">
                            <input value={p.name} onChange={(e) => updatePesticide('chemical', i, 'name', e.target.value)} placeholder="Name" className="input-base"/>
                            <input value={p.dosage} onChange={(e) => updatePesticide('chemical', i, 'dosage', e.target.value)} placeholder="Dosage" className="input-base"/>
                            <input value={p.precautions} onChange={(e) => updatePesticide('chemical', i, 'precautions', e.target.value)} placeholder="Precautions" className="input-base"/>
                            <Button variant="ghost" size="sm" onClick={() => removePesticide('chemical', i)} className="text-destructive">
                              <X className="w-4 h-4"/>
                            </Button>
                          </div>))}
                      </div>
                    </div>) : (<PesticideSection pesticides={editedPesticides}/>)}
                </div>

                {/* Expert Remarks */}
                {selectedRequest.status === 'waiting' && (<div className="mb-6">
                    <h4 className="font-semibold text-accent mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4"/>
                      Expert Remarks
                    </h4>
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add your comments, corrections, or additional recommendations for the farmer..." className="min-h-[100px]"/>
                  </div>)}

                {/* Action Buttons */}
                {selectedRequest.status === 'waiting' && (<div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                    <Button onClick={handleApprove} className="flex-1 bg-success hover:bg-success/90 text-success-foreground gap-2">
                      <CheckCircle className="w-5 h-5"/>
                      Approve Recommendation
                    </Button>
                    <Button onClick={handleReject} variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10 gap-2">
                      <XCircle className="w-5 h-5"/>
                      Reject
                    </Button>
                  </div>)}

                {/* View-only for reviewed requests */}
                {selectedRequest.status !== 'waiting' && (<div className="pt-4 border-t">
                    <div className="flex items-center gap-4 mb-4">
                      <StatusBadge status={selectedRequest.status}/>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${selectedRequest.expert_validation === 'valid'
                    ? 'bg-success/10 text-success'
                    : 'bg-destructive/10 text-destructive'}`}>
                        {selectedRequest.expert_validation === 'valid' ? 'Valid' : 'Invalid'}
                      </span>
                    </div>
                    {selectedRequest.expert_remarks && (<div className="p-4 bg-muted/30 rounded-lg">
                        <h5 className="font-medium mb-2">Expert Remarks:</h5>
                        <p>{selectedRequest.expert_remarks}</p>
                      </div>)}
                  </div>)}
              </div>
            </div>)}

          {/* History Tab */}
          {activeTab === 'history' && !selectedRequest && (<div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-accent">
                  Review History
                </h3>
              </div>

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-success"/>
                  <h4 className="font-semibold text-foreground">Approved</h4>
                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                    {completedRequests.filter((r) => r.status === 'approved').length}
                  </span>
                </div>
                {completedRequests.filter((r) => r.status === 'approved').length > 0 ? (<div className="space-y-3">
                    {completedRequests.filter(r => r.status === 'approved').map(request => {
                    const expanded = historyApprovedId === request.request_id;
                    const toggle = () => {
                      setHistoryApprovedId(expanded ? null : request.request_id);
                      setHistoryRejectedId(null);
                    };
                    return (<div key={request.request_id} className="card-elevated">
                        <button className="w-full text-left" onClick={toggle}>
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              <img src={request.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground truncate">
                                    {request.disease_name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {request.farmer_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Reviewed: {format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <StatusBadge status={request.status} size="sm"/>
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className={`overflow-hidden transition-[max-height] duration-300 ${expanded ? 'max-h-[1200px]' : 'max-h-0'}`}>
                          {expanded && (<div className="pt-4 space-y-4">
                              <ReasoningBlock text={request.description}/>
                              {request.expert_remarks && (<div className="p-4 bg-muted/30 rounded-lg">
                                  <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4"/>
                                    Expert Remarks
                                  </h5>
                                  <p className="text-sm text-foreground">{request.expert_remarks}</p>
                                </div>)}
                              <div className="flex items-center gap-2 text-sm">
                                <span className="font-medium">Validation:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${request.expert_validation === 'valid'
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'}`}>
                                  {request.expert_validation === 'valid' ? 'Valid' : 'Invalid'}
                                </span>
                              </div>
                              <PesticideSection pesticides={request.pesticides}/>
                            </div>)}
                        </div>
                      </div>);
                  })}
                </div>) : (<p className="text-sm text-muted-foreground">No approved items yet.</p>)}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-destructive"/>
                  <h4 className="font-semibold text-foreground">Rejected</h4>
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                    {completedRequests.filter((r) => r.status === 'rejected').length}
                  </span>
                </div>
                {completedRequests.filter((r) => r.status === 'rejected').length > 0 ? (<div className="space-y-3">
                    {completedRequests.filter(r => r.status === 'rejected').map(request => {
                    const expanded = historyRejectedId === request.request_id;
                    const toggle = () => {
                      setHistoryRejectedId(expanded ? null : request.request_id);
                      setHistoryApprovedId(null);
                    };
                    return (<div key={request.request_id} className="card-elevated">
                        <button className="w-full text-left" onClick={toggle}>
                          <div className="flex items-start gap-3">
                            <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                              <img src={request.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground truncate">
                                    {request.disease_name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {request.farmer_name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    Reviewed: {format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}
                                  </p>
                                </div>
                                <StatusBadge status={request.status} size="sm"/>
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className={`overflow-hidden transition-[max-height] duration-300 ${expanded ? 'max-h-[1200px]' : 'max-h-0'}`}>
                          {expanded && (<div className="pt-4 space-y-4">
                              {request.expert_remarks && (<div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                                  <h5 className="font-medium text-destructive mb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4"/>
                                    Expert Remarks
                                  </h5>
                                  <p className="text-sm text-foreground">{request.expert_remarks}</p>
                                </div>)}
                              <ReasoningBlock text={request.description}/>
                              <PesticideSection pesticides={request.pesticides}/>
                            </div>)}
                        </div>
                      </div>);
                  })}
                  </div>) : (<p className="text-sm text-muted-foreground">No rejected items yet.</p>)}
              </section>
            </div>)}
        </div>
      </main>

      <div className="auth-shell">
        <Footer />
      </div>
    </div>);
};
export default ExpertDashboard;
