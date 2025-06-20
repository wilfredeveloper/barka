const mongoose = require('mongoose');
const TeamMember = require('./models/TeamMember');
const { ObjectId } = require('mongoose').Types;

async function checkTeamMembers() {
  try {
    await mongoose.connect('mongodb+srv://wilfredeveloper:FMT1JXC8vBOgEnpM@cluster0.cychjl1.mongodb.net/orka_pro?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    // Check all team members
    const allTeamMembers = await TeamMember.find({});
    console.log(`\nTotal team members in database: ${allTeamMembers.length}`);
    
    if (allTeamMembers.length > 0) {
      console.log('\nFirst team member:');
      console.log(JSON.stringify(allTeamMembers[0], null, 2));
    }
    
    // Check team members by organization
    const orgId = new ObjectId('68520b8adf9a17bd55e3d695');
    const orgTeamMembers = await TeamMember.find({ organization: orgId });
    console.log(`\nTeam members in organization ${orgId}: ${orgTeamMembers.length}`);
    
    // Check team members by organization string
    const orgTeamMembersStr = await TeamMember.find({ organization: '68520b8adf9a17bd55e3d695' });
    console.log(`Team members in organization (string): ${orgTeamMembersStr.length}`);
    
    // Check team members created by user
    const userId = new ObjectId('68520b45df9a17bd55e3d691');
    const userTeamMembers = await TeamMember.find({ createdBy: userId });
    console.log(`Team members created by user ${userId}: ${userTeamMembers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTeamMembers();
