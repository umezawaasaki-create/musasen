// Supabase / Google Apps Script 接続設定
// SUPABASE
const SUPABASE_URL='https://kphxiahecnckfmxbtbow.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwaHhpYWhlY25ja2ZteGJ0Ym93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NTI2NzQsImV4cCI6MjA5NjEyODY3NH0.K53EsF29rmezEV8igB-7kifp7zJWqT1NpAda2_bkyVg';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

const GAS_URL='https://script.google.com/macros/s/AKfycbxlQu-oxVoZ7K_JWAorO36kwNaQ6GxeZF0QtyJXuGPkF7LiCBLZWBrBpxURevhW9euo/exec';
