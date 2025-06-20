const mongoose = require('mongoose');

async function checkCollections() {
  try {
    await mongoose.connect('mongodb+srv://wilfredeveloper:FMT1JXC8vBOgEnpM@cluster0.cychjl1.mongodb.net/orka_pro?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('\nAll collections:');
    collections.forEach(col => console.log(`- ${col.name}`));
    
    // Check teammembers collection
    const teammembersCount = await db.collection('teammembers').countDocuments();
    console.log(`\nteammembers collection: ${teammembersCount} documents`);
    
    if (teammembersCount > 0) {
      const teammembersSample = await db.collection('teammembers').findOne();
      console.log('\nSample from teammembers:');
      console.log(JSON.stringify(teammembersSample, null, 2));
    }
    
    // Check team_members collection
    const teamMembersCount = await db.collection('team_members').countDocuments();
    console.log(`\nteam_members collection: ${teamMembersCount} documents`);
    
    if (teamMembersCount > 0) {
      const teamMembersSample = await db.collection('team_members').findOne();
      console.log('\nSample from team_members:');
      console.log(JSON.stringify(teamMembersSample, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCollections();
