const mongoose = require('mongoose');
const { User, ROLES } = require('./models/User');
const Organization = require('./models/Organization');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/onboarding-agent')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Could not connect to MongoDB', err);
    process.exit(1);
  });

// Create a super admin user
const createSuperAdmin = async () => {
  try {
    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN });
    
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      return existingSuperAdmin;
    }
    
    // Create super admin
    const superAdmin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@example.com',
      password: 'password123',
      role: ROLES.SUPER_ADMIN
    });
    
    console.log('Super admin created successfully');
    return superAdmin;
  } catch (error) {
    console.error('Error creating super admin:', error);
    throw error;
  }
};

// Create an organization
const createOrganization = async (createdBy) => {
  try {
    // Check if organization already exists
    const existingOrg = await Organization.findOne({ name: 'Test Organization' });
    
    if (existingOrg) {
      console.log('Organization already exists');
      return existingOrg;
    }
    
    // Create organization
    const organization = await Organization.create({
      name: 'Test Organization',
      description: 'A test organization',
      contactEmail: 'contact@testorg.com',
      website: 'https://testorg.com',
      createdBy: createdBy._id
    });
    
    console.log('Organization created successfully');
    return organization;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
};

// Create an organization admin
const createOrgAdmin = async (organization) => {
  try {
    // Check if org admin already exists
    const existingOrgAdmin = await User.findOne({ 
      role: ROLES.ORG_ADMIN,
      organization: organization._id
    });
    
    if (existingOrgAdmin) {
      console.log('Organization admin already exists');
      return existingOrgAdmin;
    }
    
    // Create org admin
    const orgAdmin = await User.create({
      firstName: 'Org',
      lastName: 'Admin',
      email: 'orgadmin@example.com',
      password: 'password123',
      role: ROLES.ORG_ADMIN,
      organization: organization._id
    });
    
    console.log('Organization admin created successfully');
    return orgAdmin;
  } catch (error) {
    console.error('Error creating organization admin:', error);
    throw error;
  }
};

// Create an organization client
const createOrgClient = async (organization) => {
  try {
    // Check if org client already exists
    const existingOrgClient = await User.findOne({ 
      role: ROLES.ORG_CLIENT,
      organization: organization._id
    });
    
    if (existingOrgClient) {
      console.log('Organization client already exists');
      return existingOrgClient;
    }
    
    // Create org client
    const orgClient = await User.create({
      firstName: 'Client',
      lastName: 'User',
      email: 'client@example.com',
      password: 'password123',
      role: ROLES.ORG_CLIENT,
      organization: organization._id
    });
    
    console.log('Organization client created successfully');
    return orgClient;
  } catch (error) {
    console.error('Error creating organization client:', error);
    throw error;
  }
};

// Run the test
const runTest = async () => {
  try {
    // Create super admin
    const superAdmin = await createSuperAdmin();
    
    // Create organization
    const organization = await createOrganization(superAdmin);
    
    // Create org admin
    const orgAdmin = await createOrgAdmin(organization);
    
    // Create org client
    const orgClient = await createOrgClient(organization);
    
    console.log('\nTest completed successfully!');
    console.log('\nCreated entities:');
    console.log('- Super Admin:', superAdmin.email);
    console.log('- Organization:', organization.name);
    console.log('- Org Admin:', orgAdmin.email);
    console.log('- Org Client:', orgClient.email);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Run the test
runTest();
