const { supabase } = require('./supabase');

async function testSupabaseConnection() {
  console.log("Tentative de connexion à Supabase...");
  
  // Petite requête simple sur une table système ou une vérification Auth générique
  // Juste pour s'assurer que les clés permettent le dialogue avec l'API
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error("❌ Erreur de connexion Supabase:", error.message);
  } else {
    console.log("✅ Connexion à Supabase validée ! Projet lié avec succès.");
  }
}

testSupabaseConnection();
