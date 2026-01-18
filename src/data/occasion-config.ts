/**
 * Occasion Configuration
 * Maps occasions to content sources for the startpage
 */

import type { OccasionType } from '~/lib/hijri'

export interface ContentSource {
  type: 'subcategory' | 'path' | 'keyword'
  value: string
}

export interface OccasionContentConfig {
  titleSv: string
  titleAr: string
  contentSources: ContentSource[]
  minWordCount?: number
}

export const OCCASION_CONTENT_CONFIG: Record<
  OccasionType | 'deep-reads' | 'important-questions',
  OccasionContentConfig
> = {
  // Ramadan content
  ramadan: {
    titleSv: 'Ramadan',
    titleAr: 'رمضان',
    contentSources: [
      { type: 'subcategory', value: 'fasta/vad-som-bryter-eller-inte-bryter-fastan' },
      { type: 'subcategory', value: 'fasta/nattbon' },
      { type: 'subcategory', value: 'fasta/bryta-och-paborja-fastan' },
      { type: 'subcategory', value: 'fasta/de-som-bara-ber-under-ramadan' },
      { type: 'subcategory', value: 'fasta/resenarens-fasta' },
      { type: 'subcategory', value: 'fasta/den-sjukes-och-aldres-fasta' },
    ],
  },

  // Laylatul Qadr content
  'laylatul-qadr': {
    titleSv: 'Allmaktens natt',
    titleAr: 'ليلة القدر',
    contentSources: [
      { type: 'subcategory', value: 'fasta/nattbon' },
      { type: 'keyword', value: 'allmakten' },
      { type: 'keyword', value: 'laylatul' },
    ],
  },

  // Eid al-Fitr content
  'eid-al-fitr': {
    titleSv: 'Eid al-Fitr',
    titleAr: 'عيد الفطر',
    contentSources: [
      { type: 'subcategory', value: 'fasta/frivillig-fasta' },
      { type: 'keyword', value: 'eid' },
      { type: 'keyword', value: 'shawwal' },
    ],
  },

  // Hajj season content
  'hajj-season': {
    titleSv: 'Hajj-säsongen',
    titleAr: 'موسم الحج',
    contentSources: [
      { type: 'subcategory', value: 'vallfard/riterna-under-vallfarden' },
      { type: 'subcategory', value: 'vallfard/tawaf-och-sai' },
      { type: 'subcategory', value: 'vallfard/sta-vid-arafat' },
      { type: 'subcategory', value: 'vallfard/stenkastningen' },
      { type: 'subcategory', value: 'vallfard/ihram-och-avsikten-infor-vallfarden' },
      { type: 'subcategory', value: 'vallfard/adha-offret' },
    ],
  },

  // Day of Arafah content
  'day-of-arafah': {
    titleSv: 'Arafatdagen',
    titleAr: 'يوم عرفة',
    contentSources: [
      { type: 'subcategory', value: 'vallfard/sta-vid-arafat' },
      { type: 'keyword', value: 'arafat' },
      {
        type: 'path',
        value: '/fasta/frivillig-fasta/arafat-dagen-frivillig-fasta-for-de-som-inte-vallf',
      },
    ],
  },

  // Eid al-Adha content
  'eid-al-adha': {
    titleSv: 'Eid al-Adha',
    titleAr: 'عيد الأضحى',
    contentSources: [
      { type: 'subcategory', value: 'vallfard/adha-offret' },
      { type: 'subcategory', value: 'vallfard/offerdjuret' },
      { type: 'keyword', value: 'offer' },
    ],
  },

  // Ashura content
  ashura: {
    titleSv: 'Ashura',
    titleAr: 'يوم عاشوراء',
    contentSources: [
      { type: 'keyword', value: 'ashura' },
      { type: 'path', value: '/fasta/frivillig-fasta/ashura-fastan' },
      { type: 'path', value: '/fasta/frivillig-fasta/fasta-under-ashura-dagen' },
    ],
  },

  // White days content
  'white-days': {
    titleSv: 'De vita dagarna',
    titleAr: 'الأيام البيض',
    contentSources: [
      { type: 'subcategory', value: 'fasta/frivillig-fasta' },
      { type: 'keyword', value: 'fullmane' },
      { type: 'keyword', value: 'vita dagar' },
    ],
  },

  // Friday content
  friday: {
    titleSv: 'Fredagen',
    titleAr: 'الجمعة',
    contentSources: [{ type: 'subcategory', value: 'bon/fredagsbonen' }],
  },

  // Monday fasting content
  'monday-fasting': {
    titleSv: 'Måndagsfasta',
    titleAr: 'صيام الإثنين',
    contentSources: [{ type: 'subcategory', value: 'fasta/frivillig-fasta' }],
  },

  // Thursday fasting content
  'thursday-fasting': {
    titleSv: 'Torsdagsfasta',
    titleAr: 'صيام الخميس',
    contentSources: [{ type: 'subcategory', value: 'fasta/frivillig-fasta' }],
  },

  // Deep reads - long-form spiritual content (800+ words)
  'deep-reads': {
    titleSv: 'Djupdykningar',
    titleAr: 'قراءات عميقة',
    minWordCount: 800,
    contentSources: [
      { type: 'subcategory', value: 'troslara/tawhid' },
      { type: 'subcategory', value: 'troslara/forstaelse-av-islam' },
      { type: 'subcategory', value: 'troslara/sekter-rorelser-och-den-ratta-vagen-ahlus-sunnah' },
      { type: 'subcategory', value: 'troslara/sandebuden' },
      { type: 'subcategory', value: 'troslara/blandade-utlatanden' },
      { type: 'subcategory', value: 'blandat/anger' },
      { type: 'subcategory', value: 'blandat/aminnelse' },
    ],
  },

  // Common questions - beginner-friendly, welcoming content
  'important-questions': {
    titleSv: 'Vanliga frågor',
    titleAr: 'أسئلة شائعة',
    contentSources: [
      { type: 'subcategory', value: 'blandat/utveckling' },
      { type: 'subcategory', value: 'blandat/akallan' },
      { type: 'subcategory', value: 'bon/blandade-utlatanden' },
      { type: 'subcategory', value: 'bon/glomska-och-dalig-koncentration' },
      { type: 'subcategory', value: 'blandat/anger' },
    ],
  },
}

/**
 * Get content config for an occasion type
 */
export function getOccasionContentConfig(
  type: OccasionType | 'deep-reads' | 'important-questions'
): OccasionContentConfig | undefined {
  return OCCASION_CONTENT_CONFIG[type]
}
