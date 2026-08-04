export type QuranWordCharType =
  | 'word'
  | 'end'
  | 'pause'
  | 'sajdah'
  | 'rub-el-hizb'

export type QuranWord = {
  wordId: number
  position: number
  pageNumber: number
  v2Page: number
  lineNumber: number
  charTypeName: QuranWordCharType
  codeV2: string
  accessibleText: string
  verseKey: string
  verseNumber: number
  chapterId: number
}

export type QuranLine = {
  lineNumber: number
  words: QuranWord[]
}

export type QuranVerse = {
  chapterId: number
  chapterNameArabic: string | null
  verseKey: string
  verseNumber: number
  accessibleText: string
}

export type QuranPageHeading = {
  chapterId: number
  chapterNameArabic: string
  titleLineNumber: number
  bismillahLineNumber: number | null
  beforeLineNumber: number
  bismillahText: string | null
}

export type QuranPage = {
  schemaVersion: 1
  mushafId: 1
  pageNumber: number
  v2Page: number
  lines: QuranLine[]
  verses: QuranVerse[]
  headings: QuranPageHeading[]
}

export type QuranChapter = {
  id: number
  nameArabic: string
  bismillahPre: boolean
}
