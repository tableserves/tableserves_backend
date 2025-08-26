import { useState, useRef, useId, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaUpload, FaImage, FaTrash, FaEdit, FaSpinner } from 'react-icons/fa';

const ImageUpload = ({
  currentImage,
  onImageChange,
  label = "Upload Image",
  size = "large", // small, medium, large
  shape = "rounded", // rounded, circle
  allowEdit = true,
  uploading = false,
  className = ""
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);
  const inputId = useId();

  // Sync preview with currentImage prop changes
  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24",
    large: "w-32 h-32"
  };

  const shapeClasses = {
    rounded: "rounded-lg",
    circle: "rounded-full"
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setPreview(imageUrl);
        onImageChange(imageUrl, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInput = (event) => {
    const file = event.target.files[0];
    handleFileSelect(file);
    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleRemoveImage = () => {
    setPreview('');
    onImageChange('', null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-secondary font-raleway text-sm font-medium">
          {label}
        </label>
      )}

      <div className="flex items-center space-x-4">
        {/* Image Preview */}
        <div
          className={`
            ${sizeClasses[size]} 
            ${shapeClasses[shape]} 
            bg-theme-bg-card
            border-2
            border-dashed
            border-theme-border-primary
            overflow-hidden
            relative
            group
            transition-all
            duration-300
            ${dragOver ? 'border-theme-accent-primary bg-theme-accent-primary/10' : ''}
            ${allowEdit ? 'cursor-pointer hover:border-theme-accent-primary/50' : ''}
          `}
          onDrop={allowEdit ? handleDrop : undefined}
          onDragOver={allowEdit ? handleDragOver : undefined}
          onDragLeave={allowEdit ? handleDragLeave : undefined}
          onClick={allowEdit ? () => fileInputRef.current?.click() : undefined}
        >
          {uploading ? (
            <div className="w-full h-full flex items-center justify-center">
              <FaSpinner className="text-theme-accent-primary text-xl animate-spin" />
            </div>
          ) : preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              {allowEdit && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <FaEdit className="text-theme-text-inverse text-lg" />
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col border items-center justify-center text-theme-text-secondary">
              <FaImage className="text-2xl mb-1" />
              {size === 'large' && (
                <span className="text-xs font-raleway text-center px-2">
                  {dragOver ? 'Drop here' : 'Click or drag'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {allowEdit && (
          <div className="flex flex-col space-y-2">

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-theme-accent-primary hover:bg-theme-accent-hover text-theme-text-inverse px-3 py-2 rounded-lg font-raleway text-sm cursor-pointer inline-flex items-center space-x-2 transition-colors"
            >
              <FaUpload className="text-sm" />
              <span>Upload</span>
            </button>

            {preview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="bg-status-error hover:bg-status-error text-theme-text-inverse px-3 py-2 rounded-lg font-raleway text-sm inline-flex items-center space-x-2 transition-colors"
              >
                <FaTrash className="text-sm" />
                <span>Remove</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Upload Instructions */}
      {allowEdit && size === 'large' && (
        <div className="text-theme-text-tertiary font-raleway text-xs space-y-1">
          <p>• Supported formats: JPG, PNG, GIF</p>
          <p>• Maximum file size: 5MB</p>
          <p>• Recommended dimensions: 800x600px</p>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
