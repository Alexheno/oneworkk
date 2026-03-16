require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Clés Supabase manquantes dans le fichier .env !");
}

// Initialisation du client de Base de Données
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = { supabase };
