import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const Participant = mongoose.model('Participant', new mongoose.Schema({ name: String }));
  const Ranking = mongoose.model('Ranking', new mongoose.Schema({
    runId: String,
    participantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant' },
    rank: Number,
    reciprocalScore: Number
  }));
  
  const allRankings = await Ranking.find({}).populate('participantId candidateId');
  console.log('Total rankings:', allRankings.length);
  
  // Group by participantId
  const byParticipant = {};
  for (const r of allRankings) {
    const pName = r.participantId?.name || 'Unknown P';
    const cName = r.candidateId?.name || 'Unknown C';
    if (!byParticipant[pName]) byParticipant[pName] = [];
    byParticipant[pName].push({
      runId: r.runId,
      cand: cName,
      rank: r.rank,
      score: r.reciprocalScore
    });
  }

  for (const [pName, rList] of Object.entries(byParticipant)) {
    const candCounts = {};
    rList.forEach(item => {
      candCounts[item.cand] = (candCounts[item.cand] || 0) + 1;
    });
    const dupes = Object.entries(candCounts).filter(([_, c]) => c > 1);
    if (dupes.length > 0) {
      console.log(`Participant "${pName}" has candidate duplicates in DB:`, dupes.slice(0, 5));
    }
  }

  await mongoose.disconnect();
}
check();
