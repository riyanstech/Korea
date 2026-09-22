/* ==========================================
   KR-Dict — DATA COLLECTIONS (v10.0 Minimal)
   ==========================================
   CATATAN PENTING:
   - hangeulData: FULL data (tidak ada JSON, jadi wajib ada di sini)
   - vocabTextbookData, grammarData, CULTURE_DATA, downloadsData:
     Dikosongkan karena sudah ada di /assets/data/*.json
     dan akan di-fetch otomatis oleh app.js
   ========================================== */

/* ==========================================
   HANGEUL (Konsonan & Vokal) — WAJIB TETAP FULL
   Tidak ada JSON fallback, jadi data ini kritikal
   ========================================== */
window.hangeulData = [
    // Konsonan Dasar
    { hangeul: "ㄱ", rom: "g/k", type: "Konsonan Dasar", awal: "G", akhir: "K" },
    { hangeul: "ㄴ", rom: "n", type: "Konsonan Dasar", awal: "N", akhir: "N" },
    { hangeul: "ㄷ", rom: "d/t", type: "Konsonan Dasar", awal: "D", akhir: "T" },
    { hangeul: "ㄹ", rom: "r/l", type: "Konsonan Dasar", awal: "R/L", akhir: "L" },
    { hangeul: "ㅁ", rom: "m", type: "Konsonan Dasar", awal: "M", akhir: "M" },
    { hangeul: "ㅂ", rom: "b/p", type: "Konsonan Dasar", awal: "B", akhir: "P" },
    { hangeul: "ㅅ", rom: "s", type: "Konsonan Dasar", awal: "S", akhir: "T" },
    { hangeul: "ㅇ", rom: "-/ng", type: "Konsonan Dasar", awal: "-", akhir: "NG" },
    { hangeul: "ㅈ", rom: "j", type: "Konsonan Dasar", awal: "J", akhir: "T" },
    { hangeul: "ㅊ", rom: "ch", type: "Konsonan Dasar", awal: "CH", akhir: "T" },
    { hangeul: "ㅋ", rom: "kh", type: "Konsonan Dasar", awal: "KH", akhir: "K" },
    { hangeul: "ㅌ", rom: "th", type: "Konsonan Dasar", awal: "TH", akhir: "T" },
    { hangeul: "ㅍ", rom: "ph", type: "Konsonan Dasar", awal: "PH", akhir: "P" },
    { hangeul: "ㅎ", rom: "h", type: "Konsonan Dasar", awal: "H", akhir: "T" },

    // Konsonan Rangkap
    { hangeul: "ㄲ", rom: "kk", type: "Konsonan Rangkap", awal: "KK", akhir: "K" },
    { hangeul: "ㄸ", rom: "tt", type: "Konsonan Rangkap", awal: "TT", akhir: "-" },
    { hangeul: "ㅃ", rom: "pp", type: "Konsonan Rangkap", awal: "PP", akhir: "-" },
    { hangeul: "ㅆ", rom: "ss", type: "Konsonan Rangkap", awal: "SS", akhir: "T" },
    { hangeul: "ㅉ", rom: "cc", type: "Konsonan Rangkap", awal: "CC", akhir: "-" },

    // Vokal Dasar
    { hangeul: "ㅏ", rom: "a", type: "Vokal Dasar" },
    { hangeul: "ㅑ", rom: "ya", type: "Vokal Dasar" },
    { hangeul: "ㅓ", rom: "eo", type: "Vokal Dasar" },
    { hangeul: "ㅕ", rom: "yeo", type: "Vokal Dasar" },
    { hangeul: "ㅗ", rom: "o", type: "Vokal Dasar" },
    { hangeul: "ㅛ", rom: "yo", type: "Vokal Dasar" },
    { hangeul: "ㅜ", rom: "u", type: "Vokal Dasar" },
    { hangeul: "ㅠ", rom: "yu", type: "Vokal Dasar" },
    { hangeul: "ㅡ", rom: "eu", type: "Vokal Dasar" },
    { hangeul: "ㅣ", rom: "i", type: "Vokal Dasar" },

    // Vokal Rangkap
    { hangeul: "ㅐ", rom: "ae", type: "Vokal Rangkap" },
    { hangeul: "ㅒ", rom: "yae", type: "Vokal Rangkap" },
    { hangeul: "ㅔ", rom: "e", type: "Vokal Rangkap" },
    { hangeul: "ㅖ", rom: "ye", type: "Vokal Rangkap" },
    { hangeul: "ㅘ", rom: "wa", type: "Vokal Rangkap" },
    { hangeul: "ㅙ", rom: "wae", type: "Vokal Rangkap" },
    { hangeul: "ㅚ", rom: "oe", type: "Vokal Rangkap" },
    { hangeul: "ㅝ", rom: "wo", type: "Vokal Rangkap" },
    { hangeul: "ㅞ", rom: "we", type: "Vokal Rangkap" },
    { hangeul: "ㅟ", rom: "wi", type: "Vokal Rangkap" },
    { hangeul: "ㅢ", rom: "ui", type: "Vokal Rangkap" }
];

/* ==========================================
   FALLBACK KOSONG — akan di-fetch dari JSON
   ========================================== */
window.vocabTextbookData = [];
window.grammarData = [];
window.CULTURE_DATA = { babs: [] };
window.downloadsData = [];
