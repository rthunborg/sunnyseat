import { useForm } from 'react-hook-form';
import type { PatioMetadataForm as PatioMetadata } from '../../types';

interface PatioMetadataFormProps {
  initialData?: PatioMetadata;
  onSubmit: (data: PatioMetadata) => void;
  onCancel: () => void;
}

export function PatioMetadataForm({
  initialData,
  onSubmit,
  onCancel,
}: PatioMetadataFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PatioMetadata>( {
    defaultValues: initialData || {
      heightSource: 'heuristic',
      polygonQuality: 0.8,
      reviewNeeded: false,
      orientation: '',
      notes: '',
    },
  });

  const polygonQuality = watch('polygonQuality');

  const getQualityLabel = (quality: number) => {
    if (quality >= 0.8) return 'Excellent';
    if (quality >= 0.6) return 'Good';
    return 'Poor';
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-600';
    if (quality >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Height Source */}
      <div>
        <label htmlFor="heightSource" className="block text-sm font-medium text-gray-700 mb-1">
          Height Source
        </label>
        <select
          {...register('heightSource', { required: 'Height source is required' })}
          className="input"
        >
          <option value="heuristic">Heuristic (Estimated)</option>
          <option value="osm">OpenStreetMap Data</option>
          <option value="surveyed">Surveyed (Ground Truth)</option>
        </select>
        {errors.heightSource && (
          <p className="mt-1 text-sm text-red-600">{errors.heightSource.message}</p>
        )}
      </div>

      {/* Polygon Quality */}
      <div>
        <label htmlFor="polygonQuality" className="block text-sm font-medium text-gray-700 mb-1">
          Polygon Quality
        </label>
        <div className="space-y-2">
          <input
            {...register('polygonQuality', { 
              min: { value: 0, message: 'Quality must be at least 0' },
              max: { value: 1, message: 'Quality cannot exceed 1' }
            })}
            type="range"
            min="0"
            max="1"
            step="0.1"
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Poor (0.0)</span>
            <span className={`text-sm font-medium ${getQualityColor(polygonQuality)}`}>
              {getQualityLabel(polygonQuality)} ({polygonQuality.toFixed(1)})
            </span>
            <span className="text-sm text-gray-500">Excellent (1.0)</span>
          </div>
        </div>
        {errors.polygonQuality && (
          <p className="mt-1 text-sm text-red-600">{errors.polygonQuality.message}</p>
        )}
      </div>

      {/* Orientation */}
      <div>
        <label htmlFor="orientation" className="block text-sm font-medium text-gray-700 mb-1">
          Orientation (Optional)
        </label>
        <input
          {...register('orientation')}
          type="text"
          placeholder="e.g., South-facing, Garden view"
          className="input"
        />
      </div>

      {/* Review Needed */}
      <div className="flex items-center">
        <input
          {...register('reviewNeeded')}
          type="checkbox"
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="reviewNeeded" className="ml-2 block text-sm font-medium text-gray-700">
          Requires manual review
        </label>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (Optional)
        </label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder="Additional notes about this patio..."
          className="input resize-none"
        />
      </div>

      {/* Quality Guidelines */}
      <div className="bg-gray-50 p-3 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quality Guidelines:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li><strong>Excellent (0.8-1.0):</strong> Precise surveyed data, aligned with building edges</li>
          <li><strong>Good (0.6-0.8):</strong> Well-defined boundaries, minor alignment issues</li>
          <li><strong>Poor (0.0-0.6):</strong> Rough approximation, requires improvement</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          className="btn btn-primary flex-1"
        >
          Save Patio
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary flex-1"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}