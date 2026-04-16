import { useState, useRef } from "react";
import { generateUploadUrls, putFileToPresignedUrl } from "../utils/s3Helper";

const SUPPORTED_EXTENSIONS = [
  "pdf", "csv", "txt", "md", "doc", "docx", "xls", "xlsx", "html",
];

const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (Bedrock document limit)
const MAX_FILES = 3;

function getFileExtension(file) {
  const name = file.name || "";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ext;
}

function validateFile(file) {
  const ext = getFileExtension(file);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type: .${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum: 4.5MB`,
    );
  }
}

/**
 * Hook for managing file/document upload state and operations.
 *
 * Mirrors useImageUpload but without image processing (no HEIC conversion,
 * no compression). Files are uploaded immediately when selected.
 *
 * s3Keys are tracked in a ref (uploadedKeysMapRef) rather than derived from
 * React state to avoid React 18 batching timing issues at send time.
 */
export function useFileUpload() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadPromiseRef = useRef(null);
  const uploadedKeysMapRef = useRef({});

  const _uploadBatch = (files, userId) => {
    const ids = files.map((f) => f.id);

    setIsUploading(true);

    const promise = (async () => {
      try {
        const fileTypes = files.map((f) => f.extension);
        const uploadUrls = await generateUploadUrls(userId, fileTypes);

        for (let i = 0; i < uploadUrls.length; i++) {
          const { uploadUrl, s3Key } = uploadUrls[i];
          const fileObj = files[i];

          await putFileToPresignedUrl(uploadUrl, fileObj.file);

          uploadedKeysMapRef.current[fileObj.id] = s3Key;

          setSelectedFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id
                ? { ...f, uploadStatus: "done", s3Key }
                : f,
            ),
          );
        }
      } catch (err) {
        setError(err.message || "Failed to upload files");
        setSelectedFiles((prev) =>
          prev.map((f) =>
            ids.includes(f.id) && f.uploadStatus !== "done"
              ? { ...f, uploadStatus: "error" }
              : f,
          ),
        );
      } finally {
        setIsUploading(false);
      }
    })();

    uploadPromiseRef.current = promise;
    return promise;
  };

  /**
   * Select and immediately upload files.
   *
   * @param {FileList|File[]} files - Files to select
   * @param {string} userId - Required for immediate upload
   * @returns {Promise<Array>} - Array of staged file objects
   */
  const selectFiles = async (files, userId) => {
    try {
      setError(null);

      const fileArray = Array.from(files);

      if (fileArray.length > MAX_FILES) {
        throw new Error(`Maximum ${MAX_FILES} files allowed`);
      }

      if (selectedFiles.length + fileArray.length > MAX_FILES) {
        throw new Error(
          `Can only select ${MAX_FILES - selectedFiles.length} more file(s)`,
        );
      }

      fileArray.forEach((file) => validateFile(file));

      const newFiles = fileArray.map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        file,
        name: file.name,
        size: file.size,
        extension: getFileExtension(file),
        uploadStatus: "uploading",
        s3Key: null,
      }));

      setSelectedFiles((prev) => [...prev, ...newFiles]);

      if (userId) {
        _uploadBatch(newFiles, userId);
      }

      return newFiles;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Collect already-uploaded s3Keys at send time.
   * Awaits any in-flight upload promise, then reads from the ref.
   *
   * @returns {Promise<string[]>} - Array of s3Keys for successfully uploaded files
   */
  const uploadFiles = async () => {
    if (uploadPromiseRef.current) {
      await uploadPromiseRef.current.catch(() => {});
    }
    return Object.values(uploadedKeysMapRef.current);
  };

  const removeFile = (fileId) => {
    delete uploadedKeysMapRef.current[fileId];
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearFiles = () => {
    uploadedKeysMapRef.current = {};
    setSelectedFiles([]);
    setError(null);
    uploadPromiseRef.current = null;
  };

  return {
    selectedFiles,
    isUploading,
    error,
    selectFiles,
    uploadFiles,
    removeFile,
    clearFiles,
    setError,
  };
}
