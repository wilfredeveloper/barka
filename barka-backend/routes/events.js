const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// Get all events for an organization with filtering and search
router.get('/', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const {
      organizationId: requestedOrgId,
      dateRange = 'all',
      eventType = 'all',
      status = 'all',
      search = '',
      sortBy = 'date',
      sortOrder = 'asc',
      page = 1,
      limit = 50
    } = req.query;

    // Determine the organization ID to use
    let organizationId = requestedOrgId;
    
    // If no organizationId provided, use the user's organization
    if (!organizationId && req.user.organization) {
      organizationId = req.user.organization.toString();
    }
    
    // For super_admin, organizationId is required in query params
    if (req.user.role === 'super_admin' && !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required for super admin access'
      });
    }
    
    // For org_admin, use their organization if no organizationId provided
    if (req.user.role === 'org_admin') {
      if (!req.user.organization) {
        return res.status(400).json({
          success: false,
          error: 'User organization not found. Please contact support.'
        });
      }
      
      // If organizationId provided, ensure it matches user's organization
      if (requestedOrgId && requestedOrgId !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot access other organization data'
        });
      }
      
      // Use user's organization
      organizationId = req.user.organization.toString();
    }

    // Final validation of organization ID
    if (!organizationId || !ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid organization ID is required'
      });
    }

    // Build query
    const query = {
      organizationId: new ObjectId(organizationId)
    };

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate, endDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = now;
          endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = now;
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (startDate && endDate) {
        query.startTime = {
          $gte: startDate,
          $lt: endDate
        };
      }
    }

    // Event type filter
    if (eventType !== 'all') {
      query.eventType = eventType;
    }

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Search filter
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { 'attendees.email': searchRegex },
        { 'attendees.name': searchRegex }
      ];
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'date':
        sortOptions.startTime = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'title':
        sortOptions.title = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'type':
        sortOptions.eventType = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'status':
        sortOptions.status = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sortOptions.startTime = 1; // Default to ascending by date
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await db.collection('scheduled_events')
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Get total count for pagination
    const totalCount = await db.collection('scheduled_events').countDocuments(query);

    // Convert ObjectIds to strings for frontend
    const formattedEvents = events.map(event => ({
      ...event,
      _id: event._id.toString(),
      organizationId: event.organizationId.toString(),
      clientId: event.clientId ? event.clientId.toString() : null
    }));

    res.json({
      success: true,
      events: formattedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      },
      filters: {
        dateRange,
        eventType,
        status,
        search,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

// Get single event by ID
router.get('/:eventId', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { eventId } = req.params;

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const event = await db.collection('scheduled_events')
      .findOne({ _id: new ObjectId(eventId) });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    // Convert ObjectIds to strings
    const formattedEvent = {
      ...event,
      _id: event._id.toString(),
      organizationId: event.organizationId.toString(),
      clientId: event.clientId ? event.clientId.toString() : null
    };

    res.json({
      success: true,
      event: formattedEvent
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event'
    });
  }
});

// Update event status
router.patch('/:eventId', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { eventId } = req.params;
    const { status, title, description, startTime, endTime, attendees } = req.body;

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    // Build update object
    const updateData = {
      updatedAt: new Date()
    };

    if (status) {
      const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
      }
      updateData.status = status;
    }

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (attendees) updateData.attendees = attendees;

    const result = await db.collection('scheduled_events')
      .updateOne(
        { _id: new ObjectId(eventId) },
        { $set: updateData }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully',
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete event
router.delete('/:eventId', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { eventId } = req.params;

    if (!ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID'
      });
    }

    const result = await db.collection('scheduled_events')
      .deleteOne({ _id: new ObjectId(eventId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Get event statistics for dashboard
router.get('/stats/overview', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const { organizationId: requestedOrgId } = req.query;

    // Determine the organization ID to use
    let organizationId = requestedOrgId;

    // If no organizationId provided, use the user's organization
    if (!organizationId && req.user.organization) {
      organizationId = req.user.organization.toString();
    }

    // For super_admin, organizationId is required in query params
    if (req.user.role === 'super_admin' && !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required for super admin access'
      });
    }

    // For org_admin, use their organization if no organizationId provided
    if (req.user.role === 'org_admin') {
      if (!req.user.organization) {
        return res.status(400).json({
          success: false,
          error: 'User organization not found. Please contact support.'
        });
      }

      // If organizationId provided, ensure it matches user's organization
      if (requestedOrgId && requestedOrgId !== req.user.organization.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Cannot access other organization data'
        });
      }

      // Use user's organization
      organizationId = req.user.organization.toString();
    }

    // Final validation of organization ID
    if (!organizationId || !ObjectId.isValid(organizationId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid organization ID is required'
      });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Aggregate statistics
    const stats = await db.collection('scheduled_events').aggregate([
      {
        $match: {
          organizationId: new ObjectId(organizationId)
        }
      },
      {
        $facet: {
          totalEvents: [{ $count: "count" }],
          thisMonth: [
            {
              $match: {
                startTime: { $gte: startOfMonth, $lte: endOfMonth }
              }
            },
            { $count: "count" }
          ],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ],
          byType: [
            {
              $group: {
                _id: "$eventType",
                count: { $sum: 1 }
              }
            }
          ],
          upcoming: [
            {
              $match: {
                startTime: { $gte: now },
                status: { $in: ["scheduled", "confirmed"] }
              }
            },
            { $count: "count" }
          ]
        }
      }
    ]).toArray();

    const result = stats[0];

    res.json({
      success: true,
      stats: {
        total: result.totalEvents[0]?.count || 0,
        thisMonth: result.thisMonth[0]?.count || 0,
        upcoming: result.upcoming[0]?.count || 0,
        byStatus: result.byStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byType: result.byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error fetching event statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event statistics'
    });
  }
});

module.exports = router;
