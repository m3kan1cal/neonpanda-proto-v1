import { useState, useRef } from "react";
import {
  processMultipleImages,
  validateImageFile,
  getFileExtension,
} from "../utils/imageProcessing";
import { generateUploadUrls, putFileToPresignedUrl } from "../utils/s3Helper";

/**
 * Hook for managing image upload state and operations.
 *
 * Images are uploaded immediately when selected/pasted rather than waiting for send.
 * Each image object in `selectedImages` carries its own upload lifecycle:
 *   uploadStatus: 'uploading' | 'done' | 'error'
 *   s3Key: null while uploading, string once done
 *
 * On send, `uploadImages()` is a fast collector that returns already-uploaded s3Keys.
 * If any images are still in-flight it waits for their in-progress promise to settle.
 *
 * s3Keys are tracked in a ref (uploadedKeysMapRef) rather than derived from React state
 * to avoid React 18 batching timing issues when reading state at send time.
 */
export function useImageUpload() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImageIds, setUploadingImageIds] = useState(new Set());
  const [error, setError] = useState(null);

  // Tracks the in-flight upload promise for the current batch so `uploadImages`
  // can await it rather than polling state.
  const uploadPromiseRef = useRef(null);

  // Synchronously tracks imageId → s3Key for every successfully uploaded image.
  // Updated synchronously (no React batching), so `uploadImages()` can read it
  // reliably after awaiting the batch promise without depending on React render timing.
  const uploadedKeysMapRef = useRef({});

  /**
   * Upload a batch of already-staged image objects immediately.
   * Mutates each image's uploadStatus/s3Key in state as it progresses.
   * Stores the returned Promise in uploadPromiseRef so the send path can await it.
   *
   * @param {Array} images - Array of image objects (already added to selectedImages)
   * @param {string} userId
   */
  const _uploadBatch = (images, userId) => {
    const ids = images.map((img) => img.id);

    setIsUploading(true);
    setUploadingImageIds((prev) => new Set([...prev, ...ids]));

    const promise = (async () => {
      try {
        const fileTypes = images.map((img) => img.extension);
        const uploadUrls = await generateUploadUrls(userId, fileTypes);

        for (let i = 0; i < uploadUrls.length; i++) {
          const { uploadUrl, s3Key } = uploadUrls[i];
          const image = images[i];

          await putFileToPresignedUrl(uploadUrl, image.file);

          // Write to ref first (synchronous, no batching concerns), then update state.
          uploadedKeysMapRef.current[image.id] = s3Key;

          setSelectedImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? { ...img, uploadStatus: "done", s3Key }
                : img,
            ),
          );

          setUploadingImageIds((prev) => {
            const next = new Set(prev);
            next.delete(image.id);
            return next;
          });

          setUploadProgress(Math.round(((i + 1) / uploadUrls.length) * 100));
        }
      } catch (err) {
        setError(err.message || "Failed to upload images");
        setSelectedImages((prev) =>
          prev.map((img) =>
            ids.includes(img.id) && img.uploadStatus !== "done"
              ? { ...img, uploadStatus: "error" }
              : img,
          ),
        );
        setUploadingImageIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.delete(id));
          return next;
        });
      } finally {
        setIsUploading(false);
      }
    })();

    uploadPromiseRef.current = promise;
    return promise;
  };

  /**
   * Select, process, and immediately upload images.
   *
   * @param {FileList|File[]} files - Files to select
   * @param {string} userId - Required for immediate upload
   * @returns {Promise<Array>} - Array of staged image objects
   */
  const selectImages = async (files, userId) => {
    try {
      setError(null);

      const fileArray = Array.from(files);

      if (fileArray.length > 5) {
        throw new Error("Maximum 5 images allowed");
      }

      if (selectedImages.length + fileArray.length > 5) {
        throw new Error(
          `Can only select ${5 - selectedImages.length} more image(s)`,
        );
      }

      fileArray.forEach((file) => validateImageFile(file));

      const processedFiles = await processMultipleImages(fileArray);

      const newImages = processedFiles.map((file, index) => ({
        id: `img-${Date.now()}-${index}`,
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        extension: getFileExtension(file),
        uploadStatus: "uploading",
        s3Key: null,
      }));

      setSelectedImages((prev) => [...prev, ...newImages]);

      if (userId) {
        _uploadBatch(newImages, userId);
      }

      return newImages;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Collect already-uploaded s3Keys at send time.
   * Awaits any in-flight upload promise, then reads directly from the ref
   * (bypassing React state batching to guarantee up-to-date values).
   *
   * @returns {Promise<string[]>} - Array of s3Keys for successfully uploaded images
   */
  const uploadImages = async () => {
    if (uploadPromiseRef.current) {
      await uploadPromiseRef.current.catch(() => {});
    }

    // Read from ref — always synchronously up-to-date, no React render required.
    return Object.values(uploadedKeysMapRef.current);
  };

  /**
   * Remove an image from selection.
   * Uploaded S3 objects are intentionally left in place (short-lived, scoped to userId).
   *
   * @param {string} imageId
   */
  const removeImage = (imageId) => {
    delete uploadedKeysMapRef.current[imageId];
    setSelectedImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (image && image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  /**
   * Clear all selected images and reset state.
   */
  const clearImages = () => {
    selectedImages.forEach((img) => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    uploadedKeysMapRef.current = {};
    setSelectedImages([]);
    setError(null);
    setUploadProgress(0);
    setUploadingImageIds(new Set());
    uploadPromiseRef.current = null;
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
