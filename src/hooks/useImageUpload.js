import { useState } from 'react';
import { processMultipleImages, validateImageFile, getFileExtension } from '../utils/imageProcessing';
import { getApiUrl, authenticatedFetch } from '../utils/apis/apiConfig';

/**
 * Hook for managing image upload state and operations
 * @returns {Object} Image upload state and methods
 */
export function useImageUpload() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImageIds, setUploadingImageIds] = useState(new Set());
  const [error, setError] = useState(null);

  /**
   * Select and process images
   * @param {FileList|File[]} files - Files to select
   * @returns {Promise<Array>} - Array of selected image objects
   */
  const selectImages = async (files) => {
    try {
      setError(null);

      const fileArray = Array.from(files);

      if (fileArray.length > 5) {
        throw new Error('Maximum 5 images allowed');
      }

      if (selectedImages.length + fileArray.length > 5) {
        throw new Error(`Can only select ${5 - selectedImages.length} more image(s)`);
      }

      // Validate all files first
      fileArray.forEach(file => validateImageFile(file));

      // Process images (HEIC conversion, compression)
      const processedFiles = await processMultipleImages(fileArray);

      // Create image objects with preview URLs
      const newImages = processedFiles.map((file, index) => ({
        id: `img-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        extension: getFileExtension(file),
      }));

      setSelectedImages(prev => [...prev, ...newImages]);

      return newImages;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Upload selected images to S3 via presigned URLs
   * @param {string} userId - The user ID for scoped uploads
   * @returns {Promise<string[]>} - Array of S3 keys
   */
  const uploadImages = async (userId) => {
    if (selectedImages.length === 0) {
      return [];
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      // ✅ Immediately mark ALL images as uploading (shows spinner instantly)
      const allImageIds = selectedImages.map(img => img.id);
      setUploadingImageIds(new Set(allImageIds));

      // Step 1: Get presigned URLs from backend
      const fileTypes = selectedImages.map(img => img.extension);

      const url = `${getApiUrl('')}/users/${userId}/generate-upload-urls`;
      const response = await authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          fileCount: selectedImages.length,
          fileTypes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate upload URLs: ${response.status}`);
      }

      const responseData = await response.json();
      const { uploadUrls } = responseData;

      // Step 2: Upload each image to S3
      const s3Keys = [];

      for (let i = 0; i < uploadUrls.length; i++) {
        const { uploadUrl, s3Key } = uploadUrls[i];
        const image = selectedImages[i];

        // Direct upload to S3 using presigned URL
        await fetch(uploadUrl, {
          method: 'PUT',
          body: image.file,
          headers: {
            'Content-Type': image.file.type,
          },
        });

        s3Keys.push(s3Key);
        setUploadProgress(Math.round(((i + 1) / uploadUrls.length) * 100));

        // Mark this image as done uploading (remove from uploading set)
        setUploadingImageIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(image.id);
          return newSet;
        });
      }

      return s3Keys;
    } catch (err) {
      setError(err.message || 'Failed to upload images');
      // Clear uploading state on error
      setUploadingImageIds(new Set());
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Remove an image from selection
   * @param {string} imageId - The image ID to remove
   */
  const removeImage = (imageId) => {
    setSelectedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image && image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  /**
   * Clear all selected images
   */
  const clearImages = () => {
    selectedImages.forEach(img => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setSelectedImages([]);
    setError(null);
    setUploadProgress(0);
    setUploadingImageIds(new Set());
  };

  return {
    selectedImages,
    isUploading,
    uploadProgress,
    uploadingImageIds,
    error,
    selectImages,
    uploadImages,
    removeImage,
    clearImages,
    setError,
  };
}


