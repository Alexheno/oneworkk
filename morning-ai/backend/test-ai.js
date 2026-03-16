require('dotenv').config();
const { analyzeWorkData } = require('./ai.service');

async function testAI() {
  console.log("🚀 Lancement du test de connexion IA (OpenRouter - Gemini 2.5 Flash Lite)...");
  
  // Fausses données pour tester le raisonnement du modèle
  const fakeEmails = [
    { sender: "Jean (CEO)", subject: "URGENT: Rapport financier Q3", body: "Henri, j'ai absolument besoin du rapport financier avant notre call de 14h aujourd'hui. C'est critique pour les investisseurs." },
    { sender: "Newsletter RH", subject: "Rappel des congés payés", body: "N'oubliez pas de poser vos congés avant le 30 juin." }
  ];
  
  const fakeTeams = [
    { sender: "Marie (Marketing)", text: "Salut, peux-tu valider le logo quand tu as 5 minutes ?" }
  ];
  
  const fakeSchedule = [
    { time: "14:00 - 15:00", title: "Call Investisseurs Q3" }
  ];

  try {
    const result = await analyzeWorkData(fakeEmails, fakeTeams, fakeSchedule);
    console.log("\n✅ RÉPONSE JSON DE L'IA (EXECUTIVE ASSISTANT) :\n");
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error("\n❌ Erreur pendant le test :", e.message);
  }
}

testAI();
