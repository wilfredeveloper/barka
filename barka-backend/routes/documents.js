const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const documentController = require("../controllers/documentController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads/temp"));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to restrict file types
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedFileTypes = [
    // Documents
    ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
    // Spreadsheets
    ".xls", ".xlsx", ".csv", ".ods",
    // Presentations
    ".ppt", ".pptx", ".odp",
    // Images
    ".jpg", ".jpeg", ".png", ".gif", ".svg",
    // Design files
    ".psd", ".ai", ".sketch", ".fig", ".xd",
    // Archives
    ".zip", ".rar", ".7z"
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedFileTypes.includes(ext)) {
    return cb(null, true);
  }
  
  cb(new Error(`Only the following file types are allowed: ${allowedFileTypes.join(", ")}`));
};

// Initialize multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});

// Apply protection to all routes
router.use(protect);

// @route   GET /api/documents
// @desc    Get all documents
// @access  Private (Admin or client)
router.get("/", documentController.getDocuments);

// @route   GET /api/documents/stats
// @desc    Get document statistics
// @access  Private (Admin only)
router.get("/stats", isAdmin, documentController.getDocumentStats);

// @route   GET /api/documents/:id
// @desc    Get single document
// @access  Private (Admin or document owner)
router.get("/:id", documentController.getDocument);

// @route   POST /api/documents
// @desc    Upload new document
// @access  Private (Admin or client)
router.post(
  "/",
  upload.single("file"),
  [
    check("clientId", "Client ID is required").not().isEmpty(),
  ],
  documentController.uploadDocument
);

// @route   PUT /api/documents/:id
// @desc    Update document metadata
// @access  Private (Admin only)
router.put("/:id", isAdmin, documentController.updateDocument);

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Private (Admin only)
router.delete("/:id", isAdmin, documentController.deleteDocument);

module.exports = router;
