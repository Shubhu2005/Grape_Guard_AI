import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUpload from '@/components/ImageUpload';
import DiseaseResult from '@/components/DiseaseResult';
import PesticideSection from '@/components/PesticideSection';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
// Sample response matching the provided JSON structure
const sampleResponse = {
    disease_name: "Powdery Mildew",
    description: "Fungal disease affecting grape leaves. White powdery spots appear on leaves and stems, reducing photosynthesis and weakening the plant. Early detection is crucial for effective treatment.",
    pesticides: {
        organic: [
            { name: "Neem Oil", dosage: "5ml/L", precautions: "Apply in evening, avoid direct sun" },
            { name: "Baking Soda Spray", dosage: "10g/L water", precautions: "Test on small area first" },
        ],
        chemical: [
            { name: "Sulphur Spray", dosage: "10g/L", precautions: "Wear gloves and mask" },
            { name: "Myclobutanil", dosage: "0.5ml/L", precautions: "Keep away from water sources" },
        ]
    }
};
const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(JSON.parse(storedUser));
    }, [navigate]);
    const handleLogout = () => {
        localStorage.removeItem('user');
        toast.success('Logged out successfully');
        navigate('/');
    };
    const handleImageSelect = (file) => {
        setSelectedImage(file);
        setResult(null);
    };
    const handleAnalyze = async () => {
        if (!selectedImage) {
            toast.error('Please select an image first');
            return;
        }
        setIsAnalyzing(true);
        // API-ready placeholder for /analyze-leaf endpoint
        try {
            // Replace with actual API call:
            // const formData = new FormData();
            // formData.append('image', selectedImage);
            // const response = await fetch('/analyze-leaf', {
            //   method: 'POST',
            //   body: formData
            // });
            // const data = await response.json();
            // setResult(data);
            // Simulating API delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Using sample response for demo
            setResult(sampleResponse);
            toast.success('Analysis complete!');
        }
        catch (error) {
            toast.error('Analysis failed. Please try again.');
        }
        finally {
            setIsAnalyzing(false);
        }
    };
    const handleReset = () => {
        setSelectedImage(null);
        setResult(null);
    };
    return (<div className="min-h-screen flex flex-col bg-background">
      <Header user={user} onLogout={handleLogout}/>

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Welcome Message */}
          {!result && (<div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-accent mb-2">
                Analyze Your Grape Leaves
              </h2>
              <p className="text-muted-foreground">
                Upload a photo of a grape leaf to detect diseases and get treatment recommendations
              </p>
            </div>)}

          {/* Image Upload Section */}
          <section className="card-elevated">
            <h3 className="text-lg font-semibold text-accent mb-4">
              {result ? 'Uploaded Image' : 'Step 1: Upload Image'}
            </h3>
            <ImageUpload onImageSelect={handleImageSelect} isLoading={isAnalyzing}/>
            
            {selectedImage && !result && (<div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAnalyze} className="flex-1 btn-primary-large gap-2" disabled={isAnalyzing}>
                  {isAnalyzing ? (<>
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"/>
                      Analyzing...
                    </>) : (<>
                      <Search className="w-5 h-5"/>
                      Analyze Leaf
                    </>)}
                </Button>
              </div>)}
          </section>

          {/* Results Section */}
          {result && (<>
              <div className="section-divider"/>
              
              {/* Disease Result */}
              <section>
                <DiseaseResult result={result}/>
              </section>

              <div className="section-divider"/>

              {/* Pesticide Recommendations */}
              <section>
                <PesticideSection pesticides={result.pesticides}/>
              </section>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={handleReset} variant="outline" className="flex-1 py-6 text-lg gap-2">
                  <RefreshCw className="w-5 h-5"/>
                  Analyze Another Leaf
                </Button>
              </div>
            </>)}
        </div>
      </main>

      <Footer />
    </div>);
};
export default Dashboard;
