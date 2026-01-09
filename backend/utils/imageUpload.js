const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../backend/uploads/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
}

/**
 * Upload image to local storage
 * @param {Object} file - Multer file object
 * @param {String} folder - Subfolder name (e.g., 'items')
 * @returns {Object} - Object with url and path properties matching schema
 */
const uploadImage = async (file, folder = 'items') => {
    try {
        // Create unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const filename = `${folder}-${uniqueSuffix}${fileExtension}`;
        
        // Create full path
        const filepath = path.join(uploadDir, filename);
        
        // Save file to disk
        await fs.promises.writeFile(filepath, file.buffer);
        
        console.log(` Image uploaded: ${filename}`);
        
        // CRITICAL: Return object matching your schema structure
        // Schema expects: { url: String, path: String }
        const imageObject = {
            url: `/uploads/images/${filename}`, // Relative URL for frontend
            path: filepath // Full server path for backend operations
        };
        
        return imageObject;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
    }
};

/**
 * Get image URL (for local storage, return the url from the photo object)
 * @param {String|Object} imageData - Relative path to image or photo object
 * @returns {String} - URL to access the image
 */
const getImage = async (imageData) => {
    try {
        // If it's already a string URL, return it
        if (typeof imageData === 'string') {
            return imageData;
        }
        
        // If it's an object with url property, return the url
        if (imageData && imageData.url) {
            return imageData.url;
        }
        
        // Otherwise return as is
        return imageData;
    } catch (error) {
        console.error(' Error getting image:', error);
        throw new Error('Failed to get image');
    }
};

/**
 * Delete image from local storage
 * @param {String|Object} imageData - Either a path string or photo object with path property
 * @returns {Boolean} - Success status
 */
const deleteImage = async (imageData) => {
    try {
        // Handle both string path and object with path property
        let imagePath;
        
        if (typeof imageData === 'string') {
            imagePath = imageData;
        } else if (imageData && imageData.path) {
            imagePath = imageData.path;
        } else if (imageData && imageData.url) {
            imagePath = imageData.url;
        } else {
            console.error('❌ Invalid image data format');
            return false;
        }
        
        let fullPath;
        
        // If it's a URL path, convert to file system path
        if (imagePath.startsWith('/uploads')) {
            fullPath = path.join(__dirname, '../..', imagePath);
        } else {
            fullPath = imagePath;
        }
        
        // Check if file exists before deleting
        if (fs.existsSync(fullPath)) {
            await fs.promises.unlink(fullPath);
            console.log(` Deleted image: ${fullPath}`);
            return true;
        }
        
        console.log(`Image not found: ${fullPath}`);
        return false;
    } catch (error) {
        console.error('Error deleting image:', error);
        throw new Error('Failed to delete image');
    }
};

/**
 * Delete multiple images
 * @param {Array} imageArray - Array of photo objects or paths
 * @returns {Object} - Results of deletion operations
 */
const deleteMultipleImages = async (imageArray) => {
    const results = {
        success: [],
        failed: []
    };
    
    if (!Array.isArray(imageArray)) {
        console.error('imageArray must be an array');
        return results;
    }
    
    for (const image of imageArray) {
        try {
            const deleted = await deleteImage(image);
            if (deleted) {
                results.success.push(image);
            } else {
                results.failed.push(image);
            }
        } catch (error) {
            console.error('Error deleting image:', error);
            results.failed.push(image);
        }
    }
    
    console.log(`Deleted ${results.success.length} images`);
    if (results.failed.length > 0) {
        console.log(`Failed to delete ${results.failed.length} images`);
    }
    
    return results;
};

module.exports = {
    uploadImage,
    getImage,
    deleteImage,
    deleteMultipleImages
};