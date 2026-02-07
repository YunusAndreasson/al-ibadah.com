/**
 * Updates canonical forms in italicized-terms.json with proper Arabic transliteration.
 * Uses: ḥ(ح) ṣ(ص) ṭ(ط) ḍ(ض) ẓ(ظ) k̲h(خ) s̲h(ش) t̲h(ث) d̲h(ذ) g̲h(غ) ā ī ū ´(ع) '(ء)
 */
import fs from 'node:fs'
import { normalizeArabic } from '../src/lib/normalize-arabic.js'

const U = '\u0332' // COMBINING LOW LINE for digraph underlines

// Full proper transliteration for all canonical forms
const PROPER: Record<string, string> = {
  // hadithSources
  'al-bukhari': `al-Buk${U}hārī`,
  'muslim': 'Muslim',
  'abu dawud': 'Abū Dāwūd',
  'at-tirmithi': `at-Tirmid${U}hī`,
  'an-nasai': 'an-Nasā\u2019ī',
  'ibn majah': 'Ibn Mājah',
  'ahmad': 'Aḥmad',
  'al-hakim': 'al-Ḥākim',
  'ad-daraqutni': 'ad-Dāraquṭnī',
  'ibn khuzaymah': `Ibn K${U}huzaymah`,
  'al-bayhaqi': 'al-Bayhaqī',
  'at-tabarani': 'aṭ-Ṭabarānī',
  // hadithBooks
  'sahih': 'Ṣaḥīḥ',
  'sahih al-bukhari': `Ṣaḥīḥ al-Buk${U}hārī`,
  'sahih muslim': 'Ṣaḥīḥ Muslim',
  'al-sahihayn': 'aṣ-Ṣaḥīḥayn',
  'sunan': 'Sunan',
  'musnad': 'Musnad',
  'hasan': 'ḥasan',
  'riyad us-salihin': 'Riyāḍ uṣ-Ṣāliḥīn',
  'bulugh al-maram': `Bulūg${U}h al-Marām`,
  'zadul-maad': 'Zādul-Ma\u00B4ād',
  'al-silsilah as-sahihah': 'al-Silsilah aṣ-Ṣaḥīḥah',
  'sahih al-jami': 'Ṣaḥīḥ al-Jāmi\u00B4',
  // coreTerms
  'sunnah': 'sunnah',
  'hadith': `ḥadīt${U}h`,
  'ahadith': `aḥādīt${U}h`,
  'tawhid': 'tawḥīd',
  'shirk': `s${U}hirk`,
  'kufr': 'kufr',
  'iman': 'īmān',
  'fiqh': 'fiqh',
  'salaf': 'salaf',
  'aqidah': '\u00B4aqīdah',
  'tafsir': 'tafsīr',
  'ijtihad': 'ijtihād',
  'tawil': 'ta\u2019wīl',
  'ikhlas': `ik${U}hlāṣ`,
  'tawakkul': 'tawakkul',
  'taqwa': 'taqwā',
  'tawbah': 'tawbah',
  'fitrah': 'fiṭrah',
  'fitnah': 'fitnah',
  'riya': 'riyā\u2019',
  'tawassul': 'tawassul',
  'sihr': 'siḥr',
  'ruqyah': 'ruqyah',
  'jinn': 'jinn',
  'mushaf': 'muṣḥaf',
  'wali': 'walī',
  'awliya': 'awliyā\u2019',
  'djihad': 'djihād',
  'muhkam': 'muḥkam',
  'mutashabih': `mutas${U}hābih`,
  'istawa': 'istawā',
  'istawla': 'istawlā',
  'uluww': '\u00B4uluww',
  'arsh': `\u00B4Ars${U}h`,
  'al-fatihah': 'al-Fātiḥah',
  'dajjal': 'Dajjāl',
  'qarin': 'qarīn',
  // prayerTerms
  'salah': 'ṣalāh',
  'taslim': 'taslīm',
  'takbir': 'takbīr',
  'tashahhud': `tas${U}hahhud`,
  'qiblah': 'qiblah',
  'iqamah': 'iqāmah',
  'qunut': 'qunūt',
  'sutrah': 'sutrah',
  'witr': 'witr',
  'tarawih': 'tarāwīḥ',
  'sujud at-tilawah': 'sujūd at-tilāwah',
  'tasbih': 'tasbīḥ',
  'tahmid': 'taḥmīd',
  'tahlil': 'tahlīl',
  'amin': 'āmīn',
  'tajwid': 'tajwīd',
  'istikharah': `istik${U}hārah`,
  'tilawah': 'tilāwah',
  // purificationTerms
  'ghusl': `g${U}husl`,
  'tayammum': 'tayammum',
  'wudu': 'wuḍū\u2019',
  'muwalah': 'muwālāh',
  'janabah': 'janābah',
  'junub': 'junub',
  'madhi': `mad${U}hī`,
  'mani': 'manī',
  'wadi': 'wadī',
  // fastingTerms
  'ramadan': 'ramaḍān',
  'sahur': 'saḥūr',
  'iftar': 'ifṭār',
  'itikaf': 'i\u2019tikāf',
  'eid': '\u00B4eid',
  'eid al-adha': '\u00B4eid al-aḍḥā',
  'eid al-fitr': '\u00B4eid al-fiṭr',
  // hajjTerms
  'ihram': 'iḥrām',
  'tawaf': 'ṭawāf',
  'tawaf ul-wada': 'ṭawāf ul-wadā\u2019',
  'tawaf ul-ifadah': 'ṭawāf ul-ifāḍah',
  'tawaf uz-ziyarah': 'ṭawāf uz-ziyārah',
  'sai': 'sa\u00B4ī',
  'umrah': '\u00B4umrah',
  'miqat': 'mīqāt',
  'mawaqit': 'mawāqīt',
  'talbiyyah': 'talbiyyah',
  'muhrim': 'muḥrim',
  'mutamatti': 'mutamatti\u00B4',
  'mufrid': 'mufrid',
  'qiran': 'qirān',
  'hajjul-tamattu': 'ḥajjul-tamattu\u00B4',
  'hajjul-qiran': 'ḥajjul-qirān',
  'hajjul-ifrad': 'ḥajjul-ifrād',
  'fidyah': 'fidyah',
  'izar': 'izār',
  'rida': 'ridā\u2019',
  'al-tarwiyah': 'al-tarwiyah',
  'tashriq': `tas${U}hrīq`,
  'aqiqah': '\u00B4aqīqah',
  // hajjLocations
  'arafat': '\u00B4Arafāt',
  'muzdalifah': 'Muzdalifah',
  'mina': 'Minā',
  // monthNames
  'shawwal': `s${U}hawwāl`,
  'dhul-hijjah': `d${U}hul-ḥijjah`,
  'muharram': 'muḥarram',
  'safar': 'ṣafar',
  'rajab': 'rajab',
  'shaban': `s${U}ha\u00B4bān`,
  'thul-qadah': `d${U}hul-qa\u00B4dah`,
  // zakatTerms
  'zakatul-fitr': 'zakātul-fiṭr',
  'sa': 'ṣā\u00B4',
  'nisab': 'niṣāb',
  'hawl': 'ḥawl',
  'mithqal': `mit${U}hqāl`,
  'sadaqah': 'ṣadaqah',
  // familyTerms
  'mahram': 'maḥram',
  'awrah': '\u00B4awrah',
  'iddah': '\u00B4iddah',
  'nikah': 'nikāḥ',
  'zihar': 'ẓihār',
  // clothingTerms
  'burqa': 'burqa\u2019',
  'niqab': 'niqāb',
  'hijab': 'ḥijāb',
  'khimar': `k${U}himār`,
  'qamis': 'qamīṣ',
  // phrases
  'allahu akbar': 'Allāhu akbar',
  'la ilaha illallah': 'Lā ilāha illAllāh',
  'al-hamdu lillah': 'al-Ḥamdu Lillāh',
  'subhan allah': 'Subḥān Allāh',
  'salam': 'salām',
  'bismillah': 'Bismillāh',
  // scholarlyTerms
  'shaykh ul-islam': `s${U}hayk${U}h ul-islām`,
  'shaykh': `s${U}hayk${U}h`,
  'tabiin': 'tābi\u2019īn',
  'ahlus-sunnah': 'ahlus-sunnah',
  'ahlus-sunnah wal-jamaat': 'ahlus-sunnah wal-jamā\u00B4at',
  'jahmiyyah': 'jahmiyyah',
  'rafidi': 'rāfiḍī',
  'mujahidin': 'mujāhidīn',
  // tawhidTerms
  'tawhid ar-rububiyyah': 'tawḥīd ar-rubūbiyyah',
  'tawhid al-uluhiyyah': 'tawḥīd al-ulūhiyyah',
  'tawhid al-asma was-sifat': 'tawḥīd al-asmā\u2019 waṣ-ṣifāt',
  // miswakAndOther
  'miswak': 'miswāk',
  'kohl': 'kuḥl',
}

// Variant updates (proper transliteration for variant forms)
const VARIANT_MAP: Record<string, string> = {
  'bukhari': `Buk${U}hārī`,
  'at-tirmidhi': `at-Tirmid${U}hī`,
  'tirmithi': `Tirmit${U}hī`,
  'tirmidhi': `Tirmid${U}hī`,
  'al-tirmithi': `al-Tirmit${U}hī`,
  'nasai': 'Nasā\u2019ī',
  'imam ahmad': 'Imām Aḥmad',
  'daraqutni': 'Dāraquṭnī',
  'tabarani': 'Ṭabarānī',
  'zad ul-maad': 'Zād ul-Ma\u00B4ād',
  'sunnahs': 'sunnahs',
  'hadithen': `ḥadīt${U}hen`,
  'hadither': `ḥadīt${U}her`,
  'jihad': 'jihād',
  'mutashabihat': `mutas${U}hābihāt`,
  'fatihah': 'Fātiḥah',
  'ad-dajjal': 'ad-Dajjāl',
  'sujud at-tilawah': 'sujūd at-tilāwah',
  'sujud al-tilawah': 'sujūd al-tilāwah',
  'sajdatut-tilawah': 'sajdatut-tilāwah',
  'suhur': 'suḥūr',
  'tawaful-wada': 'ṭawāful-wadā\u2019',
  'tawaf ul-ifadhah': `ṭawāf ul-ifād${U}hah`,
  'al-hamdulillah': 'al-ḥamdulillāh',
  'subhan-allah': 'Subḥan-Allāh',
  'shaykh al-islam': `s${U}hayk${U}h al-islām`,
  'kuhl': 'kuḥl',
}

// Load and update JSON
const json = JSON.parse(fs.readFileSync('src/data/italicized-terms.json', 'utf-8'))

let updatedCanonical = 0
let updatedVariant = 0
let notInMap = 0

for (const [catKey, cat] of Object.entries(json.categories) as [string, any][]) {
  for (const term of cat.terms) {
    // Update canonical
    const n = normalizeArabic(term.canonical)
    if (PROPER[n]) {
      if (term.canonical !== PROPER[n]) {
        term.canonical = PROPER[n]
        updatedCanonical++
      }
    } else if (catKey !== 'swedishTerms') {
      notInMap++
      console.log('Not in PROPER map:', term.canonical, '→ norm:', n)
    }

    // Update variants
    term.variants = term.variants.map((v: string) => {
      const vn = normalizeArabic(v)
      if (VARIANT_MAP[vn] && v !== VARIANT_MAP[vn]) {
        updatedVariant++
        return VARIANT_MAP[vn]
      }
      return v
    })
  }
}

console.log(`Updated ${updatedCanonical} canonicals, ${updatedVariant} variants, ${notInMap} not in map`)
fs.writeFileSync('src/data/italicized-terms.json', JSON.stringify(json, null, 2) + '\n')
console.log('Saved updated JSON')
