import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUpload from '@/components/ImageUpload';
import StatusBadge from '@/components/StatusBadge';
import RequestCard from '@/components/RequestCard';
import PesticideSection from '@/components/PesticideSection';
import ReasoningBlock from '@/components/ReasoningBlock';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRequestStore } from '@/hooks/useRequestStore';
import { useAuth } from '@/hooks/useAuth';
import { Search, Clock, History, FileText, CheckCircle, XCircle, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import './auth.css';
const FarmerDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isLoading: authLoading } = useAuth();
    // Persist active tab in sessionStorage
    const [activeTab, setActiveTab] = useState(() => {
        const saved = sessionStorage.getItem('farmer_active_tab');
        return saved || 'new';
    });
    // New Analysis State - persisted in sessionStorage
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(() => {
        return sessionStorage.getItem('farmer_image_preview');
    });
    const [symptoms, setSymptoms] = useState(() => {
        return sessionStorage.getItem('farmer_symptoms') || '';
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    // Current analysis result (before submission)
    const [analysisResult, setAnalysisResult] = useState(() => {
        const saved = sessionStorage.getItem('farmer_analysis_result');
        return saved ? JSON.parse(saved) : null;
    });
    // Request store
    const { farmerRequests, addRequest, lastUpdated, refresh } = useRequestStore(user?.id);
    const [expandedApprovedId, setExpandedApprovedId] = useState(null);
    const [expandedRejectedId, setExpandedRejectedId] = useState(null);
    // Persist state changes to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('farmer_active_tab', activeTab);
    }, [activeTab]);
    useEffect(() => {
      const tab = new URLSearchParams(location.search).get('tab');
      if (['new', 'status', 'history'].includes(tab)) {
        setActiveTab(tab);
      }
    }, [location.search]);
  useEffect(() => {
    sessionStorage.setItem('farmer_symptoms', symptoms);
  }, [symptoms]);

  // Keep the in-progress analysis card in sync with server updates.
  useEffect(() => {
    if (!analysisResult) return;
    const latest = farmerRequests.find((r) => r.request_id === analysisResult.request_id);
    if (!latest) return;

    // If expert has reviewed it, clear the "new analysis" view so the farmer sees the updated status tab.
    if (latest.status !== 'waiting') {
      setAnalysisResult(null);
      sessionStorage.removeItem('farmer_analysis_result');
      sessionStorage.removeItem('farmer_image_preview');
      sessionStorage.removeItem('farmer_symptoms');
      setActiveTab('status');
      return;
    }

    // Otherwise, keep the cached card aligned with the freshest pending data.
    setAnalysisResult(latest);
    sessionStorage.setItem('farmer_analysis_result', JSON.stringify(latest));
  }, [analysisResult, farmerRequests]);

  // Auto-refresh to move items from Status to History when expert decides.
  useEffect(() => {
    const interval = setInterval(() => {
      refresh().catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [refresh]);
    useEffect(() => {
        if (analysisResult) {
            sessionStorage.setItem('farmer_analysis_result', JSON.stringify(analysisResult));
        }
    }, [analysisResult]);
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/login');
            return;
        }
        if (!authLoading && user?.role !== 'farmer') {
            navigate('/expert-dashboard');
        }
    }, [user, authLoading, navigate]);
    const handleLogout = async () => {
        toast.success('Logged out successfully');
        await logout();
    };
    const handleImageSelect = (file) => {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            const preview = reader.result;
            setImagePreview(preview);
            sessionStorage.setItem('farmer_image_preview', preview);
        };
        reader.readAsDataURL(file);
    };
    const handleAnalyze = async () => {
        if (!selectedImage) {
            toast.error('Please select an image first');
            return;
        }
        setIsAnalyzing(true);
        try {
            const created = await addRequest({
                imageFile: selectedImage,
                symptom_note: symptoms,
            });
            setAnalysisResult(created);
            // Clear upload state but keep result for display
            setSelectedImage(null);
            sessionStorage.removeItem('farmer_image_preview');
            sessionStorage.removeItem('farmer_symptoms');
            toast.success('Analysis complete! Request automatically sent to expert for approval.');
        }
        catch (error) {
            toast.error(error?.message || 'Analysis failed. Please try again.');
        }
        finally {
            setIsAnalyzing(false);
        }
    };
    const handleNewAnalysis = () => {
        setAnalysisResult(null);
        setSelectedImage(null);
        setImagePreview(null);
        setSymptoms('');
        sessionStorage.removeItem('farmer_analysis_result');
        sessionStorage.removeItem('farmer_image_preview');
        sessionStorage.removeItem('farmer_symptoms');
    };
    const pendingRequests = farmerRequests.filter(r => r.status === 'waiting');
    const approvedRequests = farmerRequests.filter(r => r.status === 'approved');
    const rejectedRequests = farmerRequests.filter(r => r.status === 'rejected');
    // History only shows completed (approved or rejected) requests
    const completedRequests = farmerRequests.filter(r => r.status === 'approved' || r.status === 'rejected');
    if (authLoading) {
        return (<div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
      </div>);
    }
  return (<div className="auth-root auth-dashboard min-h-screen flex flex-col">
      <Header user={user} onLogout={handleLogout}/>

      <main className="auth-shell flex-1 container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {lastUpdated && (<p className="text-[11px] text-muted-foreground text-right mb-2">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>)}
          {/* Tab Navigation */}
          <div className="flex rounded-xl bg-muted p-1 mb-6">
            <button onClick={() => setActiveTab('new')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'new'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}`}>
              <Search className="w-4 h-4"/>
              <span className="hidden sm:inline">New Analysis</span>
              <span className="sm:hidden">New</span>
            </button>
            <button onClick={() => setActiveTab('status')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'status'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}`}>
              <Clock className="w-4 h-4"/>
              <span className="hidden sm:inline">Status</span>
              {pendingRequests.length > 0 && (<span className="bg-warning text-warning-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {pendingRequests.length}
                </span>)}
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'history'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'}`}>
              <History className="w-4 h-4"/>
              <span className="hidden sm:inline">History</span>
              {(approvedRequests.length + rejectedRequests.length) > 0 && (<span className="bg-muted text-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {approvedRequests.length + rejectedRequests.length}
                </span>)}
            </button>
          </div>

          {/* New Analysis Tab */}
          {activeTab === 'new' && (<div className="space-y-6">
              <div className="text-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-accent mb-2">
                  Disease Identification
                </h2>
                <p className="text-muted-foreground text-sm">
                  Upload a grape leaf image and describe any symptoms
                </p>
              </div>

              {!analysisResult ? (<>
                  <section className="card-elevated">
                    <h3 className="text-lg font-semibold text-accent mb-4">
                      Step 1: Upload Leaf Image
                    </h3>
                    <ImageUpload onImageSelect={handleImageSelect} isLoading={isAnalyzing} previewUrl={imagePreview}/>
                  </section>

                  <section className="card-elevated">
                    <h3 className="text-lg font-semibold text-accent mb-4">
                      Step 2: Describe Symptoms (Optional)
                    </h3>
                    <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="Describe what you observe: e.g., white powder on leaves, leaf curling, yellow spots, etc." className="min-h-[100px] text-base"/>
                    <p className="text-xs text-muted-foreground mt-2">
                      Adding symptoms helps experts provide better recommendations
                    </p>
                  </section>

                  {(selectedImage || imagePreview) && (<Button onClick={handleAnalyze} className="w-full btn-primary-large gap-2" disabled={isAnalyzing}>
                      {isAnalyzing ? (<>
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"/>
                          Analyzing...
                        </>) : (<>
                          <Search className="w-5 h-5"/>
                          Analyze Leaf
                        </>)}
                    </Button>)}
                </>) : (
            /* Analysis Result - Auto-submitted, Read-only View */
            <div className="space-y-6">
                  {/* Waiting for Expert Approval Banner */}
                  <div className="p-4 bg-warning/10 rounded-xl border-2 border-warning/30 animate-pulse-subtle">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-warning"/>
                      </div>
                      <div>
                        <p className="text-warning font-semibold">Waiting for Expert Approval</p>
                        <p className="text-sm text-muted-foreground">
                          Your request has been automatically sent to an expert for review
                        </p>
                      </div>
                    </div>
                  </div>

                    {/* Disease Detection Card - Read Only */}
                  <div className="card-elevated opacity-90">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-warning"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-accent">
                            Disease Detected
                          </h3>
                          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                            System Suggestion
                          </span>
                        </div>
                        <div className="bg-secondary/50 rounded-lg p-4 mb-3">
                          <h4 className="text-lg font-bold text-foreground mb-1">
                            {analysisResult.disease_name}
                          </h4>
                        </div>
                        <ReasoningBlock
                          text={analysisResult.description}
                          severity={analysisResult.severity || 'Moderate'}
                          symptoms={analysisResult.symptoms_by_farmer ? [analysisResult.symptoms_by_farmer] : []}
                        />
                      </div>
                    </div>

                    {/* Image Preview */}
                    {analysisResult.image_url && (<div className="mb-4">
                        <h4 className="font-medium text-foreground mb-2">Uploaded Image:</h4>
                        <img src={analysisResult.image_url} alt="Leaf sample" className="w-32 h-32 object-cover rounded-lg"/>
                      </div>)}

                    {/* Farmer Symptoms */}
                    {analysisResult.symptoms_by_farmer && (<div className="p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium text-foreground">Your symptoms: </span>
                        <span className="text-muted-foreground">{analysisResult.symptoms_by_farmer}</span>
                      </div>)}
                  </div>

                  {/* Pesticide Recommendations - Read Only with Overlay */}
                  <div className="relative">
                    <div className="opacity-60 pointer-events-none">
                      <PesticideSection pesticides={analysisResult.pesticides}/>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
                      <div className="bg-card p-4 rounded-lg shadow-lg text-center">
                        <Clock className="w-8 h-8 text-warning mx-auto mb-2"/>
                        <p className="font-medium text-foreground">Pending Expert Validation</p>
                        <p className="text-sm text-muted-foreground">
                          Recommendations will be unlocked after approval
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Start New Analysis Button */}
                  <Button onClick={handleNewAnalysis} variant="outline" className="w-full gap-2">
                    <Search className="w-5 h-5"/>
                    Start New Analysis
                  </Button>
                </div>)}
            </div>)}

          {/* Status Tab - only pending */}
          {activeTab === 'status' && (<div className="space-y-6">
              {/* Pending Requests */}
              {pendingRequests.length > 0 && (<section>
                  <h3 className="text-lg font-semibold text-accent mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-warning"/>
                    Waiting for Expert Approval
                  </h3>
                  <div className="space-y-3">
                    {pendingRequests.map(request => (<div key={request.request_id} className="card-elevated">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            <img src={request.image_url} alt="Leaf sample" className="w-full h-full object-cover"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">
                              {request.disease_name}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <StatusBadge status={request.status} size="sm"/>
                        </div>
                      </div>))}
                  </div>
                </section>)}

              {pendingRequests.length === 0 && (<div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4"/>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Active Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    Submit a new leaf analysis to get started
                  </p>
                  <Button onClick={() => setActiveTab('new')}>
                    Start New Analysis
                  </Button>
                </div>)}
            </div>)}

          {/* History Tab - approved + rejected */}
          {activeTab === 'history' && (<div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-accent">
                  Analysis History
                </h3>
                <p className="text-xs text-muted-foreground">
                  Only completed (approved/rejected) requests
                </p>
              </div>
              
              {completedRequests.length > 0 ? (<div className="space-y-6">
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-success"/>
                      <h4 className="font-semibold text-foreground">Approved</h4>
                      <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">{approvedRequests.length}</span>
                    </div>
                    <div className="space-y-3">
                      {approvedRequests.map(request => {
                      const expanded = expandedApprovedId === request.request_id;
                      const toggle = () => {
                        setExpandedApprovedId(expanded ? null : request.request_id);
                        setExpandedRejectedId(null);
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
                                      {format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}
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
                                    <p className="text-sm text-foreground">
                                      {request.expert_remarks}
                                    </p>
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
                      {approvedRequests.length === 0 && (<p className="text-sm text-muted-foreground">No approved items yet.</p>)}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-destructive"/>
                      <h4 className="font-semibold text-foreground">Rejected</h4>
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">{rejectedRequests.length}</span>
                    </div>
                    <div className="space-y-3">
                      {rejectedRequests.map(request => {
                      const expanded = expandedRejectedId === request.request_id;
                      const toggle = () => {
                        setExpandedRejectedId(expanded ? null : request.request_id);
                        setExpandedApprovedId(null);
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
                                      {format(new Date(request.updated_at), 'MMM d, yyyy h:mm a')}
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
                                    <p className="text-sm text-foreground">
                                      {request.expert_remarks}
                                    </p>
                                  </div>)}
                                <p className="text-sm text-muted-foreground">
                                  Please resubmit with a clearer image or additional information based on the expert's feedback.
                                </p>
                                <ReasoningBlock text={request.description}/>
                              </div>)}
                          </div>
                        </div>);
                    })}
                      {rejectedRequests.length === 0 && (<p className="text-sm text-muted-foreground">No rejected items yet.</p>)}
                    </div>
                  </section>
                </div>) : (<div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4"/>
                  <h3 className="text-lg font-medium text-foreground mb-2">No History Yet</h3>
                  <p className="text-muted-foreground">
                    Your completed analyses will appear here after expert review
                  </p>
                </div>)}

            </div>)}
        </div>
      </main>

      <div className="auth-shell">
        <Footer />
      </div>
    </div>);
};
export default FarmerDashboard;
