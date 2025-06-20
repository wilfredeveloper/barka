const mongoose = require('mongoose');
const { User } = require('./models/User');

async function checkUser() {
  try {
    await mongoose.connect('mongodb+srv://wilfredeveloper:FMT1JXC8vBOgEnpM@cluster0.cychjl1.mongodb.net/orka_pro?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    const user = await User.findById('68520b45df9a17bd55e3d691');
    console.log('User data:', JSON.stringify(user, null, 2));
    
    // Also check team members
    const TeamMember = require('./models/TeamMember');
    const teamMembers = await TeamMember.find({ organization: '68520b8adf9a17bd55e3d695' });
    console.log(`\nFound ${teamMembers.length} team members in organization`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
