# Onboarding Agent Backend

A Node.js Express backend with JWT authentication for an onboarding agent application.

## Features

- Express.js framework
- MongoDB with Mongoose ORM
- JWT authentication
- Role-based access control (Super Admin, Organization Admin, Organization Client)
- API validation with express-validator
- Security with helmet and CORS

## Project Structure

```
backend/
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Custom middleware
├── models/             # Database models
├── routes/             # API routes
├── utils/              # Utility functions
├── .env                # Environment variables
├── .gitignore          # Git ignore file
├── package.json        # Project dependencies
├── README.md           # Project documentation
└── server.js           # Main application file
```

## User Roles

1. **Super Admin**: Has full access to all features and organizations
2. **Organization Admin**: Can manage users within their organization
3. **Organization Client**: Regular user with limited access

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/onboarding-agent
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d
```

5. Start the development server:

```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Organization Admin

- `GET /api/admin/organizations` - Get admin's organization
- `GET /api/admin/organizations/:id` - Get organization details
- `PUT /api/admin/organizations/:id` - Update organization

### Super Admin

- `GET /api/superadmin/organizations` - Get all organizations
- `POST /api/superadmin/organizations` - Create new organization
- `GET /api/superadmin/organizations/:id` - Get organization details
- `PUT /api/superadmin/organizations/:id` - Update organization
- `DELETE /api/superadmin/organizations/:id` - Delete organization

## License

ISC
