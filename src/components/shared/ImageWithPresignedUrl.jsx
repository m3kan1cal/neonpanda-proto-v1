import React, { useState, useEffect } from 'react';
import { getPresignedImageUrl } from '../../utils/s3Helper';
import { logger } from "../../utils/logger";

/**
 * Component to load and display images with presigned URLs from private S3 bucket
 * @param {string} s3Key - The S3 key for the image
 * @param {string} userId - The user ID for authentication
 * @param {number} index - The index of the image (for alt text)
 */
const ImageWithPresignedUrl = ({ s3Key, userId, index }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const url = await getPresignedImageUrl(s3Key, userId);
        if (url) {
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        logger.error('Failed to load presigned URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [s3Key, userId]);

  if (loading) {
    return (
      <div className="relative rounded-lg border-2 border-synthwave-neon-maroon/80 w-32 h-32 bg-synthwave-bg-primary/50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return null; // Hide broken images
  }

  return (
    <div className="relative rounded-lg overflow-hidden border-2 border-synthwave-neon-maroon/80 w-32 h-32 bg-synthwave-neon-maroon/50 shadow-neon-maroon">
      <img
        src={imageUrl}
        alt={`Uploaded image ${index + 1}`}
        className="w-full h-full object-cover rounded-md"
        onError={() => setError(true)}
      />
    </div>
  );
};

export default ImageWithPresignedUrl;

