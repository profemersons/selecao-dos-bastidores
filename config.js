const SUPABASE_URL = "https://rsoqemfprscqlmwexeid.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb3FlbWZwcnNjcWxtd2V4ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwOTM2MjEsImV4cCI6MjA5NzY2OTYyMX0.pK4C_sJeHA5-UEey8Hk46-Ceh5BtALXGTATKpWf84No";

window.client = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const ASSETS = {
  stickersBaseUrl:
    "https://profemersons.github.io/selecao-dos-bastidores/stickers/"
};

function getStickerImage(path) {
  return ASSETS.stickersBaseUrl + path;
}