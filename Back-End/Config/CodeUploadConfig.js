const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const codeUploadsDir = path.join(__dirname, '../uploads/code-submissions');
if (!fs.existsSync(codeUploadsDir)) {
    fs.mkdirSync(codeUploadsDir, { recursive: true });
    console.log('Created code submissions directory:', codeUploadsDir);
}

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, codeUploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename - userId-projectId-timestamp-originalFilename
        const userId = req.user ? req.user.id : 'unknown';
        const projectId = req.params.projectId || 'unknown';
        const timestamp = Date.now();
        const originalName = file.originalname;

        cb(null, `${userId}-${projectId}-${timestamp}-${originalName}`);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    // Accept common code files and archives
    const allowedExtensions = [
        // Archives
        '.zip', '.rar', '.tar', '.gz',
        // Web files
        '.html', '.css', '.js', '.ts', '.json',
        // Backend files
        '.php', '.py', '.rb', '.java', '.c', '.cpp', '.cs', '.go',
        // Config files
        '.xml', '.yml', '.yaml', '.toml', '.ini',
        // Database
        '.sql'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only code files and archives are allowed.'));
    }
};

// Set up multer upload
const uploadCodeFile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size
    }
}).single('codeFile');


exports.uploadCode = (req, res, next) => {
    try {
        uploadCodeFile(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                console.error('Multer error:', err);
                return res.status(400).json({
                    success: false,
                    message: 'File upload error',
                    error: err.message
                });
            } else if (err) {
                console.error('Upload error:', err);
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }

            // Verify file was received
            if (!req.file) {
                console.error('No file received');
                return res.status(400).json({
                    success: false,
                    message: 'No file received'
                });
            }

            console.log('File uploaded successfully:', req.file.filename);
            next();
        });
    } catch (error) {
        console.error('Unexpected error in upload middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during file upload',
            error: error.message
        });
    }
};

// Error handler for multer
exports.handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: 'File upload error',
            error: err.message
        });
    }
    next(err);
};