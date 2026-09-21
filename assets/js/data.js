/* ==========================================
   KR-Dict — DATA COLLECTIONS
   Semua data di-attach ke window.* agar bisa di-override dari Admin Dashboard
   ========================================== */

/* ==========================================
   HANGEUL (Konsonan & Vokal) — Data lengkap
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
   KOSAKATA TEXTBOOK — SAMPLE (~10 kata/BAB)
   Silakan tambah lebih banyak via Admin Dashboard
   ========================================== */
window.vocabTextbookData = [
    // ============ BAB 1: 자기소개 (Perkenalan diri) ============
    { id: 1,  bab: "BAB 1", hangeul: "한국",      rom: "hanguk",      arti: "Korea Selatan" },
    { id: 2,  bab: "BAB 1", hangeul: "인도네시아", rom: "indonesia",   arti: "Indonesia" },
    { id: 3,  bab: "BAB 1", hangeul: "학생",      rom: "haksaeng",    arti: "pelajar/murid" },
    { id: 4,  bab: "BAB 1", hangeul: "선생님",    rom: "seonsaengnim", arti: "guru" },
    { id: 5,  bab: "BAB 1", hangeul: "회사원",    rom: "hoesawon",    arti: "karyawan perusahaan" },
    { id: 6,  bab: "BAB 1", hangeul: "이름",      rom: "ireum",       arti: "nama" },
    { id: 7,  bab: "BAB 1", hangeul: "국적",      rom: "gukjeok",     arti: "kebangsaan" },
    { id: 8,  bab: "BAB 1", hangeul: "직업",      rom: "jigeop",      arti: "pekerjaan" },
    { id: 9,  bab: "BAB 1", hangeul: "사람",      rom: "saram",       arti: "orang" },
    { id: 10, bab: "BAB 1", hangeul: "나라",      rom: "nara",        arti: "negara" },

    // ============ BAB 2: 생활용품 (Barang sehari-hari) ============
    { id: 11, bab: "BAB 2", hangeul: "이것",      rom: "igeot",       arti: "ini (barang)" },
    { id: 12, bab: "BAB 2", hangeul: "저것",      rom: "jeogeot",     arti: "itu (di sana)" },
    { id: 13, bab: "BAB 2", hangeul: "무엇",      rom: "mueot",       arti: "apa" },
    { id: 14, bab: "BAB 2", hangeul: "연필",      rom: "yeonpil",     arti: "pensil" },
    { id: 15, bab: "BAB 2", hangeul: "볼펜",      rom: "bolpen",      arti: "pulpen" },
    { id: 16, bab: "BAB 2", hangeul: "가위",      rom: "gawi",        arti: "gunting" },
    { id: 17, bab: "BAB 2", hangeul: "시계",      rom: "sigye",       arti: "jam" },
    { id: 18, bab: "BAB 2", hangeul: "컴퓨터",    rom: "keompyuteo",  arti: "komputer" },
    { id: 19, bab: "BAB 2", hangeul: "가방",      rom: "gabang",      arti: "tas" },
    { id: 20, bab: "BAB 2", hangeul: "우산",      rom: "usan",        arti: "payung" },

    // ============ BAB 3: 위치와 장소 (Tempat & lokasi) ============
    { id: 21, bab: "BAB 3", hangeul: "집",        rom: "jip",         arti: "rumah" },
    { id: 22, bab: "BAB 3", hangeul: "방",        rom: "bang",        arti: "kamar" },
    { id: 23, bab: "BAB 3", hangeul: "화장실",    rom: "hwajangsil",  arti: "toilet" },
    { id: 24, bab: "BAB 3", hangeul: "부엌",      rom: "bueok",       arti: "dapur" },
    { id: 25, bab: "BAB 3", hangeul: "거실",      rom: "geosil",      arti: "ruang tamu" },
    { id: 26, bab: "BAB 3", hangeul: "병원",      rom: "byeongwon",   arti: "rumah sakit" },
    { id: 27, bab: "BAB 3", hangeul: "약국",      rom: "yakkuk",      arti: "apotek" },
    { id: 28, bab: "BAB 3", hangeul: "은행",      rom: "eunhaeng",    arti: "bank" },
    { id: 29, bab: "BAB 3", hangeul: "여기",      rom: "yeogi",       arti: "di sini" },
    { id: 30, bab: "BAB 3", hangeul: "어디",      rom: "eodi",        arti: "di mana" },

    // ============ BAB 4: 동작과 사물 (Aksi & benda) ============
    { id: 31, bab: "BAB 4", hangeul: "일하다",    rom: "ilhada",      arti: "bekerja" },
    { id: 32, bab: "BAB 4", hangeul: "공부하다",  rom: "gongbuhada",  arti: "belajar" },
    { id: 33, bab: "BAB 4", hangeul: "운동하다",  rom: "undonghada",  arti: "berolahraga" },
    { id: 34, bab: "BAB 4", hangeul: "쉬다",      rom: "swida",       arti: "istirahat" },
    { id: 35, bab: "BAB 4", hangeul: "자다",      rom: "jada",        arti: "tidur" },
    { id: 36, bab: "BAB 4", hangeul: "가다",      rom: "gada",        arti: "pergi" },
    { id: 37, bab: "BAB 4", hangeul: "오다",      rom: "oda",         arti: "datang" },
    { id: 38, bab: "BAB 4", hangeul: "먹다",      rom: "meokda",      arti: "makan" },
    { id: 39, bab: "BAB 4", hangeul: "마시다",    rom: "masida",      arti: "minum" },
    { id: 40, bab: "BAB 4", hangeul: "보다",      rom: "boda",        arti: "melihat/menonton" },

    // ============ BAB 5: 날짜와 요일 (Hari & tanggal) ============
    { id: 41, bab: "BAB 5", hangeul: "월요일",    rom: "woryoil",     arti: "Senin" },
    { id: 42, bab: "BAB 5", hangeul: "화요일",    rom: "hwayoil",     arti: "Selasa" },
    { id: 43, bab: "BAB 5", hangeul: "수요일",    rom: "suyoil",      arti: "Rabu" },
    { id: 44, bab: "BAB 5", hangeul: "목요일",    rom: "mogyoil",     arti: "Kamis" },
    { id: 45, bab: "BAB 5", hangeul: "금요일",    rom: "geumyoil",    arti: "Jumat" },
    { id: 46, bab: "BAB 5", hangeul: "토요일",    rom: "toyoil",      arti: "Sabtu" },
    { id: 47, bab: "BAB 5", hangeul: "일요일",    rom: "iryoil",      arti: "Minggu" },
    { id: 48, bab: "BAB 5", hangeul: "오늘",      rom: "oneul",       arti: "hari ini" },
    { id: 49, bab: "BAB 5", hangeul: "내일",      rom: "naeil",       arti: "besok" },
    { id: 50, bab: "BAB 5", hangeul: "어제",      rom: "eoje",        arti: "kemarin" },

    // ============ BAB 6: 하루 일과 (Rutinitas sehari-hari) ============
    { id: 51, bab: "BAB 6", hangeul: "아침",      rom: "achim",       arti: "pagi" },
    { id: 52, bab: "BAB 6", hangeul: "점심",      rom: "jeomsim",     arti: "siang" },
    { id: 53, bab: "BAB 6", hangeul: "저녁",      rom: "jeonyeok",    arti: "malam" },
    { id: 54, bab: "BAB 6", hangeul: "일어나다",  rom: "ireonada",    arti: "bangun" },
    { id: 55, bab: "BAB 6", hangeul: "씻다",      rom: "ssitda",      arti: "mencuci" },
    { id: 56, bab: "BAB 6", hangeul: "출근하다",  rom: "chulgeunhada", arti: "berangkat kerja" },
    { id: 57, bab: "BAB 6", hangeul: "퇴근하다",  rom: "toegeunhada", arti: "pulang kerja" },
    { id: 58, bab: "BAB 6", hangeul: "샤워하다",  rom: "syawohada",   arti: "mandi" },
    { id: 59, bab: "BAB 6", hangeul: "청소하다",  rom: "cheongsohada", arti: "bersih-bersih" },
    { id: 60, bab: "BAB 6", hangeul: "산책하다",  rom: "sanchaekhada", arti: "jalan-jalan" },

    // ============ BAB 7: 계절과 날씨 (Cuaca & musim) ============
    { id: 61, bab: "BAB 7", hangeul: "봄",        rom: "bom",         arti: "musim semi" },
    { id: 62, bab: "BAB 7", hangeul: "여름",      rom: "yeoreum",     arti: "musim panas" },
    { id: 63, bab: "BAB 7", hangeul: "가을",      rom: "gaeul",       arti: "musim gugur" },
    { id: 64, bab: "BAB 7", hangeul: "겨울",      rom: "gyeoul",      arti: "musim dingin" },
    { id: 65, bab: "BAB 7", hangeul: "덥다",      rom: "deopda",      arti: "panas" },
    { id: 66, bab: "BAB 7", hangeul: "춥다",      rom: "chupda",      arti: "dingin" },
    { id: 67, bab: "BAB 7", hangeul: "따뜻하다",  rom: "ttatteuthada", arti: "hangat" },
    { id: 68, bab: "BAB 7", hangeul: "시원하다",  rom: "siwonhada",   arti: "sejuk" },
    { id: 69, bab: "BAB 7", hangeul: "비",        rom: "bi",          arti: "hujan" },
    { id: 70, bab: "BAB 7", hangeul: "눈",        rom: "nun",         arti: "salju" },

    // ============ BAB 8: 가족과 친구 (Keluarga & teman) ============
    { id: 71, bab: "BAB 8", hangeul: "가족",      rom: "gajok",       arti: "keluarga" },
    { id: 72, bab: "BAB 8", hangeul: "아버지",    rom: "abeoji",      arti: "ayah" },
    { id: 73, bab: "BAB 8", hangeul: "어머니",    rom: "eomeoni",     arti: "ibu" },
    { id: 74, bab: "BAB 8", hangeul: "형",        rom: "hyeong",      arti: "kakak (laki-laki)" },
    { id: 75, bab: "BAB 8", hangeul: "누나",      rom: "nuna",        arti: "kakak (perempuan)" },
    { id: 76, bab: "BAB 8", hangeul: "동생",      rom: "dongsaeng",   arti: "adik" },
    { id: 77, bab: "BAB 8", hangeul: "친구",      rom: "chingu",      arti: "teman" },
    { id: 78, bab: "BAB 8", hangeul: "아들",      rom: "adeul",       arti: "anak laki-laki" },
    { id: 79, bab: "BAB 8", hangeul: "딸",        rom: "ttal",        arti: "anak perempuan" },
    { id: 80, bab: "BAB 8", hangeul: "부모님",    rom: "bumonim",     arti: "orang tua" },

    // ============ BAB 9: 음식 주문 (Memesan makanan) ============
    { id: 81, bab: "BAB 9", hangeul: "밥",        rom: "bap",         arti: "nasi" },
    { id: 82, bab: "BAB 9", hangeul: "김치",      rom: "gimchi",      arti: "kimchi" },
    { id: 83, bab: "BAB 9", hangeul: "불고기",    rom: "bulgogi",     arti: "bulgogi" },
    { id: 84, bab: "BAB 9", hangeul: "비빔밥",    rom: "bibimbap",    arti: "nasi campur" },
    { id: 85, bab: "BAB 9", hangeul: "라면",      rom: "ramyeon",     arti: "mie instan" },
    { id: 86, bab: "BAB 9", hangeul: "물",        rom: "mul",         arti: "air" },
    { id: 87, bab: "BAB 9", hangeul: "커피",      rom: "keopi",       arti: "kopi" },
    { id: 88, bab: "BAB 9", hangeul: "맛있다",    rom: "masitda",     arti: "enak" },
    { id: 89, bab: "BAB 9", hangeul: "주문하다",  rom: "jumunhada",   arti: "memesan" },
    { id: 90, bab: "BAB 9", hangeul: "식당",      rom: "sikdang",     arti: "restoran" },

    // ============ BAB 10: 물건 구입 (Membeli barang) ============
    { id: 91,  bab: "BAB 10", hangeul: "얼마",    rom: "eolma",       arti: "berapa (harga)" },
    { id: 92,  bab: "BAB 10", hangeul: "비싸다",  rom: "bissada",     arti: "mahal" },
    { id: 93,  bab: "BAB 10", hangeul: "싸다",    rom: "ssada",       arti: "murah" },
    { id: 94,  bab: "BAB 10", hangeul: "현금",    rom: "hyeongeum",   arti: "uang tunai" },
    { id: 95,  bab: "BAB 10", hangeul: "카드",    rom: "kadeu",       arti: "kartu" },
    { id: 96,  bab: "BAB 10", hangeul: "계산하다", rom: "gyesanhada", arti: "membayar" },
    { id: 97,  bab: "BAB 10", hangeul: "옷",      rom: "ot",          arti: "baju" },
    { id: 98,  bab: "BAB 10", hangeul: "신발",    rom: "sinbal",      arti: "sepatu" },
    { id: 99,  bab: "BAB 10", hangeul: "가게",    rom: "gage",        arti: "toko" },
    { id: 100, bab: "BAB 10", hangeul: "사다",    rom: "sada",        arti: "membeli" },

    // ============ BAB 11-30: SAMPLE SINGKAT (5 kata/BAB) ============
    // BAB 11
    { id: 101, bab: "BAB 11", hangeul: "집안일",  rom: "jibanil",     arti: "pekerjaan rumah" },
    { id: 102, bab: "BAB 11", hangeul: "빨래",    rom: "ppallae",     arti: "mencuci baju" },
    { id: 103, bab: "BAB 11", hangeul: "설거지",  rom: "seolgeoji",   arti: "mencuci piring" },
    { id: 104, bab: "BAB 11", hangeul: "쓰레기",  rom: "sseuregi",    arti: "sampah" },
    { id: 105, bab: "BAB 11", hangeul: "청소기",  rom: "cheongsogi",  arti: "vacuum cleaner" },
    // BAB 12
    { id: 106, bab: "BAB 12", hangeul: "버스",    rom: "beoseu",      arti: "bus" },
    { id: 107, bab: "BAB 12", hangeul: "지하철",  rom: "jihacheol",   arti: "kereta bawah tanah" },
    { id: 108, bab: "BAB 12", hangeul: "택시",    rom: "taeksi",      arti: "taksi" },
    { id: 109, bab: "BAB 12", hangeul: "기차",    rom: "gicha",       arti: "kereta" },
    { id: 110, bab: "BAB 12", hangeul: "비행기",  rom: "bihaenggi",   arti: "pesawat" },
    // BAB 13
    { id: 111, bab: "BAB 13", hangeul: "주말",    rom: "jumal",       arti: "akhir pekan" },
    { id: 112, bab: "BAB 13", hangeul: "영화",    rom: "yeonghwa",    arti: "film" },
    { id: 113, bab: "BAB 13", hangeul: "놀다",    rom: "nolda",       arti: "bermain" },
    { id: 114, bab: "BAB 13", hangeul: "쇼핑",    rom: "syoping",     arti: "belanja" },
    { id: 115, bab: "BAB 13", hangeul: "여행",    rom: "yeohaeng",    arti: "perjalanan" },
    // BAB 14
    { id: 116, bab: "BAB 14", hangeul: "왼쪽",    rom: "oenjjok",     arti: "kiri" },
    { id: 117, bab: "BAB 14", hangeul: "오른쪽",  rom: "oreunjjok",   arti: "kanan" },
    { id: 118, bab: "BAB 14", hangeul: "앞",      rom: "ap",          arti: "depan" },
    { id: 119, bab: "BAB 14", hangeul: "뒤",      rom: "dwi",         arti: "belakang" },
    { id: 120, bab: "BAB 14", hangeul: "옆",      rom: "yeop",        arti: "samping" },
    // BAB 15
    { id: 121, bab: "BAB 15", hangeul: "청바지",  rom: "cheongbaji",  arti: "celana jeans" },
    { id: 122, bab: "BAB 15", hangeul: "티셔츠",  rom: "tisyeocheu",  arti: "kaos" },
    { id: 123, bab: "BAB 15", hangeul: "원피스",  rom: "wonpiseu",    arti: "dress" },
    { id: 124, bab: "BAB 15", hangeul: "모자",    rom: "moja",        arti: "topi" },
    { id: 125, bab: "BAB 15", hangeul: "안경",    rom: "angyeong",    arti: "kacamata" },
    // BAB 16
    { id: 126, bab: "BAB 16", hangeul: "아파트",  rom: "apateu",      arti: "apartemen" },
    { id: 127, bab: "BAB 16", hangeul: "월세",    rom: "wolse",       arti: "sewa bulanan" },
    { id: 128, bab: "BAB 16", hangeul: "보증금",  rom: "bojeunggeum", arti: "uang jaminan" },
    { id: 129, bab: "BAB 16", hangeul: "이사",    rom: "isa",         arti: "pindahan" },
    { id: 130, bab: "BAB 16", hangeul: "계약",    rom: "gyeyak",      arti: "kontrak" },
    // BAB 17
    { id: 131, bab: "BAB 17", hangeul: "휴가",    rom: "hyuga",       arti: "cuti" },
    { id: 132, bab: "BAB 17", hangeul: "호텔",    rom: "hotel",       arti: "hotel" },
    { id: 133, bab: "BAB 17", hangeul: "예약",    rom: "yeyak",       arti: "reservasi" },
    { id: 134, bab: "BAB 17", hangeul: "짐",      rom: "jim",         arti: "barang bawaan" },
    { id: 135, bab: "BAB 17", hangeul: "관광",    rom: "gwangwang",   arti: "wisata" },
    // BAB 18
    { id: 136, bab: "BAB 18", hangeul: "취미",    rom: "chwimi",      arti: "hobi" },
    { id: 137, bab: "BAB 18", hangeul: "독서",    rom: "dokseo",      arti: "membaca buku" },
    { id: 138, bab: "BAB 18", hangeul: "음악",    rom: "eumak",       arti: "musik" },
    { id: 139, bab: "BAB 18", hangeul: "그림",    rom: "geurim",      arti: "gambar/lukisan" },
    { id: 140, bab: "BAB 18", hangeul: "사진",    rom: "sajin",       arti: "foto" },
    // BAB 19
    { id: 141, bab: "BAB 19", hangeul: "요리",    rom: "yori",        arti: "memasak" },
    { id: 142, bab: "BAB 19", hangeul: "소금",    rom: "sogeum",      arti: "garam" },
    { id: 143, bab: "BAB 19", hangeul: "설탕",    rom: "seoltang",    arti: "gula" },
    { id: 144, bab: "BAB 19", hangeul: "기름",    rom: "gireum",      arti: "minyak" },
    { id: 145, bab: "BAB 19", hangeul: "끓이다",  rom: "kkeurida",    arti: "merebus" },
    // BAB 20
    { id: 146, bab: "BAB 20", hangeul: "인터넷",  rom: "inteonet",    arti: "internet" },
    { id: 147, bab: "BAB 20", hangeul: "스마트폰", rom: "seumateupon", arti: "smartphone" },
    { id: 148, bab: "BAB 20", hangeul: "이메일",  rom: "imeil",       arti: "email" },
    { id: 149, bab: "BAB 20", hangeul: "검색",    rom: "geomsaek",    arti: "pencarian" },
    { id: 150, bab: "BAB 20", hangeul: "다운로드", rom: "daunrodeu",  arti: "unduh" },
    // BAB 21
    { id: 151, bab: "BAB 21", hangeul: "병원",    rom: "byeongwon",   arti: "rumah sakit" },
    { id: 152, bab: "BAB 21", hangeul: "의사",    rom: "uisa",        arti: "dokter" },
    { id: 153, bab: "BAB 21", hangeul: "간호사",  rom: "ganhosa",     arti: "perawat" },
    { id: 154, bab: "BAB 21", hangeul: "아프다",  rom: "apeuda",      arti: "sakit" },
    { id: 155, bab: "BAB 21", hangeul: "약",      rom: "yak",         arti: "obat" },
    // BAB 22
    { id: 156, bab: "BAB 22", hangeul: "감기",    rom: "gamgi",       arti: "flu" },
    { id: 157, bab: "BAB 22", hangeul: "열",      rom: "yeol",        arti: "demam" },
    { id: 158, bab: "BAB 22", hangeul: "기침",    rom: "gichim",      arti: "batuk" },
    { id: 159, bab: "BAB 22", hangeul: "콧물",    rom: "konmul",      arti: "pilek" },
    { id: 160, bab: "BAB 22", hangeul: "머리",    rom: "meori",       arti: "kepala" },
    // BAB 23
    { id: 161, bab: "BAB 23", hangeul: "우체국",  rom: "ucheguk",     arti: "kantor pos" },
    { id: 162, bab: "BAB 23", hangeul: "편지",    rom: "pyeonji",     arti: "surat" },
    { id: 163, bab: "BAB 23", hangeul: "소포",    rom: "sopo",        arti: "paket" },
    { id: 164, bab: "BAB 23", hangeul: "우표",    rom: "upyo",        arti: "perangko" },
    { id: 165, bab: "BAB 23", hangeul: "보내다",  rom: "bonaeda",     arti: "mengirim" },
    // BAB 24
    { id: 166, bab: "BAB 24", hangeul: "은행",    rom: "eunhaeng",    arti: "bank" },
    { id: 167, bab: "BAB 24", hangeul: "계좌",    rom: "gyejwa",      arti: "rekening" },
    { id: 168, bab: "BAB 24", hangeul: "입금",    rom: "ipgeum",      arti: "setor" },
    { id: 169, bab: "BAB 24", hangeul: "출금",    rom: "chulgeum",    arti: "tarik uang" },
    { id: 170, bab: "BAB 24", hangeul: "환전",    rom: "hwanjeon",    arti: "tukar uang" },
    // BAB 25
    { id: 171, bab: "BAB 25", hangeul: "상담",    rom: "sangdam",     arti: "konsultasi" },
    { id: 172, bab: "BAB 25", hangeul: "교육",    rom: "gyoyuk",      arti: "pendidikan" },
    { id: 173, bab: "BAB 25", hangeul: "지원",    rom: "jiwon",       arti: "dukungan" },
    { id: 174, bab: "BAB 25", hangeul: "근로자",  rom: "geulloja",    arti: "pekerja" },
    { id: 175, bab: "BAB 25", hangeul: "외국인",  rom: "oegugin",     arti: "orang asing" },
    // BAB 26
    { id: 176, bab: "BAB 26", hangeul: "한옥",    rom: "hanok",       arti: "rumah tradisional" },
    { id: 177, bab: "BAB 26", hangeul: "음식",    rom: "eumsik",      arti: "makanan" },
    { id: 178, bab: "BAB 26", hangeul: "예절",    rom: "yejeol",      arti: "etika" },
    { id: 179, bab: "BAB 26", hangeul: "숟가락",  rom: "sutgarak",    arti: "sendok" },
    { id: 180, bab: "BAB 26", hangeul: "젓가락",  rom: "jeotgarak",   arti: "sumpit" },
    // BAB 27
    { id: 181, bab: "BAB 27", hangeul: "생일",    rom: "saengil",     arti: "ulang tahun" },
    { id: 182, bab: "BAB 27", hangeul: "결혼식",  rom: "gyeolhonsik", arti: "pernikahan" },
    { id: 183, bab: "BAB 27", hangeul: "축하",    rom: "chukha",      arti: "selamat" },
    { id: 184, bab: "BAB 27", hangeul: "선물",    rom: "seonmul",     arti: "hadiah" },
    { id: 185, bab: "BAB 27", hangeul: "초대",    rom: "chodae",      arti: "undangan" },
    // BAB 28
    { id: 186, bab: "BAB 28", hangeul: "설날",    rom: "seollal",     arti: "tahun baru Imlek" },
    { id: 187, bab: "BAB 28", hangeul: "추석",    rom: "chuseok",     arti: "hari panen" },
    { id: 188, bab: "BAB 28", hangeul: "송편",    rom: "songpyeon",   arti: "kue beras" },
    { id: 189, bab: "BAB 28", hangeul: "세배",    rom: "sebae",       arti: "sungkem" },
    { id: 190, bab: "BAB 28", hangeul: "한복",    rom: "hanbok",      arti: "pakaian tradisional" },
    // BAB 29
    { id: 191, bab: "BAB 29", hangeul: "인사",    rom: "insa",        arti: "salam" },
    { id: 192, bab: "BAB 29", hangeul: "존댓말",  rom: "jondaenmal",  arti: "bahasa hormat" },
    { id: 193, bab: "BAB 29", hangeul: "반말",    rom: "banmal",      arti: "bahasa informal" },
    { id: 194, bab: "BAB 29", hangeul: "예의",    rom: "yeui",        arti: "sopan santun" },
    { id: 195, bab: "BAB 29", hangeul: "공공장소", rom: "gonggongjangso", arti: "tempat umum" },
    // BAB 30
    { id: 196, bab: "BAB 30", hangeul: "한류",    rom: "hallyu",      arti: "gelombang Korea" },
    { id: 197, bab: "BAB 30", hangeul: "가수",    rom: "gasu",        arti: "penyanyi" },
    { id: 198, bab: "BAB 30", hangeul: "배우",    rom: "baeu",        arti: "aktor" },
    { id: 199, bab: "BAB 30", hangeul: "드라마",  rom: "deurama",     arti: "drama" },
    { id: 200, bab: "BAB 30", hangeul: "음악",    rom: "eumak",       arti: "musik" }
];

/* ==========================================
   GRAMMAR — Data lengkap
   ========================================== */
window.grammarData = [
    {
        struktur: "~입니다 / ~입니까?",
        arti: "Adalah / Apakah (Formal)",
        fungsi: [
            "Digunakan untuk menyatakan atau bertanya secara formal.",
            "입니다 digunakan untuk menyatakan.",
            "입니까? digunakan untuk bertanya."
        ],
        contoh: [
            { kalimat: "저는 학생입니다.", arti: "Saya adalah pelajar." },
            { kalimat: "어느 나라 사람입니까?", arti: "Anda orang negara mana?" }
        ]
    },
    {
        struktur: "~은/는",
        arti: "Partikel Penanda Topik",
        fungsi: [
            "Partikel ini digunakan untuk menunjukkan subjek atau topik pembicaraan.",
            "은 digunakan jika kata sebelumnya berakhiran konsonan.",
            "는 digunakan jika kata sebelumnya berakhiran vokal."
        ],
        contoh: [
            { kalimat: "투안은 목수입니다.", arti: "Tuan adalah tukang kayu." },
            { kalimat: "리리는 중국 사람입니다.", arti: "Riri adalah orang Cina." }
        ]
    },
    {
        struktur: "~이/가",
        arti: "Partikel Penanda Subjek",
        fungsi: [
            "Menunjukkan subjek dalam kalimat.",
            "이 digunakan setelah konsonan.",
            "가 digunakan setelah vokal."
        ],
        contoh: [
            { kalimat: "날씨가 좋습니다.", arti: "Cuacanya bagus." },
            { kalimat: "물이 차갑습니다.", arti: "Airnya dingin." }
        ]
    },
    {
        struktur: "~에",
        arti: "Partikel Waktu/Tempat",
        fungsi: [
            "Menunjukkan waktu atau tempat.",
            "Diletakkan setelah kata waktu atau tempat."
        ],
        contoh: [
            { kalimat: "아침에 운동합니다.", arti: "Saya olahraga di pagi hari." },
            { kalimat: "학교에 갑니다.", arti: "Saya pergi ke sekolah." }
        ]
    },
    {
        struktur: "~에서",
        arti: "Partikel Tempat Aktivitas",
        fungsi: [
            "Menunjukkan tempat berlangsungnya aktivitas.",
            "Berbeda dengan '~에' yang menunjukkan tujuan/arah."
        ],
        contoh: [
            { kalimat: "도서관에서 공부합니다.", arti: "Saya belajar di perpustakaan." },
            { kalimat: "시장에서 사요.", arti: "Saya beli di pasar." }
        ]
    },
    {
        struktur: "~하고 / ~와/과",
        arti: "Dan / Dengan",
        fungsi: [
            "Menghubungkan dua kata benda.",
            "하고 paling umum di percakapan.",
            "와 setelah vokal, 과 setelah konsonan."
        ],
        contoh: [
            { kalimat: "사과하고 바나나를 사요.", arti: "Saya beli apel dan pisang." },
            { kalimat: "친구와 영화를 봐요.", arti: "Saya nonton film dengan teman." }
        ]
    },
    {
        struktur: "~았/었/였~",
        arti: "Bentuk Lampau",
        fungsi: [
            "Menyatakan kejadian yang sudah terjadi.",
            "았 setelah vokal ㅏ,ㅗ",
            "었 setelah vokal lain.",
            "였 setelah 하다."
        ],
        contoh: [
            { kalimat: "어제 영화를 봤어요.", arti: "Kemarin saya nonton film." },
            { kalimat: "밥을 먹었어요.", arti: "Saya sudah makan." }
        ]
    },
    {
        struktur: "~고 싶다",
        arti: "Ingin ~",
        fungsi: [
            "Menyatakan keinginan melakukan sesuatu.",
            "Diletakkan setelah kata kerja dasar."
        ],
        contoh: [
            { kalimat: "한국에 가고 싶어요.", arti: "Saya ingin pergi ke Korea." },
            { kalimat: "물을 마시고 싶어요.", arti: "Saya ingin minum air." }
        ]
    },
    {
        struktur: "~(으)세요",
        arti: "Silakan ~ / Tolong ~",
        fungsi: [
            "Bentuk imperatif sopan.",
            "Digunakan untuk meminta atau memerintah secara halus."
        ],
        contoh: [
            { kalimat: "여기 앉으세요.", arti: "Silakan duduk di sini." },
            { kalimat: "천천히 말씀하세요.", arti: "Tolong bicara pelan-pelan." }
        ]
    },
    {
        struktur: "~지 마세요",
        arti: "Jangan ~",
        fungsi: [
            "Melarang melakukan sesuatu.",
            "Bentuk negatif dari ~(으)세요."
        ],
        contoh: [
            { kalimat: "걱정하지 마세요.", arti: "Jangan khawatir." },
            { kalimat: "여기서 담배를 피우지 마세요.", arti: "Jangan merokok di sini." }
        ]
    },
    {
        struktur: "~(으)ㄹ 수 있다/없다",
        arti: "Bisa / Tidak bisa ~",
        fungsi: [
            "Menyatakan kemampuan atau ketidakmampuan.",
            "있다 berarti bisa, 없다 berarti tidak bisa."
        ],
        contoh: [
            { kalimat: "한국어를 할 수 있어요.", arti: "Saya bisa berbahasa Korea." },
            { kalimat: "운전할 수 없어요.", arti: "Saya tidak bisa menyetir." }
        ]
    },
    {
        struktur: "~아/어서",
        arti: "Karena / Sehingga",
        fungsi: [
            "Menyatakan sebab-akibat.",
            "Tidak boleh diikuti bentuk imperatif."
        ],
        contoh: [
            { kalimat: "비가 와서 집에 있었어요.", arti: "Karena hujan, saya di rumah." },
            { kalimat: "피곤해서 잤어요.", arti: "Karena lelah, saya tidur." }
        ]
    },
    {
        struktur: "~지만",
        arti: "Tetapi / Namun",
        fungsi: [
            "Menyatakan kontras atau pertentangan.",
            "Diletakkan setelah kata kerja/sifat dasar."
        ],
        contoh: [
            { kalimat: "비싸지만 좋아요.", arti: "Mahal tapi bagus." },
            { kalimat: "어렵지만 재미있어요.", arti: "Sulit tapi menyenangkan." }
        ]
    },
    {
        struktur: "~는데",
        arti: "Sedangkan / Sementara",
        fungsi: [
            "Memberi latar belakang, kontras, atau alasan.",
            "Bentuk serbaguna dalam percakapan."
        ],
        contoh: [
            { kalimat: "지금 바쁜데 나중에 만나요.", arti: "Sekarang saya sibuk, nanti kita bertemu." },
            { kalimat: "이건 좋은데 저건 별로예요.", arti: "Yang ini bagus, tapi yang itu kurang." }
        ]
    },
    {
        struktur: "~(으)ㄴ/는/(으)ㄹ",
        arti: "Modifier (kata sifat/kerja → sifat kata benda)",
        fungsi: [
            "(으)ㄴ: kata sifat atau kata kerja lampau.",
            "는: kata kerja sekarang.",
            "(으)ㄹ: kata kerja akan datang."
        ],
        contoh: [
            { kalimat: "예쁜 꽃", arti: "Bunga yang cantik" },
            { kalimat: "먹는 음식", arti: "Makanan yang dimakan" },
            { kalimat: "갈 사람", arti: "Orang yang akan pergi" }
        ]
    }
];

/* ==========================================
   CULTURE DATA — Lengkap (sample 5 BAB pertama)
   ========================================== */
window.CULTURE_DATA = {
    babs: [
        {
            id: 1,
            title: "한국의 인사 예절 (Etika Salam di Korea)",
            pages: [
                {
                    id: 1,
                    korean: "한국에서는 상대에 따라 인사하는 방식이 다릅니다.",
                    arti_full: "Di Korea, cara memberi salam berbeda-beda tergantung pada lawan bicara.",
                    arti_per_kata: [
                        { bagian: "한국에서는", fungsi: "한국 (Korea) + 에서 (di) + 는 (topik)", arti: "Di Korea" },
                        { bagian: "상대에 따라", fungsi: "상대 (lawan bicara) + 에 따라 (tergantung)", arti: "Tergantung pada lawan bicara" },
                        { bagian: "인사하는 방식이", fungsi: "인사하다 (salam) + 는 방식 (cara) + 이 (subjek)", arti: "Cara memberi salam" },
                        { bagian: "다릅니다", fungsi: "다르다 (berbeda) + ㅂ니다 (formal)", arti: "Berbeda" }
                    ]
                },
                {
                    id: 2,
                    korean: "자신보다 나이가 많거나 지위가 높은 사람에게는 안녕하세요? 또는 안녕하십니까? 라고 말하며 고개를 숙이거나 허리를 굽혀 인사합니다.",
                    arti_full: "Kepada orang yang lebih tua atau memiliki jabatan lebih tinggi, ucapkan 'Annyeonghaseyo?' atau 'Annyeonghasimnikka?' sambil menundukkan kepala atau membungkukkan badan saat memberi salam.",
                    arti_per_kata: [
                        { bagian: "자신보다", fungsi: "자신 (diri sendiri) + 보다 (daripada)", arti: "Daripada diri sendiri" },
                        { bagian: "나이가 많거나", fungsi: "나이 (umur) + 가 (subjek) + 많다 (banyak) + 거나 (atau)", arti: "Atau lebih tua" },
                        { bagian: "지위가 높은 사람에게는", fungsi: "지위 (jabatan) + 높다 (tinggi) + 사람 (orang) + 에게 (kepada)", arti: "Kepada orang berjabatan tinggi" },
                        { bagian: "인사합니다", fungsi: "인사하다 (memberi salam) + ㅂ니다 (formal)", arti: "Memberi salam" }
                    ]
                },
                {
                    id: 3,
                    korean: "고개를 숙이거나 허리를 굽히는 것은 상대방에 대한 존경을 나타내는 제스처입니다.",
                    arti_full: "Menundukkan kepala atau membungkukkan badan adalah gestur yang menunjukkan rasa hormat kepada lawan bicara.",
                    arti_per_kata: [
                        { bagian: "고개를 숙이거나", fungsi: "고개 (kepala) + 를 (objek) + 숙이다 (menunduk)", arti: "Menundukkan kepala" },
                        { bagian: "허리를 굽히는 것은", fungsi: "허리 (pinggang) + 굽히다 (membungkuk) + 것 (hal) + 은 (topik)", arti: "Membungkukkan badan" },
                        { bagian: "존경을 나타내는", fungsi: "존경 (hormat) + 나타내다 (menunjukkan)", arti: "Yang menunjukkan rasa hormat" },
                        { bagian: "제스처입니다", fungsi: "제스처 (gestur) + 입니다 (adalah)", arti: "Adalah gestur" }
                    ]
                }
            ]
        },
        {
            id: 2,
            title: "한국에서 알뜰하게 생필품을 구입하는 팁 (Tips Membeli Barang Hemat di Korea)",
            pages: [
                {
                    id: 1,
                    korean: "내용이 곧 업데이트될 예정입니다.",
                    arti_full: "Konten akan segera diperbarui.",
                    arti_per_kata: [
                        { bagian: "내용이", fungsi: "내용 (isi) + 이 (subjek)", arti: "Isi/Konten" }
                    ]
                }
            ]
        },
        {
            id: 3,
            title: "한국의 도시 (Kota di Korea)",
            pages: [
                {
                    id: 1,
                    korean: "내용이 곧 업데이트될 예정입니다.",
                    arti_full: "Konten akan segera diperbarui.",
                    arti_per_kata: [
                        { bagian: "내용이", fungsi: "내용 (isi) + 이 (subjek)", arti: "Isi/Konten" }
                    ]
                }
            ]
        },
        {
            id: 4,
            title: "동작과 사물 (Aksi dan Benda)",
            pages: [
                {
                    id: 1,
                    korean: "내용이 곧 업데이트될 예정입니다.",
                    arti_full: "Konten akan segera diperbarui.",
                    arti_per_kata: [
                        { bagian: "내용이", fungsi: "내용 (isi) + 이 (subjek)", arti: "Isi/Konten" }
                    ]
                }
            ]
        },
        {
            id: 5,
            title: "한국의 좌식 문화 (Budaya Duduk di Lantai Korea)",
            pages: [
                {
                    id: 1,
                    korean: "내용이 곧 업데이트될 예정입니다.",
                    arti_full: "Konten akan segera diperbarui.",
                    arti_per_kata: [
                        { bagian: "내용이", fungsi: "내용 (isi) + 이 (subjek)", arti: "Isi/Konten" }
                    ]
                }
            ]
        }
    ]
};

/* ==========================================
   DOWNLOADS / MATERI — Lengkap
   ========================================== */
window.downloadsData = [
    {
        category: 'textbook',
        title: 'TEXTBOOK 2024',
        desc: 'Textbook Versi Baru Terjemahan Indonesia Lengkap',
        size: 'Google Drive',
        link: 'https://drive.google.com/drive/folders/1AJEIXUcCHfUpRbuMKqpLnSVTqmx50jPe?usp=drive_link',
        icon: 'book',
        color: 'blue'
    },
    {
        category: 'textbook',
        title: 'TEXTBOOK 2024 (KOSONG)',
        desc: 'Textbook Versi Baru Kosongan Lengkap',
        size: 'Google Drive',
        link: 'https://drive.google.com/drive/folders/11eMsZsIT4qdU6WHsWsEM13254a3pkC5Z?usp=drive_link',
        icon: 'book',
        color: 'blue'
    },
    {
        category: 'textbook',
        title: 'TEXTBOOK 2015',
        desc: 'Textbook Versi Lama Terjemahan Indonesia Lengkap',
        size: 'Google Drive',
        link: 'https://drive.google.com/drive/folders/1AIq0IDbSBeOv_yr_qkpgLOs6hFU4FC7t?usp=drive_link',
        icon: 'book-open',
        color: 'blue'
    },
    {
        category: 'textbook',
        title: 'TEXTBOOK 2015 (PERKATA)',
        desc: 'Textbook Versi Lama Terjemahan Indonesia Perkata',
        size: 'Google Drive',
        link: 'https://drive.google.com/drive/folders/1gQJAxuIa50o7QZpL4pozYCiHwBqWYWnF?usp=drive_link',
        icon: 'book-open',
        color: 'blue'
    },
    {
        category: 'grammar',
        title: 'TATA BAHASA TB 2024',
        desc: 'Rangkuman Tata Bahasa Textbook Baru 2024',
        size: 'Google Drive',
        link: 'https://drive.google.com/file/d/1c5LV9GqPE3-Mgny5Wp7AqKI77VsETjzc/view?usp=drive_link',
        icon: 'scroll',
        color: 'purple'
    },
    {
        category: 'vocab',
        title: 'KOSAKATA TB 2024 (ARTI)',
        desc: 'Kumpulan Kosakata Textbook 2024 Lengkap 60 Bab Dengan Arti',
        size: 'Google Drive',
        link: 'https://drive.google.com/file/d/14_w9xsF-3gEUCYbTcsYgiCjaEPEyPTA2/view?usp=drive_link',
        icon: 'languages',
        color: 'green'
    },
    {
        category: 'vocab',
        title: 'KOSAKATA TB 2024 (NO ARTI)',
        desc: 'Kumpulan Kosakata Textbook 2024 Lengkap 60 Bab Tanpa Arti',
        size: 'Google Drive',
        link: 'https://drive.google.com/file/d/14tJ9Q4A2NXsYlYIsK0XGmcvUbihwzZHu/view?usp=drive_link',
        icon: 'languages',
        color: 'green'
    },
    {
        category: 'exam',
        title: 'SOAL GIDOHAE 2025',
        desc: 'Paket Soal Gidohae 2025 Set 1-25 Lengkap Dengan Kunci Jawaban',
        size: 'Google Drive',
        link: 'https://drive.google.com/drive/folders/18v70xiBXyJj7IReTUDuoZ35o6YNoe3C9?usp=drive_link',
        icon: 'file-question',
        color: 'orange'
    }
];
