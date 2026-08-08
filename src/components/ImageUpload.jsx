import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, X, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
const ImageUpload = ({ onImageSelect, isLoading, previewUrl }) => {
    const [preview, setPreview] = useState(previewUrl || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [captureMode, setCaptureMode] = useState('environment'); // environment for rear camera on mobile
    // Sync with external previewUrl
    useEffect(() => {
        if (previewUrl !== undefined) {
            setPreview(previewUrl);
        }
    }, [previewUrl]);
    const handleFile = useCallback((file) => {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
            onImageSelect(file);
        }
    }, [onImageSelect]);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);
    const triggerPicker = (mode) => {
        const input = fileInputRef.current;
        if (!input)
            return;
        if (mode === 'camera') {
            input.setAttribute('capture', 'environment');
        }
        else {
            input.removeAttribute('capture');
        }
        input.click();
    };
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFile(file);
        }
    };
    const clearPreview = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    return (<div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        capture={captureMode}
      />

      {!preview ? (<div onClick={() => triggerPicker('gallery')} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`upload-zone flex flex-col items-center justify-center min-h-[200px] md:min-h-[280px] ${isDragging ? 'upload-zone-active' : ''}`}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-primary"/>
          </div>
          <p className="text-lg font-medium text-foreground mb-2">
            Upload Grape Leaf Image
          </p>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Drag & drop or click to select
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="gap-2" disabled={isLoading} onClick={(e) => {
        e.stopPropagation();
        setCaptureMode(''); // gallery mode
        triggerPicker('gallery');
    }}>
              <ImageIcon className="w-5 h-5"/>
              Gallery
            </Button>
            <Button variant="outline" size="lg" className="gap-2" disabled={isLoading} onClick={(e) => {
        e.stopPropagation();
        setCaptureMode('environment');
        triggerPicker('camera');
    }}>
              <Camera className="w-5 h-5"/>
              Camera
            </Button>
          </div>
        </div>) : (<div className="relative animate-fade-in">
          <div className="relative rounded-xl overflow-hidden border border-border">
            <img src={preview} alt="Selected grape leaf" className="w-full h-auto max-h-[400px] object-contain bg-muted/30"/>
            <button onClick={clearPreview} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-card/90 
                       flex items-center justify-center shadow-md hover:bg-card transition-colors" aria-label="Remove image">
              <X className="w-5 h-5 text-foreground"/>
            </button>
          </div>
          {isLoading && (<div className="absolute inset-0 bg-card/80 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
                <p className="text-sm font-medium text-foreground">Analyzing leaf...</p>
              </div>
            </div>)}
        </div>)}
    </div>);
};
export default ImageUpload;
