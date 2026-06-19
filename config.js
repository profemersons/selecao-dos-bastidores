const SUPABASE_URL = "https://wztykabslwojjlsgwtfc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dHlrYWJzbHdvampsc2d3dGZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk0MjYsImV4cCI6MjA5NTkxNTQyNn0.Fad8_eMmT9BGfOOmUwA073Oi65l1cUzIRdd3jp28yvg";

window.client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

function getStickerImage(path) {
    return `${SUPABASE_URL}/storage/v1/object/public/stikers/${path}`;
}