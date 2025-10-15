import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { adminApi } from '../../services/adminApi';
import type { ImportResult, ImportPreview } from '../../types';

interface FileUploadProps {
  onImportComplete: () => void;
}

export function FileUpload({ onImportComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setImportResult(null);
    setPreview(null);

    try {
      // First, get a preview of the import
      setIsUploading(true);
      const previewData = await adminApi.previewImport(file);
      setPreview(previewData);
    } catch (err: any) {
      console.error('Preview failed:', err);
      setError(err.response?.data?.message || 'Failed to preview file. Please check the format.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json', '.geojson'],
      'application/geopackage+sqlite3': ['.gpkg'],
      'application/octet-stream': ['.gpkg'],
    },
    multiple: false,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const handleConfirmImport = async () => {
    if (!preview) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const file = new File([JSON.stringify({
        type: 'FeatureCollection',
        features: preview.features,
      })], preview.fileName, { type: 'application/json' });

      const result = await adminApi.importGeoJSON(file, (progress) => {
        setUploadProgress(progress);
      });

      setImportResult(result);
      if (result.success) {
        onImportComplete();
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      setError(err.response?.data?.message || 'Import failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* File Drop Zone */}
      {!preview && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop your file here' : 'Upload polygon data'}
              </h3>
              <p className="text-gray-500 mt-1">
                Drag and drop a GeoJSON or GeoPackage file, or click to browse
              </p>
            </div>
            
            <div className="text-sm text-gray-400">
              <p>Supported formats: .geojson, .json, .gpkg</p>
              <p>Maximum file size: 50MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="card p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {preview ? 'Importing data...' : 'Processing file...'}
              </p>
              {uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress}% complete</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Import Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview */}
      {preview && !isUploading && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Import Preview</h3>
          
          <div className="space-y-4">
            {/* File Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">File:</span> {preview.fileName}
              </div>
              <div>
                <span className="font-medium text-gray-700">Size:</span> {(preview.fileSize / 1024).toFixed(1)} KB
              </div>
              <div>
                <span className="font-medium text-gray-700">Features:</span> {preview.featureCount}
              </div>
            </div>

            {/* Warnings */}
            {preview.warnings.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {preview.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div className="bg-red-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {preview.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sample Features */}
            {preview.features.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Sample Features ({Math.min(3, preview.features.length)} of {preview.features.length}):
                </h4>
                <div className="space-y-2">
                  {preview.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded text-sm">
                      <div className="font-medium">Feature {index + 1}</div>
                      <div className="text-gray-600 mt-1">
                        Height Source: {feature.properties.heightSource} | 
                        Quality: {feature.properties.polygonQuality} | 
                        Review: {feature.properties.reviewNeeded ? 'Yes' : 'No'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleConfirmImport}
                disabled={preview.errors.length > 0}
                className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {preview.featureCount} Polygons
              </button>
              <button
                onClick={handleCancelPreview}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className={`card p-4 ${
          importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {importResult.success ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.success ? 'Import Successful' : 'Import Failed'}
              </h3>
              <div className={`text-sm mt-1 ${
                importResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {importResult.success ? (
                  <p>Successfully imported {importResult.imported} polygons.</p>
                ) : (
                  <div>
                    <p>Import failed with errors:</p>
                    <ul className="list-disc list-inside mt-1">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}