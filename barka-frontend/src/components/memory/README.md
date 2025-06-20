# Memory & Personalization Dashboard Components

A comprehensive frontend implementation for the Orka PRO hybrid memory system, providing users with complete observability and control over their data and personalization settings.

## 🎯 Overview

The Memory Dashboard provides a state-of-the-art user interface for:

- **Privacy-First Data Management**: Complete control over personal data with strict access controls
- **Comprehensive Observability**: Full transparency into stored data and usage
- **Advanced Personalization Controls**: Granular settings for communication and content adaptation
- **GDPR Compliance**: Data export, deletion, and user rights management
- **Real-Time Settings**: Live updates to privacy and personalization preferences

## 🧩 Components

### 1. MemoryDashboard (`memory-dashboard.tsx`)

**Main dashboard component with tabbed interface:**

- **Overview Tab**: Data statistics, memory types, interests, and recent memories
- **Settings Tab**: Personalization and memory configuration
- **Privacy Tab**: Data rights, export/deletion controls, and privacy status
- **Data View Tab**: Complete transparency dashboard with data usage details

**Key Features:**
- Real-time data loading and updates
- Interactive charts and statistics
- Responsive design for all screen sizes
- Error handling and loading states

### 2. MemorySettingsPanel (`memory-settings-panel.tsx`)

**Comprehensive settings management:**

- **Privacy Levels**: Minimal, Standard, Enhanced, Full
- **Data Retention**: Configurable retention periods (1-3650 days)
- **Personalization Controls**: Enable/disable adaptive features
- **Communication Settings**: Style, length, technical level preferences
- **Organization Sharing**: Control data sharing with organization

**Privacy Levels:**
- **Minimal**: Essential information only, limited personalization
- **Standard**: Balanced approach with moderate personalization
- **Enhanced**: Advanced personalization with detailed tracking
- **Full**: Maximum personalization with comprehensive data collection

### 3. PrivacyControlPanel (`privacy-control-panel.tsx`)

**Complete data rights implementation:**

- **Data Export**: Download all data in JSON format
- **Selective Export**: Export specific data types (profile, memories, interests)
- **Data Deletion**: Permanent deletion with confirmation dialogs
- **Privacy Status**: Real-time privacy and security status
- **User Rights**: Complete overview of data rights and capabilities

**Data Rights Supported:**
- Right to Access (view all stored data)
- Right to Portability (export data)
- Right to Rectification (correct information)
- Right to Erasure (delete data)
- Right to Restrict Processing (control usage)

### 4. DataTransparencyPanel (`data-transparency-panel.tsx`)

**Complete data transparency dashboard:**

- **Data Overview**: Statistics and breakdown of stored information
- **Personalization Usage**: How data is used for personalization
- **Data Sharing**: Information about data sharing and external services
- **Processing Purposes**: Clear explanation of why data is collected
- **User Rights Summary**: Overview of available data rights

**Transparency Features:**
- Collapsible sections for detailed information
- Real-time data refresh capabilities
- Clear explanations of data usage
- Visual indicators for privacy status

## 🔧 API Integration

### Memory API Client (`../lib/memory-api.ts`)

**Comprehensive API client for memory system:**

```typescript
// User Profile Management
await memoryApi.getUserProfile()
await memoryApi.updateUserProfile(field, value)
await memoryApi.getUserInterests(limit)

// Memory Operations
await memoryApi.searchMemories(query, type, limit)

// Privacy and Settings
await memoryApi.getMemorySettings()
await memoryApi.updateMemorySetting(setting, value)
await memoryApi.getTransparencyInfo()

// Data Rights
await memoryApi.exportUserData(dataTypes)
await memoryApi.deleteUserData(dataTypes, confirmation)
```

**Features:**
- Automatic authentication handling
- Error handling and retry logic
- Type-safe API responses
- Privacy validation on all requests

## 🚀 Usage

### Basic Integration

```tsx
import { MemoryDashboard } from '@/components/memory/memory-dashboard';

export default function ProfilePage() {
  return (
    <div>
      <h1>User Profile</h1>
      <MemoryDashboard />
    </div>
  );
}
```

### Custom Integration

```tsx
import { 
  MemorySettingsPanel,
  PrivacyControlPanel,
  DataTransparencyPanel 
} from '@/components/memory';

export default function CustomSettingsPage() {
  const [settings, setSettings] = useState(null);
  
  const handleUpdate = () => {
    // Reload settings
  };

  return (
    <div>
      <MemorySettingsPanel 
        settings={settings} 
        onUpdate={handleUpdate} 
      />
      <PrivacyControlPanel 
        settings={settings}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
```

## 🎨 Styling

The components use **shadcn/ui** components with Tailwind CSS:

- Consistent design system
- Dark/light mode support
- Responsive layouts
- Accessible components
- Custom color schemes for privacy levels

## 🔒 Privacy Features

### Strict Access Controls
- Users can only access their own data
- Authentication required for all operations
- Session-based security validation

### Data Transparency
- Complete visibility into stored data
- Clear explanations of data usage
- Real-time privacy status indicators

### User Control
- Granular privacy settings
- Data export in standard formats
- Permanent data deletion with confirmation
- Opt-out capabilities for all features

## 📱 Responsive Design

The dashboard is fully responsive with:

- **Mobile**: Stacked layout with collapsible sections
- **Tablet**: Two-column grid with optimized spacing
- **Desktop**: Full multi-column layout with sidebar navigation

## 🧪 Testing

### Demo Page

Visit `/dashboard/memory-demo` to see the complete dashboard in action.

### Component Testing

```bash
# Run component tests
npm test src/components/memory/

# Run integration tests
npm test src/lib/memory-api.test.ts
```

## 🔮 Future Enhancements

- **Real-time Updates**: WebSocket integration for live data updates
- **Advanced Analytics**: Detailed usage analytics and insights
- **Export Formats**: Support for CSV, XML, and other formats
- **Bulk Operations**: Batch data management capabilities
- **Mobile App**: Native mobile app integration
- **Accessibility**: Enhanced screen reader and keyboard navigation support

## 📝 Configuration

### Environment Variables

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Memory API endpoints (handled by backend proxy)
# No additional configuration needed
```

### Feature Flags

```typescript
// Enable/disable specific features
const MEMORY_FEATURES = {
  dataExport: true,
  dataDeletion: true,
  advancedSettings: true,
  transparencyDashboard: true,
};
```

This implementation provides a complete, production-ready memory and personalization dashboard that puts users in complete control of their data while providing state-of-the-art personalization capabilities.
