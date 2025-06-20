const Client = require("../models/Client");
const Conversation = require("../models/Conversation");
const Document = require("../models/Document");
const Message = require("../models/Message");
const User = require("../models/User");
const { ROLES } = require("../models/User");

/**
 * @desc    Get dashboard statistics and data
 * @route   GET /api/dashboard
 * @access  Private (Admin or client)
 */
exports.getDashboardData = async (req, res) => {
  try {
    let organizationId;

    // Determine organization based on user role
    if (
      req.user.role === ROLES.ORG_ADMIN ||
      req.user.role === ROLES.ORG_CLIENT
    ) {
      // Make sure organization is a string (MongoDB ObjectId)
      organizationId = req.user.organization
        ? req.user.organization.toString()
        : null;

      // Check if organization ID is valid
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "User does not have an associated organization",
        });
      }
    } else if (
      req.user.role === ROLES.SUPER_ADMIN &&
      req.query.organizationId
    ) {
      organizationId = req.query.organizationId;
    } else if (req.user.role === ROLES.SUPER_ADMIN) {
      // Super admin without specified org - return global stats
      return res.status(400).json({
        success: false,
        message: "Organization ID is required for super admin",
      });
    }

    // Get client stats with error handling
    let clientStats;
    try {
      clientStats = await Client.getOrganizationStats(organizationId);
    } catch (error) {
      console.error("Error getting client stats:", error);
      clientStats = {
        statusStats: [],
        projectTypeStats: [],
        totalClients: 0,
      };
    }

    // Get conversation stats with error handling
    let conversationStats;
    try {
      conversationStats = await Conversation.getOrganizationStats(
        organizationId
      );
    } catch (error) {
      console.error("Error getting conversation stats:", error);
      conversationStats = {
        statusStats: [],
        messageStats: { avgMessagesPerConversation: 0, totalMessages: 0 },
        totalConversations: 0,
      };
    }

    // Get document stats with error handling
    let documentStats;
    try {
      documentStats = await Document.getOrganizationStats(organizationId);
    } catch (error) {
      console.error("Error getting document stats:", error);
      documentStats = {
        categoryStats: [],
        fileTypeStats: [],
        totalDocuments: 0,
        totalSize: 0,
      };
    }

    // Get recent clients (limit to 5) with error handling
    let recentClients = [];
    try {
      recentClients = await Client.find({ organization: organizationId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "firstName lastName email");
    } catch (error) {
      console.error("Error getting recent clients:", error);
    }

    // Format clients for frontend with error handling
    let formattedClients = [];
    try {
      formattedClients = await Promise.all(
        recentClients.map(async (client) => {
          try {
            // Get last activity timestamp
            let lastMessage;
            try {
              const conversationIds = await Conversation.find({
                client: client._id,
              }).select("_id");
              lastMessage = await Message.findOne({
                conversation: { $in: conversationIds },
              }).sort({ createdAt: -1 });
            } catch (error) {
              console.error("Error getting last message:", error);
              lastMessage = null;
            }

            const lastActivity = lastMessage
              ? lastMessage.createdAt
              : client.updatedAt;

            // Format last activity as relative time
            const lastActivityRelative = formatRelativeTime(lastActivity);

            // Make sure user data exists
            const firstName = client.user?.firstName || "Unknown";
            const lastName = client.user?.lastName || "User";

            return {
              id: client._id,
              name: `${firstName} ${lastName}`,
              projectType: formatProjectType(client.projectType),
              status: client.status,
              onboardingProgress: client.onboardingProgress || 0,
              lastActivity: lastActivityRelative,
            };
          } catch (error) {
            console.error("Error formatting client:", error);
            return {
              id: client._id || "unknown",
              name: "Unknown Client",
              projectType: "Unknown",
              status: "unknown",
              onboardingProgress: 0,
              lastActivity: "unknown",
            };
          }
        })
      );
    } catch (error) {
      console.error("Error formatting clients:", error);
    }

    // Get recent conversations (limit to 5) with error handling
    let recentConversations = [];
    try {
      recentConversations = await Conversation.find({
        organization: organizationId,
      })
        .sort({ lastMessageAt: -1 })
        .limit(5)
        .populate("client");
    } catch (error) {
      console.error("Error getting recent conversations:", error);
    }

    // Format conversations for frontend with error handling
    let formattedConversations = [];
    try {
      formattedConversations = await Promise.all(
        recentConversations.map(async (conversation) => {
          try {
            // Get client name with error handling
            let clientName = "Unknown Client";
            let clientId = "unknown";
            try {
              if (conversation.client) {
                const client = await Client.findById(
                  conversation.client
                ).populate("user", "firstName lastName");

                if (client && client.user) {
                  clientName = `${client.user.firstName || ""} ${
                    client.user.lastName || ""
                  }`.trim();
                  if (!clientName) clientName = "Unknown Client";
                  clientId = client._id;
                }
              }
            } catch (error) {
              console.error("Error getting client for conversation:", error);
            }

            // Get message count with error handling
            let messageCount = 0;
            try {
              messageCount = await Message.countDocuments({
                conversation: conversation._id,
              });
            } catch (error) {
              console.error("Error getting message count:", error);
            }

            // Format last message time as relative time
            const lastMessageRelative = formatRelativeTime(
              conversation.lastMessageAt || new Date()
            );

            return {
              id: conversation._id,
              title: conversation.title || "Untitled Conversation",
              clientName,
              clientId,
              lastMessageAt: lastMessageRelative,
              status: conversation.status || "active",
              messageCount,
            };
          } catch (error) {
            console.error("Error formatting conversation:", error);
            return {
              id: conversation._id || "unknown",
              title: "Untitled Conversation",
              clientName: "Unknown Client",
              clientId: "unknown",
              lastMessageAt: "unknown",
              status: "unknown",
              messageCount: 0,
            };
          }
        })
      );
    } catch (error) {
      console.error("Error formatting conversations:", error);
    }

    // Format document types for frontend with error handling
    let documentTypes = [];
    try {
      documentTypes = (documentStats.fileTypeStats || []).map((type) => ({
        type: type._id || "unknown",
        count: type.count || 0,
        size:
          (documentStats.categoryStats || []).find(
            (cat) => cat._id === type._id
          )?.totalSize || 0,
      }));
    } catch (error) {
      console.error("Error formatting document types:", error);
    }

    // Calculate active clients with error handling
    let activeClients = 0;
    try {
      activeClients =
        (clientStats.statusStats || []).find((stat) => stat._id === "active")
          ?.count || 0;
    } catch (error) {
      console.error("Error calculating active clients:", error);
    }

    // Return dashboard data
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalClients: clientStats.totalClients,
          activeClients,
          totalConversations: conversationStats.totalConversations,
          totalDocuments: documentStats.totalDocuments,
          totalDocumentSize: documentStats.totalSize,
        },
        clients: formattedClients,
        conversations: formattedConversations,
        documentTypes,
      },
    });
  } catch (error) {
    console.error("Get dashboard data error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

/**
 * Helper function to format project type
 */
function formatProjectType(type) {
  switch (type) {
    case "web_development":
      return "Web Development";
    case "mobile_app":
      return "Mobile App";
    case "design":
      return "Design";
    case "marketing":
      return "Marketing";
    case "other":
      return "Other";
    default:
      return type;
  }
}

/**
 * Helper function to format relative time
 */
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);

  // Convert to seconds
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return "just now";
  }

  // Convert to minutes
  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  }

  // Convert to hours
  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  }

  // Convert to days
  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }

  // Convert to months
  const months = Math.floor(days / 30);

  if (months < 12) {
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }

  // Convert to years
  const years = Math.floor(months / 12);

  return `${years} year${years > 1 ? "s" : ""} ago`;
}
