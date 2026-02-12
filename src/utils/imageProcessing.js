import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';
import { logger } from "./logger";

/**
 * Process a single image: HEIC conversion, compression, and optimization
 * @param {File} file - The image file to process
 * @returns {Promise<File>} - The processed image file
 */
export async function processImage(file) {
  try {
    let processedFile = file;

    // Convert HEIC/HEIF to JPEG (iPhone photos)
    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      const blob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      });

      processedFile = new File(
        [blob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      );
    }

    // Compress image
    const options = {
      maxSizeMB: 2,
      maxWidthOrHeight: 2048,
      useWebWorker: true,
      fileType: processedFile.type,
    };

    const compressedFile = await imageCompression(processedFile, options);

    return compressedFile;
  } catch (error) {
    logger.error('Error processing image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

/**
 * Process multiple images in parallel
 * @param {File[]} files - Array of image files to process
 * @returns {Promise<File[]>} - Array of processed image files
 */
export async function processMultipleImages(files) {
  return Promise.all(files.map(file => processImage(file)));
}

/**
 * Validate an image file
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails
 */
export function validateImageFile(file) {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
  ];

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!validTypes.includes(file.type) && !hasValidExtension) {
    throw new Error('Invalid file type. Please upload JPG, PNG, WebP, GIF, or HEIC images.');
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    throw new Error('Image too large. Maximum size is 20MB.');
  }

  return true;
}

/**
 * Get the file extension for an image file
 * @param {File} file - The image file
 * @returns {string} - The file extension (without dot)
 */
export function getFileExtension(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.heic') || name.endsWith('.heif')) {
    return 'jpg'; // HEIC converts to JPEG
  }

  if (name.endsWith('.jpeg')) return 'jpg';
  if (name.endsWith('.jpg')) return 'jpg';
  if (name.endsWith('.png')) return 'png';
  if (name.endsWith('.webp')) return 'webp';
  if (name.endsWith('.gif')) return 'gif';

  return 'jpg'; // Default
}


