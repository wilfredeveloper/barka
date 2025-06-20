const { ROLES } = require("../models/User");
const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Document = require("../models/Document");
const { validationResult } = require("express-validator");
const path = require("path");
const fs = require("fs");
const util = require("util");
const mkdir = util.promisify(fs.mkdir);

/**
 * @desc    Get all documents (filtered by organization for org admins)
 * @route   GET /api/documents
 * @access  Private (Admin or client)
 */
exports.getDocuments = async (req, res) => {
  try {
    let query = {};
    
    // If org admin, only show documents from their organization
    if (req.user.role === ROLES.ORG_ADMIN) {
      query.organization = req.user.organization;
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // If client, only show their documents
      const client = await Client.findOne({ user: req.user.id });
      if (!client) {
        return res.status(404).json({
          success: false,
          message: "Client not found"
        });
      }
      query.client = client._id;
    }
    
    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Filter by client if provided (for admins)
    if (req.query.client && (req.user.role === ROLES.ORG_ADMIN || req.user.role === ROLES.SUPER_ADMIN)) {
      query.client = req.query.client;
    }
    
    // Filter by conversation if provided
    if (req.query.conversation) {
      query.conversation = req.query.conversation;
    }
    
    const documents = await Document.find(query)
      .populate("client", "projectType status")
      .populate("organization", "name")
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get single document
 * @route   GET /api/documents/:id
 * @access  Private (Admin or document owner)
 */
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate("client", "projectType status")
      .populate("organization", "name")
      .populate("conversation", "title status");
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check if user has permission to view this document
    if (req.user.role === ROLES.ORG_ADMIN && 
        document.organization._id.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this document"
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      const client = await Client.findOne({ user: req.user.id });
      if (!client || client._id.toString() !== document.client._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to access this document"
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Upload new document
 * @route   POST /api/documents
 * @access  Private (Admin or client)
 */
exports.uploadDocument = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file"
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { clientId, conversationId, category, tags } = req.body;

    // Get the client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found"
      });
    }

    // Check if user has permission to upload document for this client
    if (req.user.role === ROLES.ORG_ADMIN && 
        client.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to upload document for this client"
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      // Check if client is the current user
      const userClient = await Client.findOne({ user: req.user.id });
      if (!userClient || userClient._id.toString() !== clientId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to upload document for this client"
        });
      }
    }

    // Check if conversation exists and belongs to the client
    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found"
        });
      }
      
      if (conversation.client.toString() !== clientId) {
        return res.status(400).json({
          success: false,
          message: "Conversation does not belong to this client"
        });
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, "../uploads");
    const clientDir = path.join(uploadsDir, clientId);
    
    if (!fs.existsSync(uploadsDir)) {
      await mkdir(uploadsDir);
    }
    
    if (!fs.existsSync(clientDir)) {
      await mkdir(clientDir);
    }

    // Move file to client directory
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const filePath = path.join(clientDir, fileName);
    
    fs.renameSync(req.file.path, filePath);

    // Create document record
    const document = await Document.create({
      name: req.file.originalname,
      client: clientId,
      organization: client.organization,
      conversation: conversationId,
      fileType: path.extname(req.file.originalname).substring(1),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${clientId}/${fileName}`,
      category: category || "other",
      tags: tags ? tags.split(",") : []
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Update document metadata
 * @route   PUT /api/documents/:id
 * @access  Private (Admin only)
 */
exports.updateDocument = async (req, res) => {
  try {
    let document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check if user has permission to update this document
    if (req.user.role === ROLES.ORG_ADMIN && 
        document.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this document"
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot update document metadata"
      });
    }

    // Update document
    document = await Document.findByIdAndUpdate(
      req.params.id,
      { 
        $set: {
          category: req.body.category,
          tags: req.body.tags,
          extractedText: req.body.extractedText,
          processingStatus: req.body.processingStatus,
          metadata: req.body.metadata
        } 
      },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error("Update document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Delete document
 * @route   DELETE /api/documents/:id
 * @access  Private (Admin only)
 */
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found"
      });
    }

    // Check if user has permission to delete this document
    if (req.user.role === ROLES.ORG_ADMIN && 
        document.organization.toString() !== req.user.organization.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this document"
      });
    } else if (req.user.role === ROLES.ORG_CLIENT) {
      return res.status(403).json({
        success: false,
        message: "Clients cannot delete documents"
      });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, "..", document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database
    await document.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * @desc    Get document statistics for an organization
 * @route   GET /api/documents/stats
 * @access  Private (Admin only)
 */
exports.getDocumentStats = async (req, res) => {
  try {
    let organizationId;
    
    if (req.user.role === ROLES.ORG_ADMIN) {
      organizationId = req.user.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN && req.query.organization) {
      organizationId = req.query.organization;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        success: false,
        message: "Please specify an organization ID"
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access document stats"
      });
    }

    const stats = await Document.getOrganizationStats(organizationId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Get document stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
