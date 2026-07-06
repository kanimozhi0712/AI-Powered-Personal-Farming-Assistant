import { useEffect, useRef, useState } from 'react';
import { Camera, ImageUp, ScanSearch, Square, Upload } from 'lucide-react';
import DashboardShell from '../components/DashboardShell.jsx';
import { detectDisease } from '../services/api.js';

export default function DiseaseDetectionPage() {
  const [cropName, setCropName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => () => stopCamera(), []);

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    streamRef.current = stream;
    setCameraOn(true);
    setTimeout(() => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    }, 0);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const captured = new File([blob], `crop-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setFile(captured);
      setPreview(URL.createObjectURL(captured));
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  async function scanImage() {
    if (!file) {
      setError('Upload or capture a crop/leaf image first.');
      return;
    }
    setScanning(true);
    setError('');
    setResult(null);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('cropName', cropName);
    formData.append('symptoms', symptoms);
    try {
      const { data } = await detectDisease(formData);
      setResult(data);
    } catch (err) {
      const status = err?.response?.status;
      const backendError = err?.response?.data?.error || err?.response?.data?.message;
      if (status === 401 || status === 403) {
        setError('Please login again, then retry disease scan.');
      } else if (status === 404) {
        setError('Disease detection API is not available. Restart the backend to load the latest code.');
      } else {
        setError(backendError || 'Disease scan failed. Upload a clear JPG/PNG image and check backend logs.');
      }
    } finally {
      setScanning(false);
    }
  }

  return (
    <DashboardShell>
      <section className="disease-page">
        <div className="dashboard-panel disease-inputs">
          <div>
            <span className="eyebrow">Disease Detection</span>
            <h2>Scan crop or leaf image</h2>
          </div>
          <input className="form-control" placeholder="Crop name if known, example tomato" value={cropName} onChange={(e) => setCropName(e.target.value)} />
          <textarea className="form-control" rows="3" placeholder="Visible symptoms if known, example yellow leaves, black spots" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />

          <label className="upload-zone">
            <ImageUp size={28} />
            <strong>Upload crop / leaf image</strong>
            <span>JPG or PNG close-up works best</span>
            <input type="file" accept="image/*" onChange={chooseFile} />
          </label>

          <div className="camera-actions">
            {!cameraOn ? (
              <button className="btn btn-outline-success" type="button" onClick={startCamera}><Camera size={16} /> Take Photo</button>
            ) : (
              <>
                <button className="btn btn-success" type="button" onClick={capturePhoto}><Upload size={16} /> Capture</button>
                <button className="btn btn-outline-dark" type="button" onClick={stopCamera}><Square size={16} /> Stop Camera</button>
              </>
            )}
          </div>

          {cameraOn && <video className="camera-preview" ref={videoRef} autoPlay playsInline muted />}

          <button className="btn btn-success scan-button" type="button" onClick={scanImage} disabled={scanning || !file}>
            <ScanSearch size={18} /> {scanning ? 'Scanning...' : 'Scan Disease'}
          </button>
          {error && <div className="alert alert-danger">{error}</div>}
        </div>

        <div className="dashboard-panel disease-preview-panel">
          <h2>Image Scanner</h2>
          <div className={`scanner-frame ${scanning ? 'scanning' : ''}`}>
            {preview ? <img src={preview} alt="Crop preview" /> : <span>Upload or capture an image</span>}
            {scanning && <i />}
          </div>
          {result && (
            <div className="disease-result">
              <div className="disease-name">
                <span>Detected disease</span>
                <strong>{result.diseaseName}</strong>
              </div>
              <div className="confidence-bar"><span style={{ width: `${Math.min(result.confidence, 100)}%` }} /></div>
              <div className="result-grid">
                <p><b>Confidence:</b> {result.confidence}%</p>
                <p><b>Severity:</b> {result.severity}</p>
                <p><b>Provider:</b> {result.provider}</p>
              </div>
              <section><h3>Treatment</h3><p>{result.treatment}</p></section>
              <section><h3>Prevention</h3><p>{result.prevention}</p></section>
              <div className="result-note">{result.note}</div>
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
